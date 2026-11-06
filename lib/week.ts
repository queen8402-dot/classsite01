/* 요일별 숙제에서 쓰는 요일 정보 (서버·브라우저 모두에서 씀) */

export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export const DAY_LABELS: Record<WeekDay, string> = {
  mon: "월요일",
  tue: "화요일",
  wed: "수요일",
  thu: "목요일",
  fri: "금요일",
};

/** 숙제 한 줄: 과목명 + 할 일 + 링크(선택) */
export type WeeklyTask = {
  id: string;
  subject: string;
  task: string;
  /** 유튜브 주소면 사이트 안 영상 창, 다른 주소면 새 탭, 비어 있으면 '다 했어요'만 */
  link: string;
};

export type WeeklyPlan = Record<WeekDay, WeeklyTask[]>;

export const emptyWeeklyPlan = (): WeeklyPlan => ({ mon: [], tue: [], wed: [], thu: [], fri: [] });

/** 날짜의 요일. 토·일요일이면 null */
export function weekDayOf(date: Date): WeekDay | null {
  const n = date.getDay(); // 0 = 일요일
  return n >= 1 && n <= 5 ? WEEK_DAYS[n - 1] : null;
}

/** 저장된 값을 안전한 모양으로 정리 (이상한 값은 버림) */
export function cleanWeeklyPlan(raw: unknown): WeeklyPlan {
  const plan = emptyWeeklyPlan();
  if (!raw || typeof raw !== "object") return plan;
  for (const day of WEEK_DAYS) {
    const rows = (raw as Record<string, unknown>)[day];
    if (!Array.isArray(rows)) continue;
    plan[day] = rows
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .map((r) => ({
        id: typeof r.id === "string" && r.id ? r.id : Math.random().toString(36).slice(2, 10),
        subject: typeof r.subject === "string" ? r.subject : "",
        task: typeof r.task === "string" ? r.task : "",
        link: typeof r.link === "string" ? r.link : "",
      }))
      .filter((r) => r.subject.trim() || r.task.trim());
  }
  return plan;
}
