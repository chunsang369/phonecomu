import Link from 'next/link'
import { ChevronRight, Calculator, Store } from 'lucide-react'
import SiteHeader from '@/components/layout/site-header'
import Footer from '@/components/ui/footer'
import AdSlot from '@/components/ads/ad-slot'
import JsonLd from '@/components/seo/json-ld'
import { GUIDES } from '@/lib/guides/content'
import { abs, breadcrumbSchema, itemListSchema, kstDate, SITE_NAME } from '@/lib/seo/schema'
import { pageMeta } from '@/lib/seo/metadata'

const TITLE = '휴대폰 구매 가이드: 휴대폰 성지·핸드폰 싸게 사는 법 총정리'
const DESCRIPTION =
  '휴대폰 성지(핸드폰 성지)를 고르는 법, 공시지원금과 선택약정 비교, 번호이동·기기변경 선택, 성지 낚시 피하는 법, 개통 전 계약서 체크리스트까지 휴대폰을 싸게 사는 데 필요한 내용을 순서대로 정리했습니다.'
const UPDATED = GUIDES.map((g) => g.dateModified).sort().at(-1)!

export const metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: '/guide' })

/** 읽는 순서 — 처음 사는 사람 기준 */
const ORDER = ['buy-phone-cheap', 'what-is-seongji', 'subsidy-vs-selective', 'number-port-vs-change', 'avoid-bait', 'contract-checklist', 'glossary']

export default function GuideHubPage() {
  const guides = ORDER.map((s) => GUIDES.find((g) => g.slug === s)).filter((g): g is (typeof GUIDES)[number] => !!g)
  const ld = [
    {
      '@type': 'CollectionPage',
      '@id': `${abs('/guide')}#page`,
      url: abs('/guide'),
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: 'ko-KR',
      dateModified: kstDate(UPDATED),
      isPartOf: { '@id': `${abs('/')}#website` },
    },
    itemListSchema(
      '휴대폰 구매 가이드',
      guides.map((g) => ({ name: g.title, path: `/guide/${g.slug}` })),
    ),
    breadcrumbSchema([
      { name: '홈', path: '/' },
      { name: '휴대폰 구매 가이드', path: '/guide' },
    ]),
  ]

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#454545] dark:bg-[#0B0F19] dark:text-[#E2E8F0]">
      <JsonLd data={ld} />
      <SiteHeader active="guide" />
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0 rounded-lg bg-white px-5 py-7 sm:px-10 sm:py-10 dark:bg-[#111827]">
          <nav aria-label="현재 위치" className="text-[13px] text-[#999]">
            <Link href="/" className="hover:text-[#5707EB]">{SITE_NAME} 홈</Link> <ChevronRight className="inline h-3 w-3" /> 휴대폰 구매 가이드
          </nav>
          <h1 className="mt-3 text-[26px] font-extrabold leading-snug tracking-[-0.5px] text-black sm:text-[30px] dark:text-white">{TITLE}</h1>
          <p data-seo="answer" className="mt-5 rounded-xl border-l-4 border-[#5707EB] bg-[#F7F8FA] px-5 py-4 text-[17px] font-medium leading-[1.75] text-black dark:bg-slate-800/60 dark:text-white">
            휴대폰을 싸게 사려면 기기값이 아니라 &ldquo;24개월 동안 실제로 내는 총액&rdquo;으로 비교해야 합니다. 공시지원금과 선택약정(요금 25% 할인) 중 유리한 쪽을 먼저 계산하고, 휴대폰 성지 조건은 요금제 유지·부가서비스·카드 조건까지 더한 실구매가로 비교한 뒤, 개통 전에 계약서로 조건을 확인하세요.
          </p>
          <section data-seo="conditions" className="mt-2 text-[13px] text-[#888]">
            내용 기준일 <time dateTime={UPDATED}>{UPDATED}</time> · 통신사 지원금·요금은 시점마다 바뀌므로 개통 전 통신사 공시와 계약서로 다시 확인하세요.
          </section>

          <section className="mt-10">
            <h2 className="text-[21px] font-bold text-black dark:text-white">어떤 순서로 읽으면 되나요?</h2>
            <p className="mt-3 text-[16px] font-medium leading-[1.8] text-black dark:text-slate-100">
              처음 사는 경우 &ldquo;싸게 사는 법 7단계&rdquo;부터 읽고, 성지의 뜻 → 지원금 방식 선택 → 가입 유형 선택 → 낚시 구별 → 계약서 확인 순서로 보면 됩니다. 모르는 단어는 용어사전에서 찾으세요.
            </p>
            <ol className="mt-5 space-y-3">
              {guides.map((g, i) => (
                <li key={g.slug}>
                  <Link
                    href={`/guide/${g.slug}`}
                    className="group flex gap-4 rounded-lg border border-[#EEE] px-5 py-4 hover:border-[#5707EB] dark:border-slate-800"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3EEFF] text-[14px] font-bold text-[#5707EB] dark:bg-[#2A1366] dark:text-[#C4B5FD]">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block text-[17px] font-bold text-black group-hover:text-[#5707EB] dark:text-white">{g.title}</span>
                      <span className="mt-1 block text-[14px] leading-relaxed text-[#666] dark:text-slate-400">{g.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-10">
            <h2 className="text-[21px] font-bold text-black dark:text-white">직접 계산하거나 성지 후기를 보려면?</h2>
            <p className="mt-3 text-[16px] font-medium leading-[1.8] text-black dark:text-slate-100">
              내 요금제 기준 총비용은 요금계산기로, 실제 개통한 사람들의 조건은 성지 평가에서 확인할 수 있습니다.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href="/calculator" className="flex items-center gap-3 rounded-lg bg-[#5707EB] px-5 py-4 text-[15px] font-bold text-white hover:bg-[#4E07D2]">
                <Calculator className="h-5 w-5" /> 공시지원금 vs 선택약정 계산기
              </Link>
              <Link href="/seongji" className="flex items-center gap-3 rounded-lg border border-[#5707EB] px-5 py-4 text-[15px] font-bold text-[#5707EB] hover:bg-[#F7F3FF] dark:text-[#C4B5FD] dark:hover:bg-[#2A1366]/40">
                <Store className="h-5 w-5" /> 지역별 성지 평가·실구매가
              </Link>
            </div>
          </section>

          <p data-seo="byline" className="mt-10 text-[13px] text-[#999]">
            작성·검수: <Link href="/about" className="underline hover:text-[#5707EB]">{SITE_NAME} 운영팀</Link> · 최종 수정{' '}
            <time data-seo="modified" dateTime={UPDATED}>{UPDATED}</time>
          </p>
        </article>
        <aside className="space-y-5">
          <AdSlot slot="board-side" />
        </aside>
      </main>
      <Footer />
    </div>
  )
}
