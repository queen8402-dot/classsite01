"use client";

import { useActionState } from "react";

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

/** 데일리 학습 첫 화면 글자 수정 칸. 칸을 비워 두고 저장하면 site.config.ts 의 기본 글자가 보입니다. */
export function DailyForm({ text }: { text: DailyText }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveDailyText, {});

  return (
    <form action={action} className="grid gap-8">
      {/* 학생 정보 (왼쪽 메뉴 위) */}
      <fieldset className="grid gap-4">
        <legend className="mb-3 text-base font-semibold">학생 정보 (왼쪽 메뉴 위)</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="이름" name="studentName" defaultValue={text.studentName} />
          <Field label="학년" name="studentGrade" defaultValue={text.studentGrade} />
          <Field label="캐릭터 이모지" name="studentAvatar" defaultValue={text.studentAvatar} />
        </div>
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
