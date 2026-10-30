"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { siteConfig } from "@/site.config";
import { Button } from "@/components/ui/button";

/* 과목 카드를 누르면 뜨는 유튜브 영상 창.
   - 유튜브 공식 플레이어(IFrame API)를 사이트 안에 띄워서 '끝까지 봤는지' 확인
   - 실제로 재생된 시간이 영상 길이의 80% 이상이고 끝까지 가면 onComplete 호출
     (끝부분으로 건너뛰기만 하면 도장을 주지 않음) */

/* ---------- 유튜브 주소에서 영상 번호 꺼내기 ---------- */

export function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1) || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const match = u.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/);
      return match ? match[2] : null;
    }
  } catch {
    // 주소 형식이 아니면 유튜브 아님
  }
  return null;
}

/* ---------- 유튜브 플레이어 불러오기 ---------- */

type YTPlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT as YTNamespace);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

const PLAYING = 1;
const ENDED = 0;
const REQUIRED_RATIO = 0.8; // 영상 길이의 80% 이상 실제로 봐야 완료

/* ---------- 영상 창 ---------- */

export function VideoDialog({
  title,
  videoId,
  alreadyDone,
  onComplete,
  onClose,
}: {
  title: string;
  videoId: string;
  alreadyDone: boolean;
  onComplete: () => void;
  onClose: () => void;
}) {
  const text = siteConfig.daily.video;
  const holderRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"watching" | "complete" | "skipped">(
    alreadyDone ? "complete" : "watching",
  );

  // 최신 onComplete 를 기억 (플레이어를 다시 만들지 않도록)
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // 플레이어 만들기 + 실제로 본 시간 재기
  useEffect(() => {
    let player: YTPlayer | null = null;
    let ready = false; // 플레이어 준비가 끝나야 재생 정보를 읽을 수 있음
    let cancelled = false;
    let watched = 0;
    let lastTime = 0;

    const timer = window.setInterval(() => {
      if (!player || !ready || player.getPlayerState() !== PLAYING) return;
      const now = player.getCurrentTime();
      const step = now - lastTime;
      if (step > 0 && step < 2.5) watched += step; // 정상 재생만 더함 (건너뛰기는 제외)
      lastTime = now;
    }, 1000);

    loadYouTubeApi().then((YT) => {
      if (cancelled || !holderRef.current) return;
      const el = document.createElement("div");
      holderRef.current.appendChild(el);
      player = new YT.Player(el, {
        videoId,
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            ready = true;
          },
          onStateChange: (e) => {
            if (!player || !ready) return;
            if (e.data === PLAYING) lastTime = player.getCurrentTime();
            if (e.data === ENDED) {
              const duration = player.getDuration();
              if (duration > 0 && watched >= duration * REQUIRED_RATIO) {
                setStatus("complete");
                onCompleteRef.current();
              } else {
                setStatus((s) => (s === "complete" ? s : "skipped"));
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      player?.destroy();
    };
  }, [videoId]);

  // Esc 키로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} 영상`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={text.close}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="size-6" />
          </button>
        </div>

        <div ref={holderRef} className="aspect-video w-full bg-foreground [&_iframe]:size-full" />

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p
            className={
              status === "complete"
                ? "text-base font-bold text-success"
                : status === "skipped"
                  ? "text-base font-semibold text-destructive"
                  : "text-base font-semibold text-muted-foreground"
            }
          >
            {status === "complete" ? text.complete : status === "skipped" ? text.skipped : text.hint}
          </p>
          <Button type="button" variant="outline" onClick={onClose}>
            {text.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
