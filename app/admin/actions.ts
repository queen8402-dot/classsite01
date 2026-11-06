"use server";

/* 관리자 페이지의 버튼들이 실제로 하는 일 (서버에서 실행됨)
   - login / logout      : 로그인, 로그아웃
   - saveItem            : 카드 추가 또는 수정 (이미지 업로드 포함)
   - saveHeroText        : (예전 화면용) 히어로 글자 저장
   - saveDailyText       : 데일리 학습 첫 화면 글자·과목 링크·프로필 사진 저장
   - saveWeeklyDay       : 요일별 숙제(월~금 중 하루) 저장
   - deleteItem          : 카드 삭제 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { siteConfig } from "@/site.config";
import { checkPassword, endAdminSession, isAdmin, startAdminSession } from "@/lib/admin-auth";
import { getAdminClient, IMAGE_BUCKET } from "@/lib/supabase-admin";
import type { DailyText, HeroText, SubjectCard } from "@/lib/types";
import { cleanWeeklyPlan, DAY_LABELS, WEEK_DAYS, type WeekDay } from "@/lib/week";

export type ActionState = { ok?: boolean; message?: string };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/* ---------- 로그인 / 로그아웃 ---------- */

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    return { message: "비밀번호가 올바르지 않습니다." };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin");
}

/* ---------- 카드 저장 (추가 / 수정) ---------- */

