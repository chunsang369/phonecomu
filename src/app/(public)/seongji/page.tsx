import type { Metadata } from 'next'
import Link from 'next/link'
import { SquarePen, ShieldCheck, TriangleAlert, MapPin, ChevronRight } from 'lucide-react'
import SiteHeader from '@/components/layout/site-header'
import Footer from '@/components/ui/footer'
import AdSlot from '@/components/ads/ad-slot'
import ProfileCard from '@/components/home/profile-card'
import ReviewCard, { Score } from '@/components/seongji/review-card'
import { getDevicePriceBoard, getRecentReviews, listStores, type StoreSort } from '@/lib/queries/seongji'
import { REGIONS } from '@/lib/seongji/cost'

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? '성지평가제'
const KRW = (n: number) => new Intl.NumberFormat('ko-KR').format(n)

export const metadata: Metadata = {
  title: `휴대폰 성지 평가 — 지역별 성지 후기·약속 이행률·실구매가 | ${SITE}`,
  description:
    '실제 개통 조건(할부원금·요금제 유지·부가서비스·카드 조건)으로 계산한 실구매가와 약속 이행 여부로 휴대폰 성지를 비교합니다. 시세표 기기값만으로는 알 수 없는 숨은 조건 비용까지 확인하세요.',
  alternates: { canonical: '/seongji' },
}

// AEO: 답변 우선 FAQ
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '휴대폰 성지 시세표만 보고 가면 안 되는 이유는?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '시세표에는 보통 기기값만 적혀 있고, 고가 요금제 유지 기간·부가서비스·제휴카드 같은 조건은 빠져 있습니다. 같은 기기값이라도 요금제를 6개월 더 비싸게 쓰거나 부가서비스를 붙이면 실제 부담이 수십만 원 달라집니다. 실구매가 = 기기 실부담 + (가입 요금제 − 유지 후 요금제) × 유지 개월 + 부가서비스 비용으로 비교해야 합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '성지에서 말한 조건과 실제 계약이 다르면 어떻게 확인하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '계약서의 할부원금, 요금제와 유지 기간, 부가서비스 목록, 제휴카드 조건을 안내받은 내용과 대조하세요. 할부원금이 안내보다 높거나 설명 없던 부가서비스·카드 조건이 붙으면 현장에서 조건이 바뀐 것입니다. 이 사이트의 성지 평가는 이런 경우를 "현장에서 조건 변경"으로 따로 집계합니다.',
      },
    },
  ],
}

const SORTS: [StoreSort, string][] = [
  ['score', '평점순'],
  ['reviews', '후기 많은 순'],
  ['recent', '최근 후기순'],
]

