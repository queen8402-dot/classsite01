"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";

import { siteConfig } from "@/site.config";
import { cn } from "@/lib/utils";
import { award } from "@/lib/game";
import type { SubjectCard } from "@/lib/types";
import { VideoDialog, getYouTubeId } from "@/components/sections/video-dialog";

/* 맨 위 과목 카드 (국어·수학·영어·과학).
   - 글자·이모지·주소: 관리자 페이지(첫 화면 꾸미기), 기본값은 site.config.ts 의 daily.subjects
   - 주소(href)가 비어 있으면 눌러도 아무 일 없음
   - 유튜브 주소면 사이트 안에서 영상 창이 열리고, 끝까지 보면 카드에 ✔ 도장 (다음 날 초기화)
   - 다른 주소는 새 탭으로 열림
   - 색: app/globals.css 의 --subject-1 ~ --subject-4 */

const bandColors = ["bg-subject-1", "bg-subject-2", "bg-subject-3", "bg-subject-4"];

/* ---------- '영상 다 봤어요' 기록 (이 기기의 브라우저에 저장, 날짜별) ---------- */

const listeners = new Set<() => void>();
let memoryCopy = "[]"; // 브라우저 저장 공간을 못 쓸 때(비공개 창 등) 대신 쓰는 값

function todayKey() {
  const d = new Date();
  return `subject-done:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readDone() {
  try {
    return window.localStorage.getItem(todayKey()) ?? "[]";
  } catch {
    return memoryCopy;
  }
}

function addDone(key: string) {
  let ids: string[] = [];
  try {
    const value = JSON.parse(readDone());
    if (Array.isArray(value)) ids = value.filter((v) => typeof v === "string");
  } catch {
    // 기록이 깨져 있으면 새로 시작
  }
  if (ids.includes(key)) return;
  const next = JSON.stringify([...ids, key]);
  memoryCopy = next;
  try {
    window.localStorage.setItem(todayKey(), next);
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

/* 과목마다 기록 이름: 과목 이름 + 영상 번호 (영상을 바꾸면 도장도 새로) */
const doneKey = (subject: SubjectCard, videoId: string) => `${subject.label}:${videoId}`;

/** 영상을 끝까지 봤을 때: 도장 기록 + 코인 (지도 화면에서도 씀) */
export function markVideoWatched(subject: SubjectCard, videoId: string) {
  const key = doneKey(subject, videoId);
  addDone(key);
  const { coins, videoReward } = siteConfig.daily.game;
  award(`video:${key}`, coins.video, `${subject.label} ${videoReward}`);
}

/** 오늘 영상 도장 기록 (다른 화면 조각에서도 씀) */
export function useSubjectDoneRaw(): string {
  return useSyncExternalStore(subscribe, readDone, () => "[]");
}

/** 영상이 있는 과목이고, 오늘 아직 도장을 못 받았는지 */
export function isSubjectTodo(subject: SubjectCard, raw: string): boolean {
  const videoId = subject.href ? getYouTubeId(subject.href) : null;
  return videoId !== null && !raw.includes(JSON.stringify(doneKey(subject, videoId)));
}

/* ---------- 화면 ---------- */

export function SubjectCards({
  subjectsTitle,
  subjects,
}: {
  subjectsTitle: string;
  subjects: SubjectCard[];
}) {
  const raw = useSubjectDoneRaw();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const close = useCallback(() => setOpenIndex(null), []);

  const openSubject = openIndex === null ? null : subjects[openIndex];
  const openVideoId = openSubject ? getYouTubeId(openSubject.href) : null;

  return (
    <section aria-labelledby="subjects-title">
      <h2 id="subjects-title" className="mb-4 text-xl font-bold">
        {subjectsTitle}
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
        {subjects.map((subject, i) => {
          const videoId = subject.href ? getYouTubeId(subject.href) : null;
          const done = videoId ? raw.includes(JSON.stringify(doneKey(subject, videoId))) : false;

          const face = (
            <>
              <div className="relative flex aspect-[4/3] items-center justify-center">
                <span className="absolute left-4 top-3 text-xs font-semibold text-muted-foreground sm:text-sm">
                  {subject.caption}
                </span>
                <span className="text-5xl transition-transform group-hover:scale-110 sm:text-6xl" aria-hidden>
                  {subject.emoji}
                </span>
                {done ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/75">
                    <span className="flex size-16 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg sm:size-20">
                      <Check className="size-10 sm:size-12" strokeWidth={3} />
                    </span>
                    <span className="text-sm font-bold text-success">{siteConfig.daily.video.stamp}</span>
                  </div>
                ) : null}
              </div>
              <div
                className={cn(
                  "px-4 py-4 text-lg font-bold text-subject-foreground sm:py-5 sm:text-xl",
                  bandColors[i % bandColors.length],
                )}
              >
                {subject.label}
              </div>
            </>
          );
          const cardClass =
            "group flex w-full flex-col overflow-hidden rounded-3xl bg-card text-left shadow-sm ring-1 ring-border transition-transform hover:-translate-y-1 hover:shadow-lg";

          return (
            <li key={i}>
              {videoId ? (
                <button type="button" className={cardClass} onClick={() => setOpenIndex(i)}>
                  {face}
                </button>
              ) : subject.href ? (
                <a href={subject.href} target="_blank" rel="noopener noreferrer" className={cardClass}>
                  {face}
                </a>
              ) : (
                <button type="button" className={cardClass}>
                  {face}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {openSubject && openVideoId ? (
        <VideoDialog
          title={openSubject.label}
          videoId={openVideoId}
          alreadyDone={raw.includes(JSON.stringify(doneKey(openSubject, openVideoId)))}
          onComplete={() => markVideoWatched(openSubject, openVideoId)}
          onClose={close}
        />
      ) : null}
    </section>
  );
}
