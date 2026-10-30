import { getDailyText, getItems } from "@/lib/data";
import { Container } from "@/components/layout/container";
import { DailySidebar } from "@/components/sections/daily-sidebar";
import { DailyHeader } from "@/components/sections/daily-header";
import { SubjectCards } from "@/components/sections/subject-cards";
import { HomeworkCards } from "@/components/sections/homework-cards";

/* 메인 페이지 = 데일리 학습 화면 (왼쪽 메뉴 + 오늘 날짜·날씨·시계/제목 + 과목 카드 + 오늘의 숙제 카드)
   - 학생 정보·과목 카드·큰 제목: 관리자 페이지(/admin → 첫 화면 꾸미기)
     (저장한 글자가 없으면 site.config.ts 의 daily 글자가 보임)
   - 숙제 카드: 관리자 페이지(/admin → 오늘의 숙제)

   예전 화면(히어로·소개·기능·연락처)으로 되돌리려면 아래 HomePage 를 이것으로 바꾸세요.
   (파일은 components/sections, components/layout 에 그대로 남아 있습니다)

     <Navbar />
     <main className="flex-1">
       <Hero />
       <About />
       <Features />
       <Contact />
     </main>
     <Footer /> */

// 관리자 페이지에서 내용을 바꾸면 최대 60초 안에 반영 (저장 즉시 반영도 되어 있음)
export const revalidate = 60;

export default async function HomePage() {
  const [daily, homework] = await Promise.all([getDailyText(), getItems("homework")]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <DailySidebar student={daily} />
      <main className="flex-1">
        <Container className="grid gap-8 py-8 sm:py-12">
          <DailyHeader title={daily} homework={homework} subjects={daily.subjects} />
          <SubjectCards subjectsTitle={daily.subjectsTitle} subjects={daily.subjects} />
          <HomeworkCards items={homework} />
        </Container>
      </main>
    </div>
  );
}
