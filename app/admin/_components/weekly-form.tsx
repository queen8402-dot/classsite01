"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { saveWeeklyDay, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DAY_LABELS, WEEK_DAYS, weekDayOf, type WeekDay, type WeeklyPlan, type WeeklyTask } from "@/lib/week";
import { getYouTubeId } from "@/components/sections/video-dialog";

/* 관리자 > 요일별 숙제
   - 월~금 버튼으로 요일을 고르고, '+ 숙제 추가'로 줄을 늘림
   - 한 줄 = 과목명 + 할 일 + 링크(선택). 유튜브 링크면 학생 화면에서 영상 숙제가 됨
   - 요일마다 따로 저장 */

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

const newRow = (): WeeklyTask => ({
  id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  subject: "",
  task: "",
  link: "",
});

function DayEditor({ day, initial, plan }: { day: WeekDay; initial: WeeklyTask[]; plan: WeeklyPlan }) {
  const [rows, setRows] = useState<WeeklyTask[]>(initial.length ? initial : [newRow()]);
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveWeeklyDay, {});

  // 저장에 성공하면 '저장 안 됨' 표시 지우기
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.ok) setDirty(false);
  }

  const update = (next: WeeklyTask[]) => {
    setRows(next);
    setDirty(true);
  };
  const change = (i: number, field: keyof WeeklyTask, value: string) =>
    update(rows.map((r, k) => (k === i ? { ...r, [field]: value } : r)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const copyFrom = (from: WeekDay) => {
    if (!plan[from].length) return;
    update(plan[from].map((r) => ({ ...r, id: newRow().id })));
  };

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {DAY_LABELS[day]} 숙제 <span className="text-muted-foreground">({rows.filter((r) => r.subject || r.task).length}개)</span>
        </h2>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          다른 요일 복사
          <select
            className="h-9 rounded-lg border bg-background px-2 text-sm"
            value=""
            onChange={(e) => copyFrom(e.target.value as WeekDay)}
          >
            <option value="">선택</option>
            {WEEK_DAYS.filter((d) => d !== day).map((d) => (
              <option key={d} value={d} disabled={!plan[d].length}>
                {DAY_LABELS[d]} ({plan[d].length}개)
              </option>
            ))}
          </select>
        </label>
      </div>

      <ol className="grid gap-3">
        {rows.map((row, i) => {
          const isVideo = !!row.link && !!getYouTubeId(row.link);
          return (
            <li key={row.id} className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[2rem_8rem_1fr_1.3fr_auto] sm:items-end">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground sm:mb-1">
                {i + 1}
              </span>
              <label className="grid gap-1 text-xs font-medium">
                과목명
                <input
                  className={inputClass}
                  value={row.subject}
                  placeholder="예) 영어"
                  onChange={(e) => change(i, "subject", e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                할 일
                <input
                  className={inputClass}
                  value={row.task}
                  placeholder="예) 영상 보기, 수학 연산"
                  onChange={(e) => change(i, "task", e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                <span className="flex items-center gap-2">
                  링크 (선택)
                  {isVideo ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
                      🎬 영상 숙제
                    </span>
                  ) : null}
                </span>
                <input
                  className={inputClass}
                  type="url"
                  value={row.link}
                  placeholder="https://"
                  onChange={(e) => change(i, "link", e.target.value)}
                />
              </label>
              <div className="flex gap-1 sm:mb-0.5">
                <Button type="button" variant="ghost" size="icon" aria-label="위로" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="아래로"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${i + 1}번 줄 지우기`}
                  onClick={() => update(rows.filter((_, k) => k !== i))}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>

      <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => update([...rows, newRow()])}>
        <Plus /> 숙제 추가
      </Button>

      <p className="text-xs text-muted-foreground">
        유튜브 링크는 학생 화면에서 영상 창으로 열리고, 끝까지 봐야 클리어돼요. 다른 링크는 새 탭으로 열리고, 학생이
        &lsquo;다 했어요&rsquo;를 눌러 클리어해요. 비어 있는 줄은 저장하지 않아요.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : `${DAY_LABELS[day]} 저장`}
        </Button>
        {dirty ? <span className="text-sm font-semibold text-primary">● 저장 안 된 변경이 있어요</span> : null}
        {/* 실패 문구는 항상, 성공 문구는 그 뒤로 고친 게 없을 때만 */}
        {state.message && (!state.ok || !dirty) ? (
          <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}

const subscribeNothing = () => () => {};

export function WeeklyForm({ plan }: { plan: WeeklyPlan }) {
  // 처음에는 오늘 요일(주말이면 월요일)을 보여줌. 날짜는 브라우저에서만 계산
  const today = useSyncExternalStore(subscribeNothing, () => weekDayOf(new Date()) ?? "mon", () => null);
  const [picked, setPicked] = useState<WeekDay | null>(null);
  const day = picked ?? today ?? "mon";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="요일">
        {WEEK_DAYS.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === day}
            onClick={() => setPicked(d)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
              d === day ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {DAY_LABELS[d].slice(0, 1)}
            <span className="ml-1 text-xs opacity-80">{plan[d].length}</span>
          </button>
        ))}
      </div>
      {/* 다섯 요일을 모두 만들어 두고 고른 요일만 보여줌 → 요일을 바꿔도 쓰던 내용이 남아 있음 */}
      {WEEK_DAYS.map((d) => (
        <div key={d} hidden={d !== day}>
          <DayEditor day={d} initial={plan[d]} plan={plan} />
        </div>
      ))}
    </div>
  );
}
