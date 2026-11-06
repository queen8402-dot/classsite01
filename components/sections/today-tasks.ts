"use client";

import { useSyncExternalStore } from "react";

import { siteConfig } from "@/site.config";
import { weekDayOf, type WeekDay, type WeeklyPlan } from "@/lib/week";
import { setHomeworkDone, useHomeworkDoneIds } from "@/components/sections/homework-cards";
import { getYouTubeId } from "@/components/sections/video-dialog";

/* 오늘의 할일 목록 = 관리자가 '요일별 숙제'에 넣은 오늘 요일의 숙제
   - 할일 판, 섬 모험 지도, 맨 위 '할일 N개'가 같은 목록을 씀
   - 유튜브 링크 → 영상 숙제(끝까지 봐야 클리어), 다른 링크 → 새 탭, 링크 없음 → '다 했어요'만 */

export type TodayTask = {
  key: string;
  /** '다 했어요' 기록에 쓰는 이름 (요일:번호) */
  doneId: string;
  kind: "homework" | "video";
  subject: string;
  title: string;
  description: string;
  emoji: string;
  link: string | null;
  videoId: string | null;
  reward: number;
  done: boolean;
};

/* ---------- 오늘 요일 (기기 날짜 기준, 1분마다 확인) ---------- */

function subscribeMinute(onChange: () => void) {
  const timer = window.setInterval(onChange, 60 * 1000);
  return () => window.clearInterval(timer);
}

/** 오늘 요일. 토·일요일이면 "weekend", 서버에서 그릴 때는 null */
export function useWeekDay(): WeekDay | "weekend" | null {
  return useSyncExternalStore(subscribeMinute, () => weekDayOf(new Date()) ?? "weekend", () => null);
}

/* ---------- 과목명 → 그림 ---------- */

function subjectEmoji(subject: string, isVideo: boolean) {
  const known = siteConfig.daily.subjects.find((s) => subject.includes(s.label));
  if (known) return known.emoji;
  return isVideo ? "🎬" : "✏️";
}

/* ---------- 목록 ---------- */

export function useTodayTasks(plan: WeeklyPlan): { day: WeekDay | "weekend" | null; tasks: TodayTask[] } {
  const { coins } = siteConfig.daily.game;
  const day = useWeekDay();
  const doneIds = useHomeworkDoneIds();

  const rows = day && day !== "weekend" ? plan[day] : [];
  const tasks = rows.map((row): TodayTask => {
    const videoId = row.link ? getYouTubeId(row.link) : null;
    const doneId = `${day}:${row.id}`;
    return {
      key: doneId,
      doneId,
      kind: videoId ? "video" : "homework",
      subject: row.subject,
      title: [row.subject, row.task].filter(Boolean).join(" · "),
      description: videoId ? siteConfig.daily.video.hint : "",
      emoji: subjectEmoji(row.subject, !!videoId),
      link: row.link || null,
      videoId,
      reward: videoId ? coins.video : coins.homework,
      done: doneIds.includes(doneId),
    };
  });

  return { day, tasks };
}

/** 영상 숙제를 끝까지 봤을 때 */
export function completeVideoTask(task: TodayTask) {
  const { coins, videoReward } = siteConfig.daily.game;
  setHomeworkDone(task.doneId, true, { amount: coins.video, label: `${task.subject} ${videoReward}` });
}
