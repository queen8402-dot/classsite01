"use client";

import { useEffect, useState } from "react";

import { siteConfig } from "@/site.config";
import { subscribeRewards, type RewardEvent } from "@/lib/game";
import { Button } from "@/components/ui/button";

/* 코인을 받을 때 화면 가운데에 나오는 축하 연출
   - 작은 보상: 색종이 + '🪙 +10' 이 튀어 오름
   - 하루 할일 전부 완료: 큰 축하 창 */

const confettiColors = [
  "bg-primary",
  "bg-gold",
  "bg-tile-1",
  "bg-subject-1",
  "bg-subject-3",
  "bg-tile-3",
];

function Burst({ event }: { event: RewardEvent }) {
  const pieces = event.big ? 36 : 22;
  return (
    <>
      {Array.from({ length: pieces }, (_, i) => {
        const angle = (i / pieces) * Math.PI * 2;
        const distance = 110 + ((i * 37) % 90) * (event.big ? 1.8 : 1);
        const style = {
          "--dx": `${Math.cos(angle) * distance}px`,
          "--dy": `${Math.sin(angle) * distance}px`,
          "--r": `${(i * 53) % 360}deg`,
        } as React.CSSProperties;
        return (
          <span key={i} className={`confetti-piece ${confettiColors[i % confettiColors.length]}`} style={style} />
        );
      })}
      <div className="coin-pop flex items-center gap-2 whitespace-nowrap rounded-full bg-card px-5 py-2.5 text-xl font-extrabold shadow-xl ring-2 ring-gold">
        <span aria-hidden>🪙</span>
        <span className="text-gold">+{event.amount}</span>
        <span className="text-base font-bold text-foreground">{event.label}</span>
      </div>
    </>
  );
}

export function RewardLayer() {
  const { ok, streakText } = siteConfig.daily.game;
  const [bursts, setBursts] = useState<RewardEvent[]>([]);
  const [big, setBig] = useState<RewardEvent | null>(null);

  useEffect(
    () =>
      subscribeRewards((event) => {
        setBursts((list) => [...list, event]);
        window.setTimeout(() => setBursts((list) => list.filter((b) => b.id !== event.id)), 1800);
        if (event.big) setBig(event);
      }),
    [],
  );

  return (
    <>
      {/* 색종이 + 코인 (화면을 가리지 않게 클릭은 통과) */}
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-live="polite">
        {bursts.map((event) => (
          <Burst key={event.id} event={event} />
        ))}
      </div>

      {/* 하루 완료 큰 축하 창 */}
      {big ? (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-foreground/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={big.label}
          onClick={(e) => e.target === e.currentTarget && setBig(null)}
        >
          <div className="pop-in w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-2xl">
            <div className="text-7xl" aria-hidden>
              🏆
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">{big.label}</h2>
            <p className="mt-3 text-3xl font-extrabold text-gold">🪙 +{big.amount}</p>
            {big.streak && big.streak > 1 ? (
              <p className="mt-2 text-lg font-bold text-primary">
                🔥 {big.streak}
                {streakText}
              </p>
            ) : null}
            <Button type="button" size="lg" className="mt-6 w-full text-base" onClick={() => setBig(null)}>
              {ok}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
