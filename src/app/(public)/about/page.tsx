import Link from 'next/link'
import SiteHeader from '@/components/layout/site-header'
import Footer from '@/components/ui/footer'
import JsonLd from '@/components/seo/json-ld'
import { abs, breadcrumbSchema, kstDate, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo/schema'
import { pageMeta } from '@/lib/seo/metadata'

const UPDATED = '2026-10-22'

export const metadata = pageMeta({
  title: `${SITE_NAME} 소개와 평가 기준 — 실구매가·약속 이행률 계산 방법`,
  description: `${SITE_NAME}가 무엇을 하는 곳인지, 성지 평가 점수·실구매가 환산·약속 이행률을 어떻게 계산하는지, 운영 원칙을 공개합니다.`,
  path: '/about',
})

const aboutLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  url: abs('/about'),
  name: `${SITE_NAME} 소개와 평가 기준`,
  description: SITE_DESCRIPTION,
  dateModified: kstDate(UPDATED),
  publisher: { '@id': `${abs('/')}#organization` },
  inLanguage: 'ko-KR',
}

const h2 = 'mt-10 text-[21px] font-bold text-black dark:text-white'
const p = 'mt-3 text-[16px] leading-[1.8] text-[#333] dark:text-slate-300'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#454545] dark:bg-[#0B0F19] dark:text-[#E2E8F0]">
      <JsonLd data={[aboutLd, breadcrumbSchema([{ name: '홈', path: '/' }, { name: '소개·평가 기준', path: '/about' }])]} />
      <SiteHeader />
      <main className="mx-auto max-w-[900px] px-4 py-5 sm:px-5">
        <article className="rounded-lg bg-white px-5 py-8 sm:px-10 dark:bg-[#111827]">
          <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-black dark:text-white">{SITE_NAME} 소개와 평가 기준</h1>
          <p data-seo="answer" className="mt-6 text-[17px] font-medium leading-[1.8] text-black dark:text-white">
            {SITE_NAME}는 휴대폰 성지(공시지원금·추가지원금 조건이 좋은 판매점)에서 실제로 개통한 조건을 구매자가 직접 남기고, 그 조건을 같은 기준의 실구매가로 환산해
            비교하는 휴대폰 정보 커뮤니티입니다.
          </p>

          <h2 className={h2}>왜 시세표가 아니라 실구매가로 비교하나요?</h2>
          <p className={p}>
            시세표에는 보통 기기값만 적혀 있고, 고가 요금제 유지 기간·부가서비스·제휴카드 같은 조건은 빠져 있습니다. 그래서 기기값이 같아도 실제로 내는 돈은 수십만 원씩
            달라질 수 있습니다. {SITE_NAME}는 후기마다 아래 식으로 실구매가를 계산해 조건이 다른 매장도 같은 기준으로 비교합니다.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px] leading-[1.7] text-[#333] dark:text-slate-300">
            <li>기기 실부담 = 현금완납가, 또는 할부원금 + 할부이자(연 5.9%, 원리금균등 가정)</li>
            <li>숨은 조건 비용 = (가입 요금제 − 유지 후 쓸 요금제) × 유지 개월 + 부가서비스 월 합계 × 유지 개월 (선택약정이면 요금 25% 할인 반영)</li>
            <li>실구매가 환산 = 기기 실부담 + 숨은 조건 비용</li>
          </ul>

          <h2 className={h2}>성지 평점과 약속 이행률은 어떻게 계산하나요?</h2>
          <p className={p}>
            평점은 구매자가 매긴 가격·응대·약속 이행 3개 항목(각 1~5점)의 평균입니다. 순위는 후기가 적은 매장의 점수가 튀지 않도록 (평균 × 후기 수 + 3점 × 2) ÷ (후기 수 + 2)로
            보정해 정렬합니다. 약속 이행률은 &lsquo;안내받은 조건대로 진행&rsquo;을 선택한 후기의 비율이며, &lsquo;현장에서 조건 변경&rsquo; 후기는 따로 집계해 표시합니다.
          </p>

          <h2 className={h2}>요금제·출고가 정보는 어디서 가져오나요?</h2>
          <p className={p}>
            통신 3사 요금제는 한국통신사업자연합회가 운영하는 스마트초이스 Open API에서 하루 한 번 받아옵니다. 단말기 출고가는 운영팀이 기준일을 표시해 관리하며, 공시지원금은
            통신사·요금제·가입유형·날짜마다 달라 사용자가 통신사 공시 금액을 직접 입력하도록 했습니다.
          </p>

          <h2 className={h2}>후기 작성 원칙</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px] leading-[1.7] text-[#333] dark:text-slate-300">
            <li>매장은 지역과 별칭으로만 구분합니다. 매장 실명·전화번호·주소·오픈채팅 링크는 받지 않습니다.</li>
            <li>같은 매장에 대한 후기는 한 사람이 30일에 한 번만 쓸 수 있습니다.</li>
            <li>후기는 계약서·청구서 기준의 실제 조건을 적도록 안내합니다.</li>
          </ul>

          <h2 className={h2}>바로가기</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ['/seongji', '성지 평가'],
              ['/calculator', '공시지원금 vs 선택약정 계산기'],
              ['/guide', '휴대폰 구매 가이드'],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-lg border border-[#DDD] px-4 py-2 text-[14px] font-bold text-[#333] hover:border-[#5707EB] hover:text-[#5707EB] dark:border-slate-700 dark:text-slate-200">
                {label}
              </Link>
            ))}
          </div>

          <p data-seo="byline" className="mt-10 text-[13px] text-[#999]">
            작성: {SITE_NAME} 운영팀 · 최종 수정 <time data-seo="modified" dateTime={UPDATED}>{UPDATED}</time>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}
