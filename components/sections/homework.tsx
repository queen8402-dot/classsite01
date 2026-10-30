import { getItems } from "@/lib/data";
import { HomeworkCards } from "@/components/sections/homework-cards";

/* 오늘의 숙제 섹션.
   - 카드 목록: 관리자 페이지(/admin → 오늘의 숙제)에서 관리
     (제목, 설명, 그림, 누르면 이동할 주소, 순서)
   - Supabase 연결 전에는 site.config.ts 의 예시 숙제가 보임 */
export async function Homework() {
  const items = await getItems("homework");
  return <HomeworkCards items={items} />;
}
