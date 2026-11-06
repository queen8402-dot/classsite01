"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Play } from "lucide-react";

import { siteConfig } from "@/site.config";
import type { DailyText } from "@/lib/types";
import { cn } from "@/lib/utils";
import { currentStreak, useGameState } from "@/lib/game";
import { GameAvatar } from "@/components/sections/game-avatar";
import { setHomeworkDone } from "@/components/sections/homework-cards";
import { VideoDialog } from "@/components/sections/video-dialog";
import { completeVideoTask, type TodayTask } from "@/components/sections/today-tasks";

/* 섬 모험 지도 (화면 전체)
   - 아래 '출발' 캠프 → 할일 섬들 → 맨 위 '보물섬'을 흙길이 이어 줌
   - 할일을 고르면 내 캐릭터가 길을 따라 그 섬까지 걸어감 (화면도 따라감)
   - 아래 패널에서 시작하기 / 다 했어요 → 코인 + ✔
   - 지도 그림은 SVG 로 직접 그림. 색은 app/globals.css 의 --map-* */

const W = 400; // 지도 그림 가로 크기 (그림 안 단위)
const GAP = 170; // 섬 사이 세로 간격
const PAD = 120; // 위아래 여백

/* 섬 위치: 0 = 출발, 1..n = 할일, n+1 = 보물섬 (아래에서 위로 지그재그) */
function makeLayout(taskCount: number) {
  const count = taskCount + 2;
  const height = PAD * 2 + (count - 1) * GAP;
  const points = Array.from({ length: count }, (_, i) => ({
    x: i === 0 || i === count - 1 ? 200 : i % 2 ? 112 : 288,
    y: height - PAD - i * GAP,
  }));
  const curve = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    `C ${a.x} ${a.y - GAP / 2} ${b.x} ${b.y + GAP / 2} ${b.x} ${b.y}`;
  const segments = points.slice(1).map((p, i) => `M ${points[i].x} ${points[i].y} ${curve(points[i], p)}`);
  const route = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : curve(points[i - 1], p))).join(" ");
  return { height, points, segments, route };
}

/* 캐릭터가 마지막으로 서 있던 섬 (지도를 닫았다 열어도 기억) */
let lastNode = 0;

/* ---------- 지도 그림 조각 ---------- */

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-2.5} y={2} width={5} height={10} rx={1.5} fill="var(--map-trunk)" />
      <circle cx={0} cy={-4} r={11} fill="var(--map-tree)" />
      <circle cx={-3} cy={-8} r={5} fill="var(--map-grass)" opacity={0.6} />
    </g>
  );
}

function Hut({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-11} y={-6} width={22} height={15} rx={2} fill="var(--map-wall)" />
      <rect x={-3} y={1} width={6} height={8} fill="var(--map-cliff-dark)" />
      <polygon points="-15,-5 0,-18 15,-5" fill="var(--map-roof)" />
    </g>
  );
}

function Rock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon points="-12,6 -8,-6 0,-12 9,-5 12,6" fill="var(--map-rock)" />
      <polygon points="-8,-6 0,-12 2,-2" fill="var(--map-wall)" opacity={0.5} />
    </g>
  );
}

function Island({ x, y, i, big }: { x: number; y: number; i: number; big?: boolean }) {
  const rx = (big ? 130 : 100) + ((i * 23) % 26);
  const ry = big ? 70 : 56;
  // 길과 겹치지 않게 섬 가장자리에 장식
  const side = x < 200 ? -1 : 1;
  return (
    <g>
      <ellipse cx={x} cy={y + 22} rx={rx} ry={ry} fill="var(--map-cliff-dark)" />
      <ellipse cx={x} cy={y + 12} rx={rx} ry={ry} fill="var(--map-cliff)" />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="var(--map-grass)" />
      <ellipse cx={x - rx * 0.3} cy={y - ry * 0.35} rx={rx * 0.45} ry={ry * 0.35} fill="var(--map-grass-dark)" opacity={0.25} />
      <Tree x={x - side * (rx - 22)} y={y - 18} />
      <Tree x={x - side * (rx - 40)} y={y + 22} s={0.85} />
      {i % 3 === 0 ? <Hut x={x + side * (rx - 30)} y={y + 28} /> : null}
      {i % 3 === 1 ? <Rock x={x + side * (rx - 26)} y={y + 30} /> : null}
      {i % 3 === 2 ? <Tree x={x + side * (rx - 24)} y={y + 30} s={0.9} /> : null}
    </g>
  );
}

