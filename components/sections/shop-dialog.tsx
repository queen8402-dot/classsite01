"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { siteConfig } from "@/site.config";
import { cn } from "@/lib/utils";
import { buyItem, equipItem, useGameState, type ShopItem } from "@/lib/game";
import { GameAvatar, itemLooks } from "@/components/sections/game-avatar";

/* 꾸미기 상점: 코인으로 아이템을 사고, 산 아이템을 입었다 벗었다 함
   - 아이템 목록·가격: site.config.ts 의 daily.game.items */

const slots = [
  { key: "hat", label: "모자" },
  { key: "acc", label: "소품" },
  { key: "bg", label: "배경" },
  { key: "frame", label: "테두리" },
];

function ItemPreview({ item }: { item: ShopItem }) {
  if (item.emoji) {
    return (
      <span className="text-4xl" aria-hidden>
        {item.emoji}
      </span>
    );
  }
  const look = itemLooks[item.id] ?? "";
  return (
    <span
      className={cn("relative isolate block size-11 rounded-full", item.slot === "bg" ? look : cn("bg-accent", look))}
      aria-hidden
    />
  );
}

export function ShopDialog({
  student,
  onClose,
}: {
  student: { photoUrl: string; emoji: string; name: string };
  onClose: () => void;
}) {
  const { shopTitle, notEnough, bought, items } = siteConfig.daily.game;
  const game = useGameState();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Esc 키로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handle(item: ShopItem) {
    const owned = game.owned.includes(item.id);
    if (!owned) {
      if (game.coins < item.price) {
        setMessage({ text: `${notEnough} (🪙 ${item.price - game.coins}개 더 필요)`, ok: false });
        return;
      }
      if (buyItem(item.id)) setMessage({ text: bought, ok: true });
      return;
    }
    const wearing = game.equipped[item.slot] === item.id;
    equipItem(item.slot, wearing ? null : item.id);
    setMessage(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/60 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={shopTitle}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pop-in flex max-h-[92svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl">
        {/* 위: 제목 + 닫기 */}
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <h2 className="text-lg font-bold">🛍️ {shopTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* 내 캐릭터 + 코인 */}
          <div className="flex flex-col items-center gap-3 bg-muted px-5 pb-5 pt-12">
            <GameAvatar photoUrl={student.photoUrl} emoji={student.emoji} name={student.name} size="lg" />
            <p className="rounded-full bg-card px-4 py-1.5 text-lg font-extrabold shadow-sm">
              🪙 <span className="text-gold">{game.coins}</span>
            </p>
            {message ? (
              <p className={cn("text-sm font-bold", message.ok ? "text-success" : "text-destructive")}>
                {message.text}
              </p>
            ) : null}
          </div>

          {/* 아이템 목록 */}
          <div className="grid gap-6 p-5">
            {slots.map((slot) => (
              <section key={slot.key}>
                <h3 className="mb-3 text-base font-bold">{slot.label}</h3>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {items
                    .filter((item) => item.slot === slot.key)
                    .map((item) => {
                      const owned = game.owned.includes(item.id);
                      const wearing = game.equipped[item.slot] === item.id;
                      const affordable = game.coins >= item.price;
                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center",
                            wearing && "border-primary ring-2 ring-primary",
                          )}
                        >
                          <div className="flex h-12 items-center justify-center">
                            <ItemPreview item={item} />
                          </div>
                          <p className="text-sm font-semibold">{item.label}</p>
                          <button
                            type="button"
                            onClick={() => handle(item)}
                            className={cn(
                              "h-9 w-full rounded-xl text-sm font-bold transition-colors",
                              wearing
                                ? "bg-primary text-primary-foreground"
                                : owned
                                  ? "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                                  : affordable
                                    ? "bg-gold text-foreground hover:opacity-90"
                                    : "bg-muted text-muted-foreground",
                            )}
                          >
                            {wearing ? "입는 중 ✔" : owned ? "입기" : `🪙 ${item.price}`}
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
