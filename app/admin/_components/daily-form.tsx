"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";

import { saveDailyText, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { DailyText } from "@/lib/types";

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

/* 고를 수 있는 캐릭터 (이모지) — 더 넣고 싶으면 여기에 추가 */
const characters = ["🐻", "🐰", "🐱", "🐶", "🦊", "🐼", "🐯", "🐧", "🐥", "🦄", "🐸", "🐨"];

/** 프로필: 캐릭터 고르기 + 사진 올리기 (사진이 있으면 사진이 먼저 보임) */
function ProfileFields({ text, result }: { text: DailyText; result: ActionState }) {
  const [avatar, setAvatar] = useState(text.studentAvatar);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0); // 바뀌면 파일 선택 칸이 비워짐

  // 저장에 성공할 때마다 미리보기와 '사진 지우기' 표시를 초기화
  const [lastResult, setLastResult] = useState(result);
  if (result !== lastResult) {
    setLastResult(result);
    if (result.ok) {
      setPreview(null);
      setRemovePhoto(false);
      setFileInputKey((k) => k + 1);
    }
  }

  // 미리보기용 임시 주소는 다 쓰면 정리
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const shownPhoto = preview ?? (removePhoto ? "" : text.studentPhotoUrl);
  const options = characters.includes(avatar) ? characters : [avatar, ...characters];

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[auto_1fr] sm:items-start">
      {/* 미리보기 */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-accent text-5xl">
          {shownPhoto ? (
            <Image src={shownPhoto} alt="프로필 미리보기" fill sizes="96px" className="object-cover" unoptimized={!!preview} />
          ) : (
            avatar
          )}
        </div>
        <span className="text-xs text-muted-foreground">미리보기</span>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1.5 text-sm">
          <span className="font-medium">캐릭터 고르기 (사진이 없을 때 보여요)</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="캐릭터">
            {options.map((c) => (
              <label
                key={c}
                className={
                  "flex size-11 cursor-pointer items-center justify-center rounded-full border text-2xl transition-colors " +
                  (avatar === c ? "border-primary bg-secondary ring-2 ring-primary" : "hover:bg-muted")
                }
              >
                <input
                  type="radio"
                  name="studentAvatar"
                  value={c}
                  checked={avatar === c}
                  onChange={() => setAvatar(c)}
                  className="sr-only"
                />
                {c}
              </label>
            ))}
          </div>
        </div>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">사진 올리기 (선택, 5MB 이하)</span>
          <input
            key={fileInputKey}
            name="studentPhoto"
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </label>

        {text.studentPhotoUrl ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="removePhoto"
              checked={removePhoto}
              onChange={(e) => setRemovePhoto(e.target.checked)}
            />
            지금 사진 지우고 캐릭터로 보이기
          </label>
        ) : null}
      </div>
    </div>
  );
}

/** 데일리 학습 첫 화면 글자 수정 칸. 칸을 비워 두고 저장하면 site.config.ts 의 기본 글자가 보입니다. */
export function DailyForm({ text }: { text: DailyText }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveDailyText, {});

  return (
    <form action={action} className="grid gap-8">
      {/* 학생 정보 (왼쪽 메뉴 위) */}
      <fieldset className="grid gap-4">
        <legend className="mb-3 text-base font-semibold">학생 정보 (왼쪽 메뉴 위)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="이름" name="studentName" defaultValue={text.studentName} />
          <Field label="학년" name="studentGrade" defaultValue={text.studentGrade} />
        </div>
        <ProfileFields text={text} result={state} />
      </fieldset>

      {/* 과목 카드 (맨 위) */}
      <fieldset className="grid gap-4">
        <legend className="mb-3 text-base font-semibold">과목 카드 (맨 위)</legend>
        <Field label="과목 카드 위 제목" name="subjectsTitle" defaultValue={text.subjectsTitle} />
        {text.subjects.map((subject, i) => (
          <div key={i} className="grid gap-4 rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">{i + 1}번 카드</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr_6rem]">
              <Field label="과목 이름" name={`subject-${i}-label`} defaultValue={subject.label} />
              <Field label="작은 설명" name={`subject-${i}-caption`} defaultValue={subject.caption} />
              <Field label="이모지" name={`subject-${i}-emoji`} defaultValue={subject.emoji} />
            </div>
            <Field
              label="누르면 열릴 주소 (비워 두면 눌러도 아무 일 없음)"
              name={`subject-${i}-href`}
              type="url"
              placeholder="https://"
              defaultValue={subject.href}
            />
          </div>
        ))}
      </fieldset>

      {/* 큰 제목 (맨 위) */}
      <fieldset className="grid gap-4">
        <legend className="mb-3 text-base font-semibold">큰 제목 (맨 위, 날짜 아래)</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="앞 글자" name="titleBefore" defaultValue={text.titleBefore} />
          <Field label="분홍 칸 글자 (뒤에 남은 개수가 붙어요)" name="titleHighlight" defaultValue={text.titleHighlight} />
          <Field label="뒤 글자" name="titleAfter" defaultValue={text.titleAfter} />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : "저장"}
        </Button>
        {state.message ? (
          <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
