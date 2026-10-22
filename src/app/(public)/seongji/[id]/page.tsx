import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, SquarePen } from 'lucide-react'
import SiteHeader from '@/components/layout/site-header'
import Footer from '@/components/ui/footer'
import AdSlot from '@/components/ads/ad-slot'
import ProfileCard from '@/components/home/profile-card'
import ReviewCard, { Score } from '@/components/seongji/review-card'
import { getStore, getStoreReviews } from '@/lib/queries/seongji'
import JsonLd from '@/components/seo/json-ld'
import { breadcrumbSchema } from '@/lib/seo/schema'
import { pageMeta } from '@/lib/seo/metadata'

const KRW = (n: number) => new Intl.NumberFormat('ko-KR').format(n)

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const s = await getStore(id)
  if (!s) return { title: '성지를 찾을 수 없습니다' }
  const rate = s.kept_rate == null ? '' : ` · 약속 이행률 ${Math.round(s.kept_rate * 100)}%`
  const meta = pageMeta({
    title: `${s.region} ${s.district} ${s.alias} 휴대폰 성지 후기 ${s.review_count}건${s.avg_total ? ` · 평점 ${s.avg_total}` : ''}`.replace(/s+/g, ' '),
    description: `${s.region} ${s.district} ${s.alias}의 실제 개통 조건 후기 ${s.review_count}건${rate}. 할부원금·요금제 유지·부가서비스를 반영한 실구매가로 비교하세요.`.replace(/s+/g, ' '),
    path: `/seongji/${id}`,
  })
  // 후기가 없는 매장 페이지는 내용이 없어 색인하지 않음 (후기가 쌓이면 자동으로 색인 대상)
  return s.review_count > 0 ? meta : { ...meta, robots: { index: false, follow: true } }
}

