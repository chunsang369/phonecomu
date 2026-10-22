import type { Metadata } from 'next';
import AdSlot from '@/components/ads/ad-slot'
import SiteHeader from '@/components/layout/site-header'
import Footer from '@/components/ui/footer';
import PhoneFeeCalculator from '@/components/calculator/phone-fee-calculator';
import { getPlanCatalog } from '@/lib/calculator/smartchoice';

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? '커뮤니티';

// 스마트초이스 요금제 목록은 하루 단위로 갱신
export const revalidate = 86400;

export const metadata: Metadata = {
  title: `공시지원금 vs 선택약정 계산기 — 24개월 총비용 비교 | ${SITE}`,
  description:
    '휴대폰 개통 시 공시지원금과 선택약정(25% 요금할인) 중 무엇이 유리한지 24개월 총비용으로 비교합니다. SKT·KT·LG U+ 요금제(스마트초이스 기준), 할부이자, 전환·추가지원금, 요금제 유지 기간, 중도 해지 위약금까지 반영합니다.',
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
        text: '공시지원금은 잔여 약정기간에 비례한 지원금 반환금이, 선택약정은 그동안 받은 요금할인에 대한 할인반환금이 발생합니다. 두 위약금 구조가 다르므로 계산기의 중도 해지 항목에서 해지 시점별 예상 비용을 비교할 수 있습니다. 실제 금액은 통신사 위약금 조회로 확인해야 합니다.',
      },
    },
    {
        "@type": "Question",
        name: "선택약정을 선택해도 추가지원금을 받을 수 있나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "받을 수 있습니다. 2025년 7월 22일 단말기유통법이 폐지되면서 추가지원금 상한(공시지원금의 15%)이 없어졌고, 선택약정 25% 요금할인과 유통점 추가지원금을 함께 받는 것도 허용됐습니다. 지급 여부와 금액은 판매점 조건에 따라 다릅니다.",
        },
      },
      {
        "@type": "Question",
        name: "휴대폰 할부이자는 얼마인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "통신 3사는 단말기 할부원금에 연 5.9% 수준의 할부수수료를 원리금균등 방식으로 부과해 왔습니다. 할부원금 100만원을 24개월로 나누면 이자 합계는 약 6만2천원입니다. 일시불(완납)로 구매하면 이자가 없습니다.",
        },
      },
  ],
};

export default async function CalculatorPage() {
  const { plans, fetchedAt, error } = await getPlanCatalog().catch((e) => ({ plans: [], fetchedAt: new Date().toISOString(), error: (e as Error).message }));
  return (
    <div className="min-h-screen bg-[#F2F4F6] dark:bg-[#0B0F19] text-[#1E293B] dark:text-[#E2E8F0] font-sans antialiased flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div>
        <SiteHeader active="calculator" />

        {/* 메인 콘텐츠 바디 */}
        <main className="mx-auto max-w-[1440px] space-y-4 px-4 py-5 sm:px-5">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-[-0.5px] text-[#111] dark:text-white">
              휴대폰 요금계산기 <span className="text-[15px] font-bold text-[#888]">공시지원금 vs 선택약정</span>
            </h1>
            {/* 답변 우선(Answer-first) — 크롤러·답변엔진이 인용하는 결론 문단 */}
            <p className="mt-1 text-[13px] leading-relaxed text-[#666] dark:text-slate-400">
              <strong className="font-bold text-[#222] dark:text-white">
                받는 지원금이 24개월 요금할인 총액(월 요금의 25% × 24)보다 크면 공시지원금, 작으면 선택약정이 유리합니다.
              </strong>{" "}
              기기와 가입 조건을 고르면 SKT·KT·LG U+ 요금제별 월 청구액을 두 방식으로 나란히 비교합니다.
            </p>
          </div>

          <PhoneFeeCalculator plans={plans} plansFetchedAt={fetchedAt} plansError={error} />
          <AdSlot slot="calc-bottom" />
        </main>
      </div>

      <Footer />
    </div>
  );
}
