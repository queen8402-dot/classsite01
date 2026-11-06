"use client";

import { useCallback, useState } from "react";
import { Clock, Home, Lock, Menu, NotebookPen, ShoppingBag, X } from "lucide-react";

import { siteConfig } from "@/site.config";
import type { DailyText } from "@/lib/types";
import { cn } from "@/lib/utils";
import { currentStreak, useGameState } from "@/lib/game";
import { GameAvatar } from "@/components/sections/game-avatar";
import { ShopDialog } from "@/components/sections/shop-dialog";

/* 데일리 학습 화면의 왼쪽 메뉴.
   - 학생 이름/학년/캐릭터·사진: 관리자 페이지(첫 화면 꾸미기), 메뉴 글자: site.config.ts 의 daily
   - 프로필 아래: 내 코인 · 연속 성공 일수 · 꾸미기 상점 버튼 (프로필을 눌러도 상점이 열림)
   - 휴대폰·태블릿 세로 화면에서는 위쪽 막대의 ☰ 버튼으로 열림
   - 맨 아래 관리자 버튼: site.config.ts 의 secretButton (새 탭에서 /admin 열림) */

const icons = [Home, NotebookPen, Clock];

type Student = Pick<DailyText, "studentName" | "studentGrade" | "studentAvatar" | "studentPhotoUrl">;

/** 코인 · 연속 성공 작은 표시 */
function GameStats({ className }: { className?: string }) {
  const game = useGameState();
  const streak = currentStreak(game);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-sm font-extrabold">
        🪙 <span className="tabular-nums">{game.coins}</span>
      </span>
      {streak > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-sm font-extrabold text-secondary-foreground">
          🔥 {streak}일
        </span>
      ) : null}
    </div>
  );
}

function ShopButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-base font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
    >
      <ShoppingBag className="size-5" />
      {siteConfig.daily.game.shopTitle}
    </button>
  );
}

function Profile({ student, onOpenShop }: { student: Student; onOpenShop: () => void }) {
  return (
    <div className="grid gap-4">
      <button
        type="button"
        onClick={onOpenShop}
        className="flex items-center gap-3 rounded-2xl pt-3 text-left"
        aria-label={`${student.studentName} 캐릭터 꾸미기`}
      >
        <GameAvatar
          photoUrl={student.studentPhotoUrl}
          emoji={student.studentAvatar}
          name={student.studentName}
          size="md"
        />
        <div>
          <p className="text-lg font-bold">{student.studentName}</p>
          <p className="text-sm text-muted-foreground">{student.studentGrade}</p>
        </div>
      </button>
      <GameStats />
      <ShopButton onClick={onOpenShop} />
    </div>
  );
}

function AdminButton() {
  const { secretButton } = siteConfig;
  return (
    <a
      href={secretButton.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Lock className="size-4" />
      {secretButton.label}
    </a>
  );
}

function MenuList({ onPick }: { onPick?: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <ul className="grid gap-1">
      {siteConfig.daily.menu.map((item, i) => {
        const Icon = icons[i % icons.length];
        const active = i === 0;
        return (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => {
                if (item.ready) {
                  onPick?.();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  setNotice(item.label);
                  setTimeout(() => setNotice(null), 2000);
                }
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-semibold transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {notice === item.label ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  준비 중이에요
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DailySidebar({ student }: { student: Student }) {
  const [open, setOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const openShop = useCallback(() => {
    setOpen(false);
    setShopOpen(true);
  }, []);
  const closeShop = useCallback(() => setShopOpen(false), []);

  return (
    <>
      {/* 큰 화면: 왼쪽에 고정된 흰 메뉴 */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-8 border-r bg-card px-5 py-8 lg:flex">
        <Profile student={student} onOpenShop={openShop} />
        <nav>
          <MenuList />
        </nav>
        <div className="mt-auto">
          <AdminButton />
        </div>
      </aside>

      {/* 작은 화면: 위쪽 막대 + 펼침 메뉴 */}
      <header className="sticky top-0 z-40 border-b bg-card lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <button type="button" onClick={openShop} className="flex items-center gap-2 pt-1">
            <GameAvatar
              photoUrl={student.studentPhotoUrl}
              emoji={student.studentAvatar}
              name={student.studentName}
              size="sm"
            />
            <span className="font-bold">{student.studentName}</span>
          </button>
          <GameStats className="ml-auto mr-2" />
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        <nav className={cn("border-t px-4 pb-4 pt-3", open ? "block" : "hidden")}>
          <MenuList onPick={() => setOpen(false)} />
          <div className="mt-3 grid gap-2">
            <ShopButton onClick={openShop} />
            <AdminButton />
          </div>
        </nav>
      </header>

      {shopOpen ? (
        <ShopDialog
          student={{ photoUrl: student.studentPhotoUrl, emoji: student.studentAvatar, name: student.studentName }}
          onClose={closeShop}
        />
      ) : null}
    </>
  );
}
