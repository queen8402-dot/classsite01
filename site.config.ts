/* ==========================================================================
   ★ 사이트 내용 설정 파일
   --------------------------------------------------------------------------
   사이트에 보이는 글자(이름, 소개, 메뉴, 연락처 등)는 대부분 여기에 있습니다.
   따옴표 " " 안의 글자만 바꾸고 저장하면 화면에 바로 반영됩니다.
   (따옴표, 쉼표, 중괄호 { } 는 지우지 않도록 조심!)
   ========================================================================== */

import type { Item } from "@/lib/types";

export const siteConfig = {
  /* 브라우저 탭 제목과 검색 결과에 보이는 정보 */
  name: "My Studio",
  title: "My Studio — 나의 첫 웹사이트",
  description: "바이브 코딩으로 만든 나의 웹사이트입니다.",

  /* 상단 메뉴 (href 의 #이름 은 아래 섹션의 id 와 같아야 해당 위치로 이동) */
  nav: [
    { label: "소개", href: "#about" },
    { label: "기능", href: "#features" },
    { label: "연락처", href: "#contact" },
  ],
  /* 상단 메뉴 오른쪽 버튼 — 누르면 새 탭에서 관리자 페이지(/admin)가 열림 */
  secretButton: { label: "비밀버튼", href: "/admin" },

  /* 데일리 학습 첫 화면 */
  daily: {
    /* 왼쪽 메뉴 위 학생 정보 (avatar 는 그림 대신 쓰는 이모지) */
    student: { name: "유플", grade: "초등 1", avatar: "🐻" },
    /* 왼쪽 메뉴 — ready: false 면 누를 때 '준비 중이에요' 표시 */
    menu: [
      { label: "홈", ready: true },
      { label: "나의 공부계획", ready: false },
      { label: "내가 공부한 시간", ready: false },
    ],
    /* 맨 위 과목 카드 — href 에 주소를 넣으면 누를 때 열림 (비어 있으면 눌러도 아무 일 없음)
       유튜브 주소면 사이트 안에서 영상 창이 열리고, 끝까지 보면 카드에 도장이 찍힘
       (다른 주소는 새 탭으로 열림)
       caption = 카드 왼쪽 위 작은 글자, emoji = 그림 대신 쓰는 이모지 */
    subjectsTitle: "과목별로 공부해요",
    subjects: [
      { label: "국어", caption: "글 읽고 쓰기", emoji: "📖", href: "" },
      {
        label: "수학",
        caption: "셈하고 생각하기",
        emoji: "🔢",
        href: "https://www.youtube.com/watch?v=RPP_aqgldkY&list=PLbvP5Vlaaw6UKKdioifLNKZznZcElKM7z",
      },
      { label: "영어", caption: "듣고 따라 말하기", emoji: "🔤", href: "" },
      { label: "과학", caption: "궁금한 것 실험하기", emoji: "🔬", href: "" },
    ],
    /* 큰 제목: 앞 글자 + [분홍 칸: 강조 글자 + 남은 개수] + 뒤 글자
       예) 오늘의 [할일 3개 >] 를 해봐요.  /  다 하면 allDoneTitle 문장으로 바뀜 */
    title: { before: "오늘의", highlight: "할일", after: "를 해봐요." },
    allDoneTitle: "오늘 할일을 모두 끝냈어요! 🎉",
    /* 날짜 옆 날씨 — 이 위치의 날씨를 보여줌 (Open-Meteo 무료 날씨 정보) */
    weather: { city: "서울", latitude: 37.5665, longitude: 126.978 },
    doneButton: "다 했어요",
    undoButton: "다시 하기",
    allDone: "오늘 숙제 끝! 정말 잘했어요 🎉",
    empty: "아직 오늘의 숙제가 없어요. 선생님이 곧 올려 주실 거예요!",
    /* 과목 영상 창 글자 */
    video: {
      stamp: "다 봤어요!",
      hint: "영상을 끝까지 보면 도장을 받아요 🌟",
      complete: "끝까지 다 봤어요! 도장 쾅! 🎉",
      skipped: "건너뛴 부분이 있어요. 처음부터 끝까지 보면 도장을 받을 수 있어요.",
      close: "닫기",
    },
  },

  /* 첫 화면(히어로) */
  hero: {
    eyebrow: "Hello, World",
    title: "생각을 바로\n화면으로 만듭니다",
    description:
      "이 문장을 바꿔 나를 소개해 보세요. site.config.ts 파일에서 글자만 바꾸면 여기가 바뀝니다.",
    primaryCta: { label: "더 알아보기", href: "#features" },
    secondaryCta: { label: "연락하기", href: "#contact" },
  },

  /* 소개 섹션 */
  about: {
    eyebrow: "About",
    title: "소개",
    paragraphs: [
      "여기에 나 또는 우리 팀, 가게, 프로젝트에 대한 소개를 적습니다.",
      "두 번째 문단도 필요하면 이렇게 줄을 추가하면 됩니다.",
    ],
  },

  /* 기능(항목) 섹션의 제목 — 카드 목록 자체는 관리자 페이지(/admin)에서 관리 */
  features: {
    eyebrow: "Features",
    title: "기능",
    description: "관리자 페이지에서 카드를 추가·수정·삭제할 수 있는 영역입니다.",
  },

  /* 연락처 섹션 */
  contact: {
    eyebrow: "Contact",
    title: "함께 이야기해요",
    description: "궁금한 점이 있다면 언제든 연락 주세요.",
    email: "hello@example.com",
    links: [
      { label: "Instagram", href: "https://instagram.com" },
      { label: "GitHub", href: "https://github.com" },
    ],
  },

  /* 맨 아래(푸터) */
  footer: {
    copyright: "© 2026 My Studio. All rights reserved.",
  },

  /* 관리자 페이지에서 관리할 섹션 목록.
     key  = 데이터베이스에 저장되는 이름(영문 소문자),
     label = 관리자 화면에 보이는 이름.
     예) 포트폴리오라면 { key: "works", label: "작업물" } 을 추가 */
  adminSections: [
    { key: "homework", label: "오늘의 숙제" },
    { key: "features", label: "기능" },
  ],
};

