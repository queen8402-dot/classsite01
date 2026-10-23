"use client";

import { useActionState } from "react";

import { saveHeroText, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { HeroText } from "@/lib/types";

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";
const textareaClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50";

/** 히어로(첫 화면) 글자 수정 칸. 비워 두고 저장하면 site.config.ts 의 기본 글자가 보입니다. */
export function HeroForm({ text }: { text: HeroText }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveHeroText, {});

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">작은 윗줄</span>
        <input name="eyebrow" defaultValue={text.eyebrow} className={inputClass} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">큰 제목 * (Enter 로 줄바꿈)</span>
        <textarea name="title" required rows={3} defaultValue={text.title} className={textareaClass} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">설명 문장</span>
        <textarea name="description" rows={3} defaultValue={text.description} className={textareaClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">첫 번째 버튼 글자</span>
          <input name="primaryLabel" defaultValue={text.primaryLabel} className={inputClass} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">두 번째 버튼 글자</span>
          <input name="secondaryLabel" defaultValue={text.secondaryLabel} className={inputClass} />
        </label>
      </div>

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
