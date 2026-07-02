import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/ui/footer';
import SubsidyCalculator from '@/components/calculator/subsidy-calculator';
import { Smartphone, Calculator, ChevronRight } from 'lucide-react';

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? '커뮤니티';

export const metadata: Metadata = {
  title: `공시지원금 vs 선택약정 계산기 — 24개월 총비용 비교 | ${SITE}`,
  description:
    '휴대폰 개통 시 공시지원금 and 선택약정(25% 요금할인) 중 무엇이 유리한지 24개월 총비용으로 비교합니다. 판정 기준: 받는 지원금 총액 vs 요금 총납부액의 25%. 요금제 유지 의무 기간(6개월)까지 반영한 정확한 계산.',
  alternates: { canonical: '/calculator' },
  openGraph: {
    title: `공시지원금 vs 선택약정 계산기 | ${SITE}`,
    description: '지원금 총액 vs 요금할인 총액 — 24개월 총비용으로 판정하는 개통 방식 계산기',
    type: 'website',
  },
};

// AEO: FAQPage 구조화 데이터 — 답변 우선(Answer-first) 서술
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '공시지원금과 선택약정 중 무엇이 유리한가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '받는 지원금 총액(공시지원금+추가지원금)이 24개월 요금 총납부액의 25%보다 크면 공시지원금이, 작으면 선택약정이 유리합니다. 고가 요금제를 오래 유지할수록 요금할인 총액이 커져 선택약정이 유리해지고, 지원금이 큰 기기·저가 요금제일수록 공시지원금이 유리합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '요금제 유지 의무 6개월은 계산에 어떤 영향을 주나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '지원금이나 판매 조건에 따라 가입 후 약 6개월간 고가 요금제를 유지해야 하는 경우가 많습니다. 이 기간의 높은 요금과 이후 하향한 요금을 합산한 24개월 요금 궤적을 기준으로 두 방식을 비교해야 정확합니다. 선택약정은 요금이 높을수록 25% 할인액도 커지므로, 유지 기간이 길고 요금이 높을수록 선택약정 쪽 총비용이 상대적으로 줄어듭니다.',
      },
    },
    {
      '@type': 'Question',
      name: '중도 해지하면 어떻게 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '공시지원금은 잔여 약정기간에 비례한 지원금 반환금이, 선택약정은 그동안 받은 요금할인에 대한 할인반환금이 발생합니다. 두 위약금 구조가 다르므로 중도 해지 가능성이 크다면 별도 확인이 필요합니다. 본 계산기는 24개월 완주를 가정합니다.',
      },
    },
  ],
};

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0B0F19] text-[#1E293B] dark:text-[#E2E8F0] font-sans antialiased flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div>
        {/* GNB 탑 바 */}
        <div className="bg-[#2D2F34] text-[#B0B3B8] text-xs font-bold py-2 px-4 dark:bg-[#111317]">
          <div className="mx-auto max-w-7xl flex items-center gap-6 overflow-x-auto">
            <Link href="/" className="text-white font-extrabold pr-4 border-r border-slate-600">폰커뮤니티</Link>
            <Link href="/board/info" className="hover:text-white transition">정보게시판</Link>
            <Link href="/board/free" className="hover:text-white transition">자유게시판</Link>
            <Link href="/board/anonymous" className="hover:text-white transition">익명게시판</Link>
            <Link href="/board/coordinate" className="hover:text-white transition">지역별 시세표</Link>
            <Link href="/board/qna" className="hover:text-white transition">질문/답변게시판</Link>
          </div>
        </div>

        {/* 2단 프리미엄 헤더 */}
        <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white shadow-sm dark:bg-[#111827] dark:border-[#1F2937]">
          <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 max-w-7xl">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xl font-black text-[#1A1D24] dark:text-[#F3F4F6] tracking-tight flex items-center gap-1.5">
                <Smartphone className="h-5 w-5 text-[#7C3AED]" />
                <span>폰커뮤니티</span>
              </Link>
              <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
              <span className="text-sm font-bold text-[#7C3AED] dark:text-[#A78BFA] flex items-center gap-1">
                <Calculator className="h-4 w-4" />
                공시지원금 vs 선택약정 계산기
              </span>
            </div>
            <Link href="/" className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition">
              홈으로 돌아가기
            </Link>
          </div>
        </header>

        {/* 메인 콘텐츠 바디 */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1A1D24] dark:text-white tracking-tight">
              공시지원금 vs 선택약정 계산기
            </h1>

            {/* 답변 우선(Answer-first) — 크롤러·답변엔진이 인용하는 결론 문단 */}
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-[1.6]">
              <strong className="text-slate-800 dark:text-white font-extrabold">
                받는 지원금 총액이 24개월 요금 총납부액의 25%보다 크면 공시지원금, 작으면
                선택약정이 유리합니다.
              </strong>{' '}<br className="hidden sm:block" />
              기기·요금제·유지 의무 기간(보통 6개월)을 입력하면 두 방식의 24개월 총비용을
              비교해 어느 쪽이 얼마나 유리한지 계산합니다.
            </p>
          </div>

          <div className="mt-8">
            <SubsidyCalculator />
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