/* Supabase를 아직 연결하지 않았을 때 대신 보여줄 예시 카드.
   Supabase를 연결하면 이 내용 대신 관리자 페이지에서 등록한 카드가 보입니다. */
export const sampleItems: Item[] = [
  {
    id: "sample-homework-1",
    section: "homework",
    title: "수학 익힘책",
    description: "덧셈 문제 10개 풀기",
    image_url: null,
    link_url: null,
    sort_order: 1,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "sample-homework-2",
    section: "homework",
    title: "받아쓰기 연습",
    description: "3단원 낱말 소리 내어 읽기",
    image_url: null,
    link_url: null,
    sort_order: 2,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "sample-homework-3",
    section: "homework",
    title: "영어 동화 듣기",
    description: "동화 한 편 듣고 따라 말하기",
    image_url: null,
    link_url: null,
    sort_order: 3,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "sample-homework-4",
    section: "homework",
    title: "독서 기록",
    description: "책 읽고 한 줄 느낌 쓰기",
    image_url: null,
    link_url: null,
    sort_order: 4,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "sample-1",
    section: "features",
    title: "첫 번째 기능",
    description: "카드 하나에 제목, 설명, 이미지, 링크를 넣을 수 있어요.",
    image_url: null,
    link_url: null,
    sort_order: 1,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "sample-2",
    section: "features",
    title: "두 번째 기능",
    description: "관리자 페이지에서 순서를 바꾸거나 숨길 수도 있어요.",
    image_url: null,
    link_url: null,
    sort_order: 2,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "sample-3",
    section: "features",
    title: "세 번째 기능",
    description: "포트폴리오라면 작업물, 가게라면 메뉴처럼 자유롭게 쓰세요.",
    image_url: null,
    link_url: null,
    sort_order: 3,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];