function Waves({ height }: { height: number }) {
  const rows = Math.ceil(height / 70);
  return (
    <g stroke="var(--map-water-light)" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.8}>
      {Array.from({ length: rows * 2 }, (_, k) => {
        const x = 20 + ((k * 137) % 360);
        const y = 30 + ((k * 89) % height);
        return <path key={k} d={`M ${x} ${y} q 7 -6 14 0 t 14 0`} />;
      })}
    </g>
  );
}

/* ---------- 화면 ---------- */

export function AdventureMap({
  tasks,
  selectedKey,
  student,
  onSelect,
  onClose,
}: {
  tasks: TodayTask[];
  selectedKey: string | null;
  student: Pick<DailyText, "studentName" | "studentAvatar" | "studentPhotoUrl">;
  onSelect: (key: string | null) => void;
  onClose: () => void;
}) {
  const g = siteConfig.daily.game;
  const game = useGameState();
  const streak = currentStreak(game);
  const layout = useMemo(() => makeLayout(tasks.length), [tasks.length]);
  const treasureIndex = tasks.length + 1;
  const doneCount = tasks.filter((t) => t.done).length;
  const allDone = tasks.length > 0 && doneCount === tasks.length;

  const selectedIndex = tasks.findIndex((t) => t.key === selectedKey);
  const selected = selectedIndex >= 0 ? tasks[selectedIndex] : null;
  const [goTreasure, setGoTreasure] = useState(false);
  const target = goTreasure ? treasureIndex : selectedIndex >= 0 ? selectedIndex + 1 : null;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const segmentRefs = useRef<(SVGPathElement | null)[]>([]);
  const atRef = useRef(Math.min(lastNode, treasureIndex));
  const lengthRef = useRef<number | null>(null); // 길 위 지금 위치 (걷는 중에도 계속 바뀜)
  const [pos, setPos] = useState(() => layout.points[Math.min(lastNode, treasureIndex)]);
  const [walking, setWalking] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  // 화면(지도 픽셀)을 캐릭터 위치로 옮기기
  const follow = (y: number, smooth = false) => {
    const scroller = scrollerRef.current;
    const map = mapRef.current;
    if (!scroller || !map) return;
    const top = map.offsetTop + (y / layout.height) * map.clientHeight - scroller.clientHeight * 0.42;
    scroller.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  };

  // 처음 열 때: 캐릭터가 있는 곳을 보여주기 + 뒤 화면 스크롤 막기
  useLayoutEffect(() => {
    follow(layout.points[atRef.current].y);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 고른 섬까지 길을 따라 걷기
  useEffect(() => {
    if (target === null || (target === atRef.current && lengthRef.current === null)) return;
    const route = routeRef.current;
    const lengths = segmentRefs.current.map((p) => p?.getTotalLength() ?? 0);
    if (!route || lengths.length !== layout.segments.length) return;
    const cum = lengths.reduce<number[]>((acc, l) => [...acc, acc[acc.length - 1] + l], [0]);

    const from = lengthRef.current ?? cum[atRef.current];
    const to = cum[target];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : Math.min(2400, 450 + Math.abs(target - atRef.current) * 650);
    const startTime = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - startTime) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const length = from + (to - from) * eased;
      lengthRef.current = length;
      const p = route.getPointAtLength(length);
      setPos({ x: p.x, y: p.y });
      setWalking(t < 1);
      follow(p.y);
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        atRef.current = target;
        lastNode = target;
        lengthRef.current = to;
      }
    };
    frame = requestAnimationFrame(step);
    // 중간에 다른 섬을 고르면 멈춘 자리(lengthRef)에서 다시 출발
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, layout]);

  // Esc 키로 닫기 (영상 창이 열려 있으면 영상 창만 닫힘)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !videoOpen && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, videoOpen]);

  const pct = (p: { x: number; y: number }) => ({
    left: `${(p.x / W) * 100}%`,
    top: `${(p.y / layout.height) * 100}%`,
  });

  return (
    <div className="fixed inset-0 z-50 bg-[var(--map-water)]" role="dialog" aria-modal="true" aria-label={g.mapTitle}>
      {/* 맨 위 막대 */}
      <div className="absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="mx-auto flex max-w-md items-center gap-2 rounded-full bg-card/95 p-1.5 pr-2 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            aria-label="돌아가기"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-sm font-extrabold">
            🪙 <span className="tabular-nums">{game.coins}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm font-extrabold">
            ⭐ {doneCount}/{tasks.length}
          </span>
          {streak > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-sm font-extrabold text-secondary-foreground">
              🔥 {streak}
            </span>
          ) : null}
          <span className="ml-auto">
            <GameAvatar photoUrl={student.studentPhotoUrl} emoji={student.studentAvatar} name={student.studentName} size="sm" />
          </span>
        </div>
      </div>

      {/* 지도 (위아래로 스크롤) */}
      <div ref={scrollerRef} className="absolute inset-0 overflow-y-auto overscroll-contain pb-72 pt-20">
        <div ref={mapRef} className="relative mx-auto w-full max-w-md" style={{ aspectRatio: `${W} / ${layout.height}` }}>
          <svg viewBox={`0 0 ${W} ${layout.height}`} className="absolute inset-0 size-full" aria-hidden>
            <rect width={W} height={layout.height} fill="var(--map-water)" />
            <Waves height={layout.height} />
            {layout.points.map((p, i) => (
              <Island key={i} x={p.x} y={p.y} i={i} big={i === treasureIndex} />
            ))}
            {/* 흙길 */}
            <path d={layout.route} fill="none" stroke="var(--map-path-edge)" strokeWidth={30} strokeLinecap="round" />
            <path ref={routeRef} d={layout.route} fill="none" stroke="var(--map-path)" strokeWidth={22} strokeLinecap="round" />
            <path
              d={layout.route}
              fill="none"
              stroke="var(--map-path-edge)"
              strokeWidth={3}
              strokeDasharray="3 12"
              strokeLinecap="round"
              opacity={0.7}
            />
            {/* 길이 재기용 (안 보임) */}
            {layout.segments.map((d, i) => (
              <path
                key={i}
                ref={(el) => {
                  segmentRefs.current[i] = el;
                }}
                d={d}
                fill="none"
                stroke="none"
              />
            ))}
          </svg>

          {/* 출발 캠프 */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pct(layout.points[0])}>
            <div className="hexagon flex size-14 items-center justify-center bg-card text-3xl shadow">⛺</div>
            <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-2.5 py-0.5 text-xs font-bold shadow">
              {g.mapStart}
            </span>
          </div>

          {/* 할일 섬 */}
          {tasks.map((task, i) => {
            const p = layout.points[i + 1];
            const isSelected = task.key === selectedKey;
            return (
              <div key={task.key} className="absolute -translate-x-1/2 -translate-y-1/2" style={pct(p)}>
                {isSelected && !walking && !task.done ? (
                  <span className="float absolute bottom-full left-1/2 mb-3 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-sm font-extrabold text-background shadow">
                    {g.go}
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-foreground" />
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setGoTreasure(false);
                    onSelect(task.key);
                  }}
                  aria-label={`${task.title}${task.done ? ` ${g.cleared}` : ""}`}
                  className={cn(
                    "hexagon block size-16 p-1 shadow-lg transition-transform hover:scale-105",
                    task.done ? "bg-success" : isSelected ? "bg-primary" : "bg-card",
                  )}
                >
                  <span className="hexagon flex size-full items-center justify-center bg-card text-3xl">{task.emoji}</span>
                </button>
                {task.done ? (
                  <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-success text-success-foreground shadow">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                ) : null}
                {task.done ? (
                  <span className="absolute -left-3 -top-4 text-xl" aria-hidden>
                    🚩
                  </span>
                ) : null}
                <span
                  className={cn(
                    "absolute left-1/2 top-full mt-1 max-w-36 -translate-x-1/2 truncate whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold shadow",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {task.done ? "✓ " : ""}
                  {task.title}
                </span>
              </div>
            );
          })}

          {/* 보물섬 */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pct(layout.points[treasureIndex])}>
            <button
              type="button"
              disabled={!allDone}
              onClick={() => setGoTreasure(true)}
              aria-label={g.mapTreasure}
              className={cn(
                "hexagon flex size-20 items-center justify-center text-4xl shadow-lg",
                allDone ? "bg-gold" : "bg-card/80",
              )}
            >
              {allDone ? "🏆" : "🔒"}
            </button>
            <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-2.5 py-0.5 text-xs font-bold shadow">
              {g.mapTreasure}
            </span>
          </div>

          {/* 내 캐릭터 */}
          <div
            className="pointer-events-none absolute z-10"
            style={{ ...pct(pos), transform: "translate(calc(-50% - 46px), -80%)" }}
          >
            <div className={walking ? "walking" : ""}>
              <GameAvatar photoUrl={student.studentPhotoUrl} emoji={student.studentAvatar} name={student.studentName} size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* 아래 패널 */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="mx-auto max-w-md rounded-t-3xl bg-card p-5 pb-6 shadow-2xl">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
          {allDone ? (
            /* 오늘 할일을 다 끝냄 → 보물섬으로! */
            goTreasure ? (
              <p className="py-2 text-center text-xl font-extrabold">🏆 {g.dayCompleteTitle}</p>
            ) : (
              <button
                type="button"
                onClick={() => setGoTreasure(true)}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gold text-lg font-extrabold"
              >
                🏆 {g.mapTreasure}!
              </button>
            )
          ) : selected ? (
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <div className="hexagon flex size-16 shrink-0 items-center justify-center bg-accent text-3xl">{selected.emoji}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold tracking-wide text-primary">
                    {g.stage} {selectedIndex + 1} · 🪙 +{selected.reward}
                  </p>
                  <h2 className="truncate text-lg font-bold">{selected.title}</h2>
                  {selected.description ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{selected.description}</p>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selected.kind === "video" ? (
                  <button
                    type="button"
                    onClick={() => setVideoOpen(true)}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
                  >
                    <Play className="size-5" /> {g.watchButton}
                  </button>
                ) : selected.link ? (
                  <a
                    href={selected.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
                  >
                    {g.startButton} <ExternalLink className="size-4" />
                  </a>
                ) : (
                  <span className="flex h-12 items-center justify-center rounded-2xl bg-muted px-2 text-center text-xs font-semibold text-muted-foreground">
                    {g.noLink}
                  </span>
                )}

                {selected.kind === "homework" ? (
                  <button
                    type="button"
                    onClick={() => setHomeworkDone(selected.doneId, !selected.done)}
                    className={cn(
                      "flex h-12 items-center justify-center gap-2 rounded-2xl font-bold",
                      selected.done ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {selected.done ? (
                      <>
                        <Check className="size-5" strokeWidth={3} /> {siteConfig.daily.undoButton}
                      </>
                    ) : (
                      siteConfig.daily.doneButton
                    )}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold",
                      selected.done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {selected.done ? `✔ ${g.cleared}` : siteConfig.daily.video.hint}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="py-3 text-center text-base font-semibold text-muted-foreground">{g.pickHint}</p>
          )}
        </div>
      </div>

      {videoOpen && selected?.videoId ? (
        <VideoDialog
          title={selected.title}
          videoId={selected.videoId}
          alreadyDone={selected.done}
          onComplete={() => completeVideoTask(selected)}
          onClose={() => setVideoOpen(false)}
        />
      ) : null}
    </div>
  );
}
