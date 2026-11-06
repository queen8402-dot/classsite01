"use client";

import { useCallback, useState } from "react";
import { Check, ChevronRight, Map as MapIcon } from "lucide-react";

import { siteConfig } from "@/site.config";
import type { DailyText } from "@/lib/types";
import type { WeeklyPlan } from "@/lib/week";
import { cn } from "@/lib/utils";
import { useTodayTasks } from "@/components/sections/today-tasks";
import { AdventureMap } from "@/components/sections/adventure-map";

/* 첫 화면 '오늘의 할일' 판
   - 관리자가 '요일별 숙제'에 넣은 오늘 요일 숙제를 한 줄씩 한눈에 (토·일은 쉬는 날)
   - 한 줄을 누르면 섬 모험 지도가 열리고 캐릭터가 그 할일로 출발 */

export function TodayBoard({ weekly, daily }: { weekly: WeeklyPlan; daily: DailyText }) {
  const g = siteConfig.daily.game;
  const { day, tasks } = useTodayTasks(weekly);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const close = useCallback(() => setMapOpen(false), []);

  const doneCount = tasks.filter((t) => t.done).length;
  const nextTask = tasks.find((t) => !t.done);

  function open(key: string | null) {
    setSelectedKey(key);
    setMapOpen(true);
  }

  // 서버에서 그릴 때는 요일을 몰라서 빈 자리만
  if (day === null) return <div className="h-40 rounded-3xl bg-card" aria-hidden />;

  if (day === "weekend") {
    return (
      <div className="rounded-3xl bg-card p-8 text-center">
        <p className="text-5xl" aria-hidden>
          🏖️
        </p>
        <p className="mt-3 text-xl font-bold">{g.restDay}</p>
        <p className="mt-1 text-muted-foreground">{g.restHint}</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="rounded-3xl bg-card p-8 text-center text-lg font-semibold text-muted-foreground">
        {siteConfig.daily.empty}
      </p>
    );
  }

  return (
    <section aria-labelledby="today-title" className="rounded-3xl bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="today-title" className="text-xl font-bold">
            📋 {g.boardTitle}
          </h2>
          <p className="mt-0.5 text-sm font-semibold text-muted-foreground">
            ⭐ {doneCount}/{tasks.length} {g.cleared}
          </p>
        </div>
        <button
          type="button"
          onClick={() => open(nextTask?.key ?? null)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
        >
          <MapIcon className="size-4" />
          {g.openMap}
        </button>
      </div>

      <ol className="mt-4 grid gap-2">
        {tasks.map((task, i) => (
          <li key={task.key}>
            <button
              type="button"
              onClick={() => open(task.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-muted sm:gap-4",
                task.key === nextTask?.key && "border-primary ring-2 ring-primary/30",
                task.done && "bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "hexagon flex size-12 shrink-0 items-center justify-center text-2xl",
                  task.done ? "bg-success/15" : "bg-accent",
                )}
                aria-hidden
              >
                {task.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold tracking-wide text-primary">
                  {g.stage} {i + 1}
                </span>
                <span className={cn("block truncate font-bold", task.done && "text-muted-foreground line-through")}>
                  {task.title}
                </span>
                {task.description ? (
                  <span className="block truncate text-sm text-muted-foreground">{task.description}</span>
                ) : null}
              </span>
              {task.done ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-bold text-success-foreground">
                  <Check className="size-3.5" strokeWidth={3} /> {g.cleared}
                </span>
              ) : (
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-extrabold">🪙 +{task.reward}</span>
                  {task.key === nextTask?.key ? (
                    <span className="text-xs font-bold text-primary">{g.todo}</span>
                  ) : null}
                </span>
              )}
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ol>

      {mapOpen ? (
        <AdventureMap tasks={tasks} selectedKey={selectedKey} student={daily} onSelect={setSelectedKey} onClose={close} />
      ) : null}
    </section>
  );
}
