"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronRight, Clock } from "lucide-react";

import { siteConfig } from "@/site.config";
import type { DailyText, Item, SubjectCard } from "@/lib/types";
import { useHomeworkDoneIds } from "@/components/sections/homework-cards";
import { isSubjectTodo, useSubjectDoneRaw } from "@/components/sections/subject-cards";

/* 데일리 학습 화면 맨 위: 오늘 날짜 · 날씨 · 시계 + 큰 제목.
   - 날짜·시계는 보는 사람의 기기 시간으로 표시
   - 날씨: site.config.ts 의 daily.weather 위치 (Open-Meteo 무료 날씨 정보)
   - 큰 제목 분홍 칸: '할일 N개' = 오늘 아직 안 끝낸 숙제 + 아직 도장 못 받은 과목 영상 */

/* ---------- 시계 (1초마다 다시 그림) ---------- */

function subscribeClock(onChange: () => void) {
  const timer = window.setInterval(onChange, 1000);
  return () => window.clearInterval(timer);
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" });
const timeFormat = new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" });

// 같은 글자면 같은 값을 돌려줘야 화면을 쓸데없이 다시 그리지 않음
const nowText = () => `${dateFormat.format(new Date())}|${timeFormat.format(new Date())}`;

/* ---------- 날씨 ---------- */

type Weather = { temp: number; emoji: string; label: string };

function describeWeather(code: number): Pick<Weather, "emoji" | "label"> {
  if (code === 0) return { emoji: "☀️", label: "맑음" };
  if (code <= 2) return { emoji: "🌤️", label: "구름 조금" };
  if (code === 3) return { emoji: "☁️", label: "흐림" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "안개" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "이슬비" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "비" };
  if (code >= 71 && code <= 77) return { emoji: "❄️", label: "눈" };
  if (code >= 80 && code <= 82) return { emoji: "🌦️", label: "소나기" };
  if (code === 85 || code === 86) return { emoji: "🌨️", label: "눈" };
  if (code >= 95) return { emoji: "⛈️", label: "천둥번개" };
  return { emoji: "🌈", label: "" };
}

function useWeather(): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    const { latitude, longitude } = siteConfig.daily.weather;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,weather_code&timezone=auto`;
    let cancelled = false;

    const load = () =>
      fetch(url)
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((data) => {
          const temp = data?.current?.temperature_2m;
          const code = data?.current?.weather_code;
          if (cancelled || typeof temp !== "number" || typeof code !== "number") return;
          setWeather({ temp: Math.round(temp), ...describeWeather(code) });
        })
        .catch(() => {
          // 날씨를 못 가져오면 날씨 칸만 숨김
        });

    load();
    const timer = window.setInterval(load, 30 * 60 * 1000); // 30분마다 새로
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return weather;
}

/* ---------- 화면 ---------- */

type Title = Pick<DailyText, "titleBefore" | "titleHighlight" | "titleAfter">;

export function DailyHeader({
  title,
  homework,
  subjects,
}: {
  title: Title;
  homework: Item[];
  subjects: SubjectCard[];
}) {
  const now = useSyncExternalStore(subscribeClock, nowText, () => null);
  const [today, time] = now ? now.split("|") : [null, null];
  const weather = useWeather();

  const homeworkDone = useHomeworkDoneIds();
  const subjectRaw = useSubjectDoneRaw();
  const remaining =
    homework.filter((item) => !homeworkDone.includes(item.id)).length +
    subjects.filter((subject) => isSubjectTodo(subject, subjectRaw)).length;
  const total = homework.length + subjects.filter((s) => isSubjectTodo(s, "[]")).length;
  const allDone = total > 0 && remaining === 0;

  const chip = "inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-sm font-semibold shadow-sm";

  return (
    <div>
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        {today ? <p className="mr-1 text-base font-semibold text-muted-foreground">오늘은 {today}</p> : null}
        {weather ? (
          <span className={chip}>
            <span aria-hidden>{weather.emoji}</span>
            {siteConfig.daily.weather.city} {weather.temp}°C
            {weather.label ? <span className="text-muted-foreground">{weather.label}</span> : null}
          </span>
        ) : null}
        {time ? (
          <span className={`${chip} tabular-nums`}>
            <Clock className="size-4 text-primary" />
            {time}
          </span>
        ) : null}
      </div>

      <h1 className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-3xl font-bold tracking-tight sm:text-4xl">
        {allDone ? (
          <span>{siteConfig.daily.allDoneTitle}</span>
        ) : (
          <>
            <span>{title.titleBefore}</span>
            {/* 분홍 칸과 뒤 글자는 줄이 바뀌어도 떨어지지 않게 한 덩어리로 */}
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="inline-flex items-center rounded-full bg-primary py-1 pl-4 pr-2 text-primary-foreground">
                {title.titleHighlight} {remaining}개
                <ChevronRight className="size-7" strokeWidth={3} />
              </span>
              <span>{title.titleAfter}</span>
            </span>
          </>
        )}
      </h1>
    </div>
  );
}
