import { useSyncExternalStore } from "react";

import { siteConfig } from "@/site.config";

/* 게임 기록 (코인 · 연속 성공 · 산 아이템 · 입은 아이템)
   - 로그인이 없어서 이 기기의 브라우저에만 저장됨
   - 같은 일로는 하루에 한 번만 코인을 받음 (awarded 에 기록) */

export type ShopItem = (typeof siteConfig.daily.game.items)[number];

export type GameState = {
  coins: number;
  owned: string[];
  /** 부위(slot)별로 입은 아이템 id */
  equipped: Record<string, string>;
  /** 날짜별로 이미 코인을 받은 일 목록 */
  awarded: Record<string, string[]>;
  /** 하루 할일을 전부 끝낸 연속 일수와 마지막 날짜 */
  streak: { count: number; lastDate: string | null };
};

export type RewardEvent = { id: number; amount: number; label: string; big?: boolean; streak?: number };

const STORAGE_KEY = "game-state-v1";
const EMPTY: GameState = { coins: 0, owned: [], equipped: {}, awarded: {}, streak: { count: 0, lastDate: null } };
const EMPTY_RAW = JSON.stringify(EMPTY);

/* ---------- 날짜 ---------- */

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

/* ---------- 저장 / 읽기 ---------- */

const listeners = new Set<() => void>();
let memoryCopy = EMPTY_RAW; // 브라우저 저장 공간을 못 쓸 때(비공개 창 등) 대신 쓰는 값

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryCopy;
  } catch {
    return memoryCopy;
  }
}

let cacheRaw = "";
let cacheState = EMPTY;

function parse(raw: string): GameState {
  if (raw === cacheRaw) return cacheState;
  let next = EMPTY;
  try {
    const v = JSON.parse(raw);
    next = {
      coins: typeof v.coins === "number" && v.coins >= 0 ? v.coins : 0,
      owned: Array.isArray(v.owned) ? v.owned.filter((x: unknown) => typeof x === "string") : [],
      equipped: v.equipped && typeof v.equipped === "object" ? v.equipped : {},
      awarded: v.awarded && typeof v.awarded === "object" ? v.awarded : {},
      streak:
        v.streak && typeof v.streak.count === "number"
          ? { count: v.streak.count, lastDate: v.streak.lastDate ?? null }
          : EMPTY.streak,
    };
  } catch {
    // 기록이 깨져 있으면 처음부터
  }
  cacheRaw = raw;
  cacheState = next;
  return next;
}

function write(next: GameState) {
  // 오래된 날짜의 코인 기록은 정리 (오늘·어제만 남김)
  const keep = [dateKey(), yesterdayKey()];
  const awarded = Object.fromEntries(Object.entries(next.awarded).filter(([d]) => keep.includes(d)));
  const raw = JSON.stringify({ ...next, awarded });
  memoryCopy = raw;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
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

/** 지금 게임 기록 (화면 조각에서 씀) */
export function useGameState(): GameState {
  return parse(useSyncExternalStore(subscribe, readRaw, () => EMPTY_RAW));
}

/** 지금 이어지고 있는 연속 성공 일수 (어제나 오늘 끝냈을 때만) */
export function currentStreak(state: GameState) {
  const { count, lastDate } = state.streak;
  return lastDate === dateKey() || lastDate === yesterdayKey() ? count : 0;
}

export function findItem(id: string | undefined) {
  return siteConfig.daily.game.items.find((item) => item.id === id);
}

/* ---------- 보상 연출 알림 ---------- */

const rewardListeners = new Set<(e: RewardEvent) => void>();
let rewardId = 0;

export function subscribeRewards(listener: (e: RewardEvent) => void) {
  rewardListeners.add(listener);
  return () => {
    rewardListeners.delete(listener);
  };
}

function celebrate(e: Omit<RewardEvent, "id">) {
  const event = { ...e, id: ++rewardId };
  rewardListeners.forEach((l) => l(event));
}

/* ---------- 코인 주기 ---------- */

/** key 로 구분되는 일에 코인을 줌. 오늘 이미 받은 일이면 0 */
export function award(key: string, amount: number, label: string) {
  const state = parse(readRaw());
  const today = dateKey();
  const list = state.awarded[today] ?? [];
  if (amount <= 0 || list.includes(key)) return 0;
  write({ ...state, coins: state.coins + amount, awarded: { ...state.awarded, [today]: [...list, key] } });
  celebrate({ amount, label });
  return amount;
}

/** 오늘 할일을 전부 끝냈을 때 한 번: 보너스 + 연속 성공 기록 */
export function completeDay() {
  const { coins, dayCompleteTitle } = siteConfig.daily.game;
  const state = parse(readRaw());
  const today = dateKey();
  const list = state.awarded[today] ?? [];
  if (list.includes("all-done")) return;

  const streak = state.streak.lastDate === yesterdayKey() ? state.streak.count + 1 : 1;
  let bonus = coins.allDone;
  if (streak === 3) bonus += coins.streak3;
  if (streak % 7 === 0) bonus += coins.streak7;

  write({
    ...state,
    coins: state.coins + bonus,
    streak: { count: streak, lastDate: today },
    awarded: { ...state.awarded, [today]: [...list, "all-done"] },
  });
  celebrate({ amount: bonus, label: dayCompleteTitle, big: true, streak });
}

/* ---------- 상점 ---------- */

/** 아이템 사기 (사면 바로 입음). 성공하면 true */
export function buyItem(id: string) {
  const item = findItem(id);
  const state = parse(readRaw());
  if (!item || state.owned.includes(id) || state.coins < item.price) return false;
  write({
    ...state,
    coins: state.coins - item.price,
    owned: [...state.owned, id],
    equipped: { ...state.equipped, [item.slot]: id },
  });
  return true;
}

/** 입기 / 벗기 (id 가 null 이면 그 부위를 벗음) */
export function equipItem(slot: string, id: string | null) {
  const state = parse(readRaw());
  const equipped = { ...state.equipped };
  if (id && state.owned.includes(id)) equipped[slot] = id;
  else delete equipped[slot];
  write({ ...state, equipped });
}
