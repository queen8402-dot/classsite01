import { sampleItems, siteConfig } from "@/site.config";
import { getPublicClient } from "@/lib/supabase";
import type { DailyText, HeroText, Item, SubjectCard } from "@/lib/types";
import { cleanWeeklyPlan, emptyWeeklyPlan, type WeeklyPlan } from "@/lib/week";

/**
 * 요일별 숙제(월~금)를 가져옵니다. 관리자 페이지(/admin → 요일별 숙제)에서 저장한 값.
 * 저장된 게 없거나 Supabase가 연결 안 됐으면 모든 요일이 비어 있음
 */
export async function getWeeklyPlan(): Promise<WeeklyPlan> {
  const supabase = getPublicClient();
  if (!supabase) return emptyWeeklyPlan();

  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", "weekly")
    .maybeSingle();

  if (error) {
    console.error("[getWeeklyPlan] Supabase 읽기 실패:", error.message);
    return emptyWeeklyPlan();
  }
  return cleanWeeklyPlan(data?.data);
}

/** site.config.ts 에 적힌 데일리 학습 첫 화면 글자 (기본값) */
export const defaultDailyText: DailyText = {
  studentName: siteConfig.daily.student.name,
  studentGrade: siteConfig.daily.student.grade,
  studentAvatar: siteConfig.daily.student.avatar,
  studentPhotoUrl: "",
  subjectsTitle: siteConfig.daily.subjectsTitle,
  subjects: siteConfig.daily.subjects.map((s) => ({ ...s })),
  titleBefore: siteConfig.daily.title.before,
  titleHighlight: siteConfig.daily.title.highlight,
  titleAfter: siteConfig.daily.title.after,
};

const filled = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/**
 * 데일리 학습 첫 화면 글자를 가져옵니다.
 * - 관리자 페이지(첫 화면 꾸미기)에서 저장한 글자가 있으면 그것을,
 *   없거나 비어 있으면 site.config.ts 의 글자를 씀
 * - 과목 링크(href)는 비워서 저장하면 '링크 없음'으로 봄
 */
export async function getDailyText(): Promise<DailyText> {
  const supabase = getPublicClient();
  if (!supabase) return defaultDailyText;

  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", "daily")
    .maybeSingle();

  if (error) {
    console.error("[getDailyText] Supabase 읽기 실패:", error.message);
    return defaultDailyText;
  }

  const saved = (data?.data ?? {}) as Partial<Record<keyof DailyText, unknown>>;
  const pick = (k: Exclude<keyof DailyText, "subjects" | "studentPhotoUrl">) =>
    filled(saved[k]) ? saved[k] : defaultDailyText[k];
  const savedSubjects = Array.isArray(saved.subjects)
    ? (saved.subjects as Partial<Record<keyof SubjectCard, unknown>>[])
    : [];

  return {
    studentName: pick("studentName"),
    studentGrade: pick("studentGrade"),
    studentAvatar: pick("studentAvatar"),
    studentPhotoUrl: typeof saved.studentPhotoUrl === "string" ? saved.studentPhotoUrl : "",
    subjectsTitle: pick("subjectsTitle"),
    subjects: defaultDailyText.subjects.map((base, i) => {
      const s = savedSubjects[i] ?? {};
      return {
        label: filled(s.label) ? s.label : base.label,
        caption: filled(s.caption) ? s.caption : base.caption,
        emoji: filled(s.emoji) ? s.emoji : base.emoji,
        href: typeof s.href === "string" ? s.href : base.href,
      };
    }),
    titleBefore: pick("titleBefore"),
    titleHighlight: pick("titleHighlight"),
    titleAfter: pick("titleAfter"),
  };
}

/** site.config.ts 에 적힌 히어로 글자 (기본값) */
export const defaultHeroText: HeroText = {
  eyebrow: siteConfig.hero.eyebrow,
  title: siteConfig.hero.title,
  description: siteConfig.hero.description,
  primaryLabel: siteConfig.hero.primaryCta.label,
  secondaryLabel: siteConfig.hero.secondaryCta.label,
};

/**
 * 히어로 글자를 가져옵니다.
 * - 관리자 페이지에서 저장한 글자가 있으면 그것을, 없거나 비어 있으면 site.config.ts 의 글자를 씀
 */
export async function getHeroText(): Promise<HeroText> {
  const supabase = getPublicClient();
  if (!supabase) return defaultHeroText;

  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", "hero")
    .maybeSingle();

  if (error) {
    console.error("[getHeroText] Supabase 읽기 실패:", error.message);
    return defaultHeroText;
  }

  const saved = (data?.data ?? {}) as Partial<HeroText>;
  const pick = (k: keyof HeroText) =>
    typeof saved[k] === "string" && saved[k].trim() ? saved[k] : defaultHeroText[k];

  return {
    eyebrow: pick("eyebrow"),
    title: pick("title"),
    description: pick("description"),
    primaryLabel: pick("primaryLabel"),
    secondaryLabel: pick("secondaryLabel"),
  };
}

/**
 * 특정 섹션의 카드 목록을 가져옵니다.
 * - Supabase가 연결 안 됐으면: site.config.ts 의 예시 카드를 보여줌
 * - 연결됐으면: 데이터베이스에서 '보이기'로 설정된 카드만 순서대로 가져옴
 */
export async function getItems(section: string): Promise<Item[]> {
  const supabase = getPublicClient();
  const samples = sampleItems.filter((item) => item.section === section);
  if (!supabase) return samples;

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("section", section)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getItems] Supabase 읽기 실패:", error.message);
    return samples;
  }
  return (data ?? []) as Item[];
}
