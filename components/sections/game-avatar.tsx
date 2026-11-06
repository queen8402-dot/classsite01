"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { findItem, useGameState } from "@/lib/game";

/* 꾸민 캐릭터 그림 (프로필 · 모험 지도 · 상점에서 함께 씀)
   - 바탕: 관리자가 올린 사진, 없으면 캐릭터 이모지
   - 그 위에 상점에서 산 모자 · 소품 · 배경 · 테두리를 입힘 */

/* 배경·테두리 아이템 → 모양 (색은 app/globals.css) */
export const itemLooks: Record<string, string> = {
  "bg-sky": "bg-avatar-sky",
  "bg-mint": "bg-avatar-mint",
  "bg-purple": "bg-avatar-purple",
  "bg-rainbow": "avatar-rainbow",
  "frame-gold": "avatar-frame-gold",
  "frame-sparkle": "avatar-frame-sparkle",
};

const sizes = {
  sm: { box: "size-9", face: "text-xl", hat: "-top-3 text-base", acc: "-bottom-1 -right-1.5 text-sm", px: "36px" },
  md: { box: "size-14", face: "text-3xl", hat: "-top-4 text-2xl", acc: "-bottom-1 -right-2 text-lg", px: "56px" },
  lg: { box: "size-28", face: "text-6xl", hat: "-top-9 text-5xl", acc: "-bottom-1 -right-3 text-3xl", px: "112px" },
};

export function GameAvatar({
  photoUrl,
  emoji,
  name,
  size = "md",
  equipped: equippedOverride,
}: {
  photoUrl: string;
  emoji: string;
  name: string;
  size?: keyof typeof sizes;
  /** 상점 미리보기처럼 입은 것을 직접 정할 때 */
  equipped?: Record<string, string>;
}) {
  const game = useGameState();
  const equipped = equippedOverride ?? game.equipped;
  const s = sizes[size];

  const bg = equipped.bg ? itemLooks[equipped.bg] : "bg-accent";
  const frame = equipped.frame ? itemLooks[equipped.frame] : "";
  const hat = findItem(equipped.hat)?.emoji;
  const acc = findItem(equipped.acc)?.emoji;

  return (
    <div className={cn("relative isolate shrink-0 rounded-full", s.box, frame)}>
      <div
        className={cn(
          "relative flex size-full items-center justify-center overflow-hidden rounded-full",
          bg,
          s.face,
        )}
      >
        {photoUrl ? (
          <Image src={photoUrl} alt={`${name} 프로필`} fill sizes={s.px} className="object-cover" />
        ) : (
          <span aria-hidden>{emoji}</span>
        )}
      </div>
      {hat ? (
        <span className={cn("pointer-events-none absolute left-1/2 -translate-x-1/2 drop-shadow-sm", s.hat)} aria-hidden>
          {hat}
        </span>
      ) : null}
      {acc ? (
        <span className={cn("pointer-events-none absolute drop-shadow-sm", s.acc)} aria-hidden>
          {acc}
        </span>
      ) : null}
    </div>
  );
}
