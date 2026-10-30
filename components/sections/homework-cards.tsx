"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { Check, ExternalLink } from "lucide-react";

import { siteConfig } from "@/site.config";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

/* 숙제 카드 목록 + 오늘 진행 막대.
   - '다 했어요' 기록은 이 기기의 브라우저에만 저장되고, 날짜가 바뀌면 새로 시작 */

const tileColors = ["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4"];
const fallbackEmojis = ["✏️", "📘", "🎧", "📚"];

/* ---------- '다 했어요' 기록 저장소 (브라우저 저장 공간) ---------- */

const listeners = new Set<() => void>();
let memoryCopy = "[]"; // 브라우저 저장 공간을 못 쓸 때(비공개 창 등) 대신 쓰는 값

function todayKey() {
  const d = new Date();
  return `homework-done:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readDone() {
  try {
    return window.localStorage.getItem(todayKey()) ?? "[]";
  } catch {
    return memoryCopy;
  }
}

function writeDone(ids: string[]) {
  const value = JSON.stringify(ids);
  memoryCopy = value;
  try {
    window.localStorage.setItem(todayKey(), value);
  } catch {
    // 저장이 막힌 브라우저 → memoryCopy 로만 기억
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function parseIds(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** 오늘 '다 했어요' 누른 숙제 번호 목록 (다른 화면 조각에서도 씀) */
export function useHomeworkDoneIds(): string[] {
  return parseIds(useSyncExternalStore(subscribe, readDone, () => "[]"));
}

/* ---------- 화면 ---------- */

export function HomeworkCards({ items }: { items: Item[] }) {
  const { doneButton, undoButton, allDone, empty } = siteConfig.daily;
  const doneIds = useHomeworkDoneIds();
  const doneCount = items.filter((item) => doneIds.includes(item.id)).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const finished = items.length > 0 && doneCount === items.length;

  function toggle(id: string) {
    writeDone(doneIds.includes(id) ? doneIds.filter((d) => d !== id) : [...doneIds, id]);
  }

  if (items.length === 0) {
    return (
      <p className="rounded-3xl bg-card p-8 text-center text-lg font-semibold text-muted-foreground">
        {empty}
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      {/* 오늘 진행 막대 */}
      <div
        className={cn(
          "rounded-3xl p-5 transition-colors sm:p-6",
          finished ? "bg-success text-success-foreground" : "bg-card",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-lg font-bold">
            {finished ? (
              allDone
            ) : (
              <>
                오늘의 숙제 {items.length}개 중{" "}
                <span className="text-primary">{doneCount}개</span> 했어요!
              </>
            )}
          </p>
          <p className="text-2xl" aria-hidden>
            {"⭐".repeat(doneCount)}
            <span className="opacity-25">{"⭐".repeat(items.length - doneCount)}</span>
          </p>
        </div>
        <div
          className={cn("mt-3 h-4 overflow-hidden rounded-full", finished ? "bg-success-foreground/30" : "bg-muted")}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={doneCount}
          aria-label="오늘 숙제 진행"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              finished ? "bg-success-foreground" : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 숙제 카드 */}
      <ul className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {items.map((item, i) => {
          const done = doneIds.includes(item.id);
          const tile = tileColors[i % tileColors.length];

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
                <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                  {i + 1}번
                </span>
                {done ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/70">
                    <span className="flex size-20 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg">
                      <Check className="size-12" strokeWidth={3} />
                    </span>
                  </div>
                ) : null}
              </div>
              <div className={cn("flex flex-1 flex-col gap-1 p-4 text-tile-foreground", tile)}>
                <h2 className="flex items-start justify-between gap-2 text-lg font-bold leading-snug">
                  {item.title}
                  {item.link_url ? <ExternalLink className="mt-1 size-4 shrink-0 opacity-80" /> : null}
                </h2>
                {item.description ? <p className="text-sm opacity-90">{item.description}</p> : null}
              </div>
            </>
          );

          return (
            <li
              key={item.id}
              className="flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border transition-transform hover:-translate-y-1 hover:shadow-lg"
            >
              {item.link_url ? (
                <a
                  href={item.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 flex-col"
                >
                  {face}
                </a>
              ) : (
                <div className="flex flex-1 flex-col">{face}</div>
              )}
              <div className="p-3">
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
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
                    doneButton
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
