import { sampleItems, siteConfig } from "@/site.config";
import { getPublicClient } from "@/lib/supabase";
import type { HeroText, Item } from "@/lib/types";

/** site.config.ts 에 적힌 히어로 글자 (기본값) */
export const defaultHeroText: HeroText = {
  eyebrow: siteConfig.hero.eyebrow,
  title: siteConfig.hero.title,
  description: siteConfig.hero.description,
  primaryLabel: siteConfig.hero.primaryCta.label,
  secondaryLabel: siteConfig.hero.secondaryCta.label,
};

/**
 * 히어로 글자를 가져옵니다.
 * - 관리자 페이지에서 저장한 글자가 있으면 그것을, 없거나 비어 있으면 site.config.ts 의 글자를 씀
 */
export async function getHeroText(): Promise<HeroText> {
  const supabase = getPublicClient();
  if (!supabase) return defaultHeroText;

  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("key", "hero")
    .maybeSingle();

  if (error) {
    console.error("[getHeroText] Supabase 읽기 실패:", error.message);
    return defaultHeroText;
  }

  const saved = (data?.data ?? {}) as Partial<HeroText>;
  const pick = (k: keyof HeroText) =>
    typeof saved[k] === "string" && saved[k].trim() ? saved[k] : defaultHeroText[k];

  return {
    eyebrow: pick("eyebrow"),
    title: pick("title"),
    description: pick("description"),
    primaryLabel: pick("primaryLabel"),
    secondaryLabel: pick("secondaryLabel"),
  };
}

/**
 * 특정 섹션의 카드 목록을 가져옵니다.
 * - Supabase가 연결 안 됐으면: site.config.ts 의 예시 카드를 보여줌
 * - 연결됐으면: 데이터베이스에서 '보이기'로 설정된 카드만 순서대로 가져옴
 */
export async function getItems(section: string): Promise<Item[]> {
  const supabase = getPublicClient();
  const samples = sampleItems.filter((item) => item.section === section);
  if (!supabase) return samples;

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("section", section)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getItems] Supabase 읽기 실패:", error.message);
    return samples;
  }
  return (data ?? []) as Item[];
}