export async function saveItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요." };

  const id = String(formData.get("id") ?? "");
  const section = String(formData.get("section") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const linkUrl = String(formData.get("link_url") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0) || 0;
  const isVisible = formData.get("is_visible") === "on";
  const removeImage = formData.get("remove_image") === "on";
  const image = formData.get("image");

  if (!siteConfig.adminSections.some((s) => s.key === section)) {
    return { message: "알 수 없는 섹션입니다." };
  }
  if (!title) return { message: "제목을 입력하세요." };

  const row: Record<string, unknown> = {
    section,
    title,
    description: description || null,
    link_url: linkUrl || null,
    sort_order: sortOrder,
    is_visible: isVisible,
  };

  // 새 이미지를 올린 경우 → Supabase 저장소에 업로드
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) return { message: "이미지 파일만 올릴 수 있습니다." };
    if (image.size > MAX_IMAGE_BYTES) return { message: "이미지는 5MB 이하만 올릴 수 있습니다." };

    const ext = (image.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${section}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, image, { contentType: image.type, upsert: false });
    if (uploadError) return { message: `이미지 업로드 실패: ${uploadError.message}` };

    row.image_url = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  } else if (removeImage) {
    row.image_url = null;
  }

  const { error } = id
    ? await supabase.from("items").update(row).eq("id", id)
    : await supabase.from("items").insert(row);

  if (error) return { message: `저장 실패: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: id ? "수정했습니다." : "추가했습니다." };
}

/* ---------- 히어로 글자 저장 ---------- */

export async function saveHeroText(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요." };

  const read = (name: string) => String(formData.get(name) ?? "").replace(/\r\n/g, "\n").trim();
  const data: HeroText = {
    eyebrow: read("eyebrow"),
    title: read("title"),
    description: read("description"),
    primaryLabel: read("primaryLabel"),
    secondaryLabel: read("secondaryLabel"),
  };
  if (!data.title) return { message: "큰 제목을 입력하세요." };

  const { error } = await supabase
    .from("site_content")
    .upsert({ key: "hero", data, updated_at: new Date().toISOString() });

  if (error) {
    return {
      message: `저장 실패: ${error.message} (supabase/schema.sql 을 SQL Editor 에서 다시 실행했는지 확인하세요)`,
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "저장했습니다. 사이트 첫 화면에 반영됐어요." };
}

/* ---------- 첫 화면(데일리 학습) 글자 저장 ---------- */

export async function saveDailyText(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요." };

  const read = (name: string) => String(formData.get(name) ?? "").trim();
  const subjects: SubjectCard[] = siteConfig.daily.subjects.map((_, i) => ({
    label: read(`subject-${i}-label`),
    caption: read(`subject-${i}-caption`),
    emoji: read(`subject-${i}-emoji`),
    href: read(`subject-${i}-href`),
  }));

  // 링크는 http:// 또는 https:// 로 시작하는 주소만 허용 (이상한 코드가 들어가지 않게)
  const badLink = subjects.find((s) => s.href && !/^https?:\/\//i.test(s.href));
  if (badLink) {
    return { message: `${badLink.label || "과목"} 링크는 https:// 로 시작하는 주소로 넣어 주세요.` };
  }

  // 지금 저장된 프로필 사진 주소 (새 사진을 안 올리면 그대로 유지)
  const { data: current } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", "daily")
    .maybeSingle();
  const oldPhoto = typeof current?.data?.studentPhotoUrl === "string" ? current.data.studentPhotoUrl : "";
  let studentPhotoUrl = oldPhoto;

  const photo = formData.get("studentPhoto");
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return { message: "프로필에는 이미지 파일만 올릴 수 있습니다." };
    if (photo.size > MAX_IMAGE_BYTES) return { message: "프로필 사진은 5MB 이하만 올릴 수 있습니다." };

    const ext = (photo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `profile/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, photo, { contentType: photo.type, upsert: false });
    if (uploadError) return { message: `사진 업로드 실패: ${uploadError.message}` };

    studentPhotoUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  } else if (formData.get("removePhoto") === "on") {
    studentPhotoUrl = "";
  }

  const data: DailyText = {
    studentName: read("studentName"),
    studentGrade: read("studentGrade"),
    studentAvatar: read("studentAvatar"),
    studentPhotoUrl,
    subjectsTitle: read("subjectsTitle"),
    subjects,
    titleBefore: read("titleBefore"),
    titleHighlight: read("titleHighlight"),
    titleAfter: read("titleAfter"),
  };

  const { error } = await supabase
    .from("site_content")
    .upsert({ key: "daily", data, updated_at: new Date().toISOString() });

  if (error) {
    return {
      message: `저장 실패: ${error.message} (supabase/schema.sql 을 SQL Editor 에서 실행했는지 확인하세요)`,
    };
  }

  // 사진을 바꾸거나 지웠으면 예전 사진 파일은 저장소에서 정리
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  if (oldPhoto && oldPhoto !== studentPhotoUrl && oldPhoto.includes(marker)) {
    await supabase.storage.from(IMAGE_BUCKET).remove([oldPhoto.split(marker)[1]]);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "저장했습니다. 사이트 첫 화면에 반영됐어요." };
}

/* ---------- 요일별 숙제 저장 (하루씩) ---------- */

const MAX_TASKS_PER_DAY = 20;

export async function saveWeeklyDay(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요." };

  const day = String(formData.get("day") ?? "") as WeekDay;
  if (!WEEK_DAYS.includes(day)) return { message: "알 수 없는 요일입니다." };

  let rows: unknown;
  try {
    rows = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { message: "입력 내용을 읽지 못했습니다. 새로고침 후 다시 해 주세요." };
  }

  const tasks = cleanWeeklyPlan({ [day]: rows })[day].map((t) => ({
    id: t.id.slice(0, 40),
    subject: t.subject.trim().slice(0, 30),
    task: t.task.trim().slice(0, 80),
    link: t.link.trim().slice(0, 500),
  }));
  if (tasks.length > MAX_TASKS_PER_DAY) {
    return { message: `하루에 숙제는 ${MAX_TASKS_PER_DAY}개까지 넣을 수 있어요.` };
  }
  const missing = tasks.findIndex((t) => !t.subject);
  if (missing >= 0) return { message: `${missing + 1}번 줄의 과목명을 적어 주세요.` };
  // 링크는 http:// 또는 https:// 로 시작하는 주소만 (이상한 코드가 들어가지 않게)
  const badLink = tasks.findIndex((t) => t.link && !/^https?:\/\//i.test(t.link));
  if (badLink >= 0) return { message: `${badLink + 1}번 줄 링크는 https:// 로 시작하는 주소로 넣어 주세요.` };

  // 다른 요일은 그대로 두고 이 요일만 바꿈
  const { data: current } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", "weekly")
    .maybeSingle();
  const plan = { ...cleanWeeklyPlan(current?.data), [day]: tasks };

  const { error } = await supabase
    .from("site_content")
    .upsert({ key: "weekly", data: plan, updated_at: new Date().toISOString() });

  if (error) {
    return {
      message: `저장 실패: ${error.message} (supabase/schema.sql 을 SQL Editor 에서 실행했는지 확인하세요)`,
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: `${DAY_LABELS[day]} 숙제 ${tasks.length}개를 저장했어요.` };
}

/* ---------- 카드 삭제 ---------- */

export async function deleteItem(formData: FormData) {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "");
  if (!id) return;

  await supabase.from("items").delete().eq("id", id);

  // 연결된 이미지 파일도 저장소에서 정리
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  if (imageUrl.includes(marker)) {
    await supabase.storage.from(IMAGE_BUCKET).remove([imageUrl.split(marker)[1]]);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}