export default async function StorePage({ params }: Props) {
  const { id } = await params
  const [store, reviews] = await Promise.all([getStore(id), getStoreReviews(id)])
  if (!store) notFound()

  const n = store.review_count
  const byPromise = { kept: 0, partial: 0, broken: 0 } as Record<string, number>
  reviews.forEach((r) => (byPromise[r.promise] += 1))
  const avgHidden = n ? Math.round(reviews.reduce((s, r) => s + r.hidden_cost, 0) / n) : 0
  const cardRate = n ? Math.round((reviews.filter((r) => r.card_required).length / n) * 100) : 0

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#454545] dark:bg-[#0B0F19] dark:text-[#E2E8F0]">
      <JsonLd
        data={breadcrumbSchema([
          { name: '홈', path: '/' },
          { name: '성지 평가', path: '/seongji' },
          { name: `${store.region} 성지`, path: `/seongji?region=${encodeURIComponent(store.region)}` },
          { name: store.alias, path: `/seongji/${store.id}` },
        ])}
      />
      <SiteHeader active="seongji" writeSlug="review" />

      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Link href="/seongji" className="inline-flex items-center gap-1 text-[14px] text-[#666] hover:text-black dark:text-slate-400">
            <ChevronLeft className="h-4 w-4" /> 성지 평가 목록
          </Link>

          {/* 매장 요약 */}
          <section className="rounded-lg bg-white px-5 py-6 sm:px-[30px] dark:bg-[#111827]">
            <p className="text-[13px] text-[#999]">
              {store.region} {store.district}
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <h1 className="text-[24px] font-bold tracking-[-0.5px] text-black dark:text-white">
                {store.alias} <span className="text-[16px] font-bold text-[#888]">휴대폰 성지 후기</span>
              </h1>
              <Link
                href={`/seongji/write?store=${store.id}&region=${encodeURIComponent(store.region)}`}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-[#5707EB] px-4 text-[14px] font-bold text-white hover:bg-[#4E07D2]"
              >
                <SquarePen className="h-4 w-4" /> 이 매장 후기 쓰기
              </Link>
            </div>

            <p data-seo="answer" className="mt-3 text-[15px] leading-relaxed text-[#444] dark:text-slate-300">
              {n > 0
                ? `${store.region} ${store.district} ${store.alias}의 구매 후기 ${n}건 기준 종합 평점은 ${store.avg_total ?? '-'}점, 약속 이행률은 ${store.kept_rate == null ? '-' : Math.round(store.kept_rate * 100) + '%'}입니다. 후기 평균 숨은 조건 비용(요금제 유지 차액·부가서비스)은 ${KRW(avgHidden)}원이고, 제휴카드 조건이 붙은 후기는 ${cardRate}%입니다.`.replace(/s+/g, ' ')
                : '아직 이 매장의 구매 후기가 없습니다. 실제로 개통했다면 계약서 기준 조건으로 첫 후기를 남겨 주세요.'}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg bg-[#F7F8FA] p-4 dark:bg-slate-800/60">
                <p className="text-[12px] font-bold text-[#999]">종합 평점</p>
                <div className="mt-1">
                  <Score value={store.avg_total} size="lg" />
                </div>
                <p className="text-[12px] text-[#999]">후기 {n}건</p>
              </div>
              <div className="rounded-lg bg-[#F7F8FA] p-4 dark:bg-slate-800/60">
                <p className="text-[12px] font-bold text-[#999]">약속 이행률</p>
                <p className={`mt-1 text-[26px] font-extrabold tabular-nums ${store.kept_rate != null && store.kept_rate < 0.7 ? 'text-rose-500' : 'text-[#047857]'}`}>
                  {store.kept_rate == null ? '-' : `${Math.round(store.kept_rate * 100)}%`}
                </p>
                <p className="text-[12px] text-[#999]">
                  일부 달라짐 {byPromise.partial} · 조건 변경 {byPromise.broken}
                </p>
              </div>
              <div className="rounded-lg bg-[#F7F8FA] p-4 dark:bg-slate-800/60">
                <p className="text-[12px] font-bold text-[#999]">평균 숨은 조건 비용</p>
                <p className="mt-1 text-[22px] font-extrabold tabular-nums text-rose-500">{n ? `+${KRW(avgHidden)}원` : '-'}</p>
                <p className="text-[12px] text-[#999]">요금제 유지 차액 + 부가</p>
              </div>
              <div className="rounded-lg bg-[#F7F8FA] p-4 dark:bg-slate-800/60">
                <p className="text-[12px] font-bold text-[#999]">항목별 평점</p>
                <ul className="mt-1 space-y-0.5 text-[13px]">
                  <li className="flex justify-between">가격 <b className="tabular-nums">{store.avg_price ?? '-'}</b></li>
                  <li className="flex justify-between">응대 <b className="tabular-nums">{store.avg_service ?? '-'}</b></li>
                  <li className="flex justify-between">약속 이행 <b className="tabular-nums">{store.avg_trust ?? '-'}</b></li>
                </ul>
                <p className="mt-1 text-[12px] text-[#999]">카드 조건 있었던 후기 {cardRate}%</p>
              </div>
            </div>
          </section>

          {/* 후기 목록 */}
          <section className="rounded-lg bg-white px-5 py-6 sm:px-[30px] dark:bg-[#111827]">
            <h2 className="text-[17px] font-bold text-black dark:text-white">구매 후기 {n}건</h2>
            {reviews.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-[#AAA]">아직 후기가 없습니다.</p>
            ) : (
              <div className="mt-1">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} r={r} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <ProfileCard />
          <AdSlot slot="board-side" />
          <section className="rounded-lg bg-white p-5 text-[13px] leading-relaxed text-[#666] dark:bg-[#111827] dark:text-slate-400">
            <p className="text-[15px] font-bold text-black dark:text-white">방문 전 확인할 것</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>안내받은 할부원금·요금제·유지 기간을 메시지로 받아 두세요.</li>
              <li>계약서에서 부가서비스와 제휴카드 조건을 확인하세요.</li>
              <li>
                두 방식 중 무엇이 유리한지는{' '}
                <Link href="/calculator" className="font-bold text-[#5707EB] hover:underline">
                  요금계산기
                </Link>
                로 미리 계산해 보세요.
              </li>
            </ul>
          </section>
        </aside>
      </main>

      <Footer />
    </div>
  )
}
