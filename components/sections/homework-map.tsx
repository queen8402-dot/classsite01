"use client";

import Image from "next/image";
import { Check, ExternalLink } from "lucide-react";

import { siteConfig } from "@/site.config";
import type { DailyText, Item } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GameAvatar } from "@/components/sections/game-avatar";
import { setHomeworkDone, useHomeworkDoneIds } from "@/components/sections/homework-cards";

/* 오늘의 숙제 = 모험 지도
   - 위: 스테이지 길 (1 → 2 → … → 🏆). 내 캐릭터가 다음에 할 스테이지 위에서 콩콩
   - 아래: 스테이지 카드. 누르면 숙제 페이지, '다 했어요' 누르면 CLEAR! 도장 + 코인
   - 카드 목록: 관리자 페이지(/admin → 오늘의 숙제) */

const tileColors = ["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4"];
const fallbackEmojis = ["✏️", "📘", "🎧", "📚"];
const NODE = "2.75rem"; // 길 위 동그라미 크기 (size-11)

type Student = Pick<DailyText, "studentName" | "studentAvatar" | "studentPhotoUrl">;

export function HomeworkMap({ items, student }: { items: Item[]; student: Student }) {
  const { doneButton, undoButton, empty } = siteConfig.daily;
  const { mapTitle, stage, clear } = siteConfig.daily.game;
  const doneIds = useHomeworkDoneIds();

  if (items.length === 0) {
    return (
      <p className="rounded-3xl bg-card p-8 text-center text-lg font-semibold text-muted-foreground">{empty}</p>
    );
  }

  const doneCount = items.filter((item) => doneIds.includes(item.id)).length;
  const firstTodo = items.findIndex((item) => !doneIds.includes(item.id));
  const position = firstTodo === -1 ? items.length : firstTodo; // 마지막(items.length) = 보물상자
  const fraction = position / items.length;
  const finished = firstTodo === -1;

  return (
    <section aria-labelledby="map-title" className="grid gap-6">
      {/* 모험 길 */}
      <div className="rounded-3xl bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="map-title" className="text-xl font-bold">
            🗺️ {mapTitle}
          </h2>
          <p className="rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">
            {stage} {doneCount}/{items.length} {clear}
          </p>
        </div>

        <div className="relative mt-14 h-11">
          {/* 길 (회색) + 지나온 길 (분홍) */}
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted"
            style={{ left: `calc(${NODE} / 2)`, right: `calc(${NODE} / 2)` }}
          />
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary transition-[width] duration-700"
            style={{ left: `calc(${NODE} / 2)`, width: `calc(${fraction} * (100% - ${NODE}))` }}
          />

          {/* 스테이지 동그라미 */}
          <ol className="relative flex h-full items-center justify-between">
            {items.map((item, i) => {
              const done = doneIds.includes(item.id);
              const current = i === position;
              return (
                <li
                  key={item.id}
                  aria-label={`${stage} ${i + 1}${done ? ` ${clear}` : ""}`}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full text-base font-extrabold transition-colors",
                    done
                      ? "bg-success text-success-foreground"
                      : current
                        ? "bg-primary text-primary-foreground ring-4 ring-secondary"
                        : "border-2 bg-card text-muted-foreground",
                  )}
                >
                  {done ? "⭐" : i + 1}
                </li>
              );
            })}
            <li
              aria-label="보물상자"
              className={cn(
                "flex size-11 items-center justify-center rounded-full text-2xl",
                finished ? "bg-gold ring-4 ring-accent" : "bg-accent",
              )}
            >
              {finished ? "🏆" : "🎁"}
            </li>
          </ol>

          {/* 내 캐릭터 (다음 스테이지 위) */}
          <div
            className="hop absolute -top-12 transition-[left] duration-700"
            style={{ left: `calc(${fraction} * (100% - ${NODE}) + ${NODE} / 2)` }}
          >
            <GameAvatar
              photoUrl={student.studentPhotoUrl}
              emoji={student.studentAvatar}
              name={student.studentName}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 스테이지 카드 */}
      <ul className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {items.map((item, i) => {
          const done = doneIds.includes(item.id);
          const current = i === position;

          const face = (
            <>
              <div className="relative aspect-[4/3] bg-muted">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 480px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl" aria-hidden>
                    {fallbackEmojis[i % fallbackEmojis.length]}
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-extrabold tracking-wide text-primary-foreground">
                  {stage} {i + 1}
                </span>
                {done ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/70">
                    <span className="stamp-in rounded-2xl border-4 border-success px-4 py-1 text-3xl font-extrabold tracking-wider text-success">
                      {clear}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className={cn("flex flex-1 flex-col gap-1 p-4 text-tile-foreground", tileColors[i % tileColors.length])}>
                <h3 className="flex items-start justify-between gap-2 text-lg font-bold leading-snug">
                  {item.title}
                  {item.link_url ? <ExternalLink className="mt-1 size-4 shrink-0 opacity-80" /> : null}
                </h3>
                {item.description ? <p className="text-sm opacity-90">{item.description}</p> : null}
              </div>
            </>
          );

          return (
            <li
              key={item.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border transition-transform hover:-translate-y-1 hover:shadow-lg",
                current && "ring-4 ring-primary",
              )}
            >
              {item.link_url ? (
                <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="flex flex-1 flex-col">
                  {face}
                </a>
              ) : (
                <div className="flex flex-1 flex-col">{face}</div>
              )}
              <div className="p-3">
                <button
                  type="button"
                  onClick={() => setHomeworkDone(item.id, !done)}
                  aria-pressed={done}
                  className={cn(
                    "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition-colors",
                    done
                      ? "bg-success text-success-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  {done ? (
                    <>
                      <Check className="size-5" strokeWidth={3} />
                      {undoButton}
                    </>
                  ) : (
                    <>
                      {doneButton} <span className="text-sm opacity-80">🪙 +{siteConfig.daily.game.coins.homework}</span>
                    </>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