export default async function SeongjiPage({ searchParams }: { searchParams: Promise<{ region?: string; sort?: string }> }) {
  const sp = await searchParams
  const region = (REGIONS as readonly string[]).includes(sp.region ?? '') ? sp.region : undefined
  const sort: StoreSort = sp.sort === 'reviews' || sp.sort === 'recent' ? sp.sort : 'score'

  const [stores, recent, priceBoard] = await Promise.all([listStores(region, sort), getRecentReviews(8, region), getDevicePriceBoard(region)])
  const qs = (o: { region?: string; sort?: string }) => {
    const p = new URLSearchParams()
    if (o.region) p.set('region', o.region)
    if (o.sort && o.sort !== 'score') p.set('sort', o.sort)
    const s = p.toString()
    return s ? `/seongji?${s}` : '/seongji'
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#454545] dark:bg-[#0B0F19] dark:text-[#E2E8F0]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <SiteHeader active="seongji" writeSlug="review" />

      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* 소개 + 답변 우선 문단 */}
          <section className="rounded-lg bg-white px-5 py-6 sm:px-[30px] dark:bg-[#111827]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-bold tracking-[-0.5px] text-black dark:text-white">성지 평가</h1>
                <p className="mt-1 max-w-[640px] text-[14px] leading-relaxed text-[#666] dark:text-slate-400">
                  <strong className="text-black dark:text-white">시세표의 기기값이 아니라, 실제 계약 조건으로 계산한 실구매가와 약속 이행 여부로 성지를 비교합니다.</strong>{' '}
                  요금제 유지·부가서비스·카드 조건까지 넣어 환산하므로 조건이 달라도 같은 기준으로 볼 수 있습니다.
                </p>
              </div>
              <Link href="/seongji/write" className="flex h-11 items-center gap-1.5 rounded-lg bg-[#5707EB] px-5 text-[15px] font-bold text-white hover:bg-[#4E07D2]">
                <SquarePen className="h-4 w-4" /> 구매 후기로 평가하기
              </Link>
            </div>

            {/* 지역 */}
            <nav aria-label="지역" className="mt-5 flex flex-wrap gap-2">
              <Link
                href={qs({ sort })}
                className={`flex h-9 items-center rounded-full px-4 text-[14px] ${!region ? 'bg-black font-bold text-white dark:bg-white dark:text-black' : 'border border-[#DDD] text-[#666] dark:border-slate-700 dark:text-slate-300'}`}
              >
                전국
              </Link>
              {REGIONS.map((r) => (
                <Link
                  key={r}
                  href={qs({ region: r, sort })}
                  className={`flex h-9 items-center rounded-full px-4 text-[14px] ${region === r ? 'bg-black font-bold text-white dark:bg-white dark:text-black' : 'border border-[#DDD] text-[#666] hover:border-[#999] dark:border-slate-700 dark:text-slate-300'}`}
                >
                  {r}
                </Link>
              ))}
            </nav>
          </section>

          {/* 지역별 진짜성지 게시판 이동 */}
          <Link
            href="/board/coordinate"
            className="group flex items-center gap-3 rounded-lg bg-[#5707EB] px-5 py-4 text-white transition hover:bg-[#4E07D2] sm:gap-4 sm:px-[30px] sm:py-5 dark:bg-[#4E07D2]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <MapPin className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold sm:text-[18px]">지역별 진짜 휴대폰 성지를 만나고 싶다면?</span>
              <span className="mt-0.5 block truncate text-[13px] text-white/75">지역별 진짜성지 게시판에서 동네 성지 정보와 개통 조건을 확인하세요</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-2 text-[14px] font-bold text-[#5707EB] sm:px-4">
              <span className="hidden sm:inline">바로가기</span>
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>

          {/* 성지 순위 */}
          <section className="rounded-lg bg-white px-5 py-6 sm:px-[30px] dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-black dark:text-white">{region ?? '전국'} 성지 {stores.length}곳</h2>
              <div className="flex gap-3 text-[13px]">
                {SORTS.map(([v, t]) => (
                  <Link key={v} href={qs({ region, sort: v })} className={sort === v ? 'font-bold text-black dark:text-white' : 'text-[#999] hover:text-[#666]'}>
                    {t}
                  </Link>
                ))}
              </div>
            </div>
            {stores.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-[15px] text-[#888]">아직 평가된 성지가 없습니다.</p>
                <Link href="/seongji/write" className="mt-3 inline-block text-[14px] font-bold text-[#5707EB] hover:underline">
                  첫 구매 후기를 남겨 주세요 →
                </Link>
              </div>
            ) : (
              <ul className="mt-3 border-t border-[#E5E5E5] dark:border-slate-800">
                {stores.map((s, i) => (
                  <li key={s.id}>
                    <Link href={`/seongji/${s.id}`} className="flex min-h-[64px] items-center gap-3 border-b border-[#F0F1F3] py-3 hover:bg-[#FAFAFB] dark:border-slate-800 dark:hover:bg-slate-900/40">
                      <span className={`w-6 shrink-0 text-center text-[15px] font-bold ${i < 3 && sort === 'score' ? 'text-[#5707EB]' : 'text-[#BBB]'}`}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-bold text-black dark:text-white">{s.alias}</p>
                        <p className="truncate text-[13px] text-[#999]">
                          {s.region} {s.district}
                          {s.latest_device && ` · 최근 ${s.latest_device} 실구매가 ${KRW(s.latest_real_price ?? 0)}원`}
                        </p>
                      </div>
                      <div className="hidden w-[110px] shrink-0 text-right text-[12px] sm:block">
                        <p className="text-[#999]">약속 이행률</p>
                        <p className={`text-[15px] font-extrabold tabular-nums ${s.kept_rate != null && s.kept_rate < 0.7 ? 'text-rose-500' : 'text-[#047857]'}`}>
                          {s.kept_rate == null ? '-' : `${Math.round(s.kept_rate * 100)}%`}
                        </p>
                      </div>
                      <div className="w-[86px] shrink-0 text-right">
                        <Score value={s.avg_total} />
                        <p className="text-[12px] text-[#999]">후기 {s.review_count}</p>
                      </div>
                      {s.broken_count > 0 && (
                        <span title="현장에서 조건 변경 신고" className="flex shrink-0 items-center gap-0.5 rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-600">
                          <TriangleAlert className="h-3 w-3" /> {s.broken_count}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 최근 후기 */}
          <section className="rounded-lg bg-white px-5 py-6 sm:px-[30px] dark:bg-[#111827]">
            <h2 className="text-[17px] font-bold text-black dark:text-white">최근 구매 후기</h2>
            {recent.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-[#AAA]">아직 후기가 없습니다.</p>
            ) : (
              <div className="mt-1">
                {recent.map((r) => (
                  <ReviewCard key={r.id} r={r} showStore />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <ProfileCard />

          {/* 후기 기반 기종별 실구매가 */}
          <section className="rounded-lg bg-white p-5 dark:bg-[#111827]">
            <h2 className="text-[17px] font-bold leading-9 text-black dark:text-white">기종별 실구매가 (최근 60일 후기)</h2>
            {priceBoard.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#AAA]">후기가 쌓이면 기종별 최저·평균 실구매가가 표시됩니다.</p>
            ) : (
              <table className="mt-1 w-full text-[13px] tabular-nums">
                <thead>
                  <tr className="text-[12px] text-[#999]">
                    <th className="py-1 text-left font-medium">기종</th>
                    <th className="text-right font-medium">최저</th>
                    <th className="text-right font-medium">평균</th>
                  </tr>
                </thead>
                <tbody>
                  {priceBoard.map((p) => (
                    <tr key={`${p.device_name}-${p.carrier}`} className="border-t border-[#F0F1F3] dark:border-slate-800">
                      <td className="py-1.5 pr-2">
                        <span className="block truncate text-black dark:text-slate-200">{p.device_name}</span>
                        <span className="text-[11px] text-[#999]">
                          {p.carrier} · 후기 {p.n}
                        </span>
                      </td>
                      <td className="text-right font-bold text-[#5707EB] dark:text-[#C4B5FD]">{KRW(p.min_real)}</td>
                      <td className="text-right text-[#666]">{KRW(p.avg_real)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <AdSlot slot="board-side" />

          <section className="rounded-lg bg-white p-5 text-[13px] leading-relaxed text-[#666] dark:bg-[#111827] dark:text-slate-400">
            <p className="flex items-center gap-1.5 text-[15px] font-bold text-black dark:text-white">
              <ShieldCheck className="h-4 w-4 text-[#5707EB]" /> 평가 기준
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>실구매가 환산 = 기기 실부담 + 요금제 유지 차액 + 부가서비스 비용</li>
              <li>할부는 연 5.9% 이자를 포함해 계산합니다.</li>
              <li>평점 순위는 후기 수가 적은 매장의 점수가 튀지 않도록 보정합니다.</li>
              <li>매장은 별칭·지역으로만 표시하며 실명·연락처·주소는 받지 않습니다.</li>
            </ul>
          </section>
        </aside>
      </main>

      <Footer />
    </div>
  )
}
