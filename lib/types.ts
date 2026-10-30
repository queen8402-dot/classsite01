/** 과목 카드 한 개 (국어·수학·영어·과학) */
export type SubjectCard = {
  label: string;
  caption: string;
  emoji: string;
  /** 누르면 새 탭으로 열릴 주소. 비어 있으면 눌러도 아무 일 없음 */
  href: string;
};

/** 관리자 페이지(첫 화면 꾸미기)에서 수정하는 데일리 학습 첫 화면 글자.
    저장 위치: supabase/schema.sql 의 site_content 표 (key = 'daily') */
export type DailyText = {
  studentName: string;
  studentGrade: string;
  studentAvatar: string;
  subjectsTitle: string;
  subjects: SubjectCard[];
  titleBefore: string;
  titleHighlight: string;
  titleAfter: string;
};

/** 관리자 페이지에서 수정할 수 있는 히어로 글자. 저장 위치: supabase/schema.sql 의 site_content 표 (key = 'hero') */
export type HeroText = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
};

/** 관리자 페이지에서 관리하는 카드(항목) 한 개의 모양. supabase/schema.sql 의 items 테이블과 같습니다. */
export type Item = {
  id: string;
  /** 어느 섹션에 속하는지 (예: "features") */
  section: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  /** 작은 숫자가 먼저 보임 */
  sort_order: number;
  /** false 면 사이트에서 숨김 */
  is_visible: boolean;
  created_at: string;
};
