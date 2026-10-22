import Link from 'next/link'
import { Star } from 'lucide-react'
import type { StoreReview } from '@/lib/queries/seongji'
import { PROMISE_LABEL } from '@/lib/seongji/cost'

const KRW = (n: number) => new Intl.NumberFormat('ko-KR').format(n)

export function Score({ value, size = 'sm' }: { value: number | null; size?: 'sm' | 'lg' }) {
  if (value == null) return <span className="text-[13px] text-[#AAA]">평가 없음</span>
  return (
    <span className={`inline-flex items-center gap-1 font-extrabold tabular-nums text-black dark:text-white ${size === 'lg' ? 'text-[26px]' : 'text-[14px]'}`}>
      <Star className={`${size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'} fill-[#FFB800] text-[#FFB800]`} />
      {value.toFixed(1)}
    </span>
  )
}

export function PromiseBadge({ promise }: { promise: StoreReview['promise'] }) {
  const cls =
    promise === 'kept'
      ? 'bg-[#ECFDF5] text-[#047857] dark:bg-emerald-950 dark:text-emerald-300'
      : promise === 'partial'
        ? 'bg-[#FFF7E6] text-[#B45309] dark:bg-amber-950 dark:text-amber-300'
        : 'bg-[#FEF2F2] text-[#DC2626] dark:bg-rose-950 dark:text-rose-300'
  return <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${cls}`}>{PROMISE_LABEL[promise]}</span>
}

/** 후기 한 건: 조건 요약 + 실구매가 환산 */
export default function ReviewCard({ r, showStore = false }: { r: StoreReview; showStore?: boolean }) {
  const avg = (r.rating_price + r.rating_service + r.rating_trust) / 3
  return (
    <article className="border-b border-[#F0F1F3] py-4 last:border-0 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <PromiseBadge promise={r.promise} />
        <Score value={avg} />
        {showStore && (
          <Link href={`/seongji/${r.store_id}`} className="text-[14px] font-bold text-black hover:underline dark:text-white">
            {r.store_region} {r.store_district} · {r.store_alias}
          </Link>
        )}
        <span className="ml-auto text-[12px] text-[#999]">
          {r.author_display_name ?? '탈퇴 회원'} · 구매 {r.purchased_on}
        </span>
      </div>
      <p className="mt-2 text-[15px] text-black dark:text-slate-100">
        {r.device_name} · {r.carrier} {r.join_type} · {r.discount_type}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-4">
        <div>
          <dt className="text-[#999]">{r.pay_type === '현금완납' ? '현금완납가' : `할부원금(${r.install_months}개월)`}</dt>
          <dd className="font-bold tabular-nums text-[#222] dark:text-slate-200">{KRW(r.device_paid)}원</dd>
        </div>
        <div>
          <dt className="text-[#999]">요금제 조건</dt>
          <dd className="font-bold tabular-nums text-[#222] dark:text-slate-200">
            {KRW(r.plan_price)}원 × {r.plan_hold_months}개월
          </dd>
        </div>
        <div>
          <dt className="text-[#999]">숨은 조건 비용</dt>
          <dd className="font-bold tabular-nums text-rose-500">
            +{KRW(r.hidden_cost)}원{r.card_required ? ' · 카드조건' : ''}
          </dd>
        </div>
        <div>
          <dt className="text-[#5707EB] dark:text-[#C4B5FD]">실구매가 환산</dt>
          <dd className="text-[15px] font-extrabold tabular-nums text-[#5707EB] dark:text-[#C4B5FD]">{KRW(r.real_price)}원</dd>
        </div>
      </dl>
      {r.comment && <p className="mt-2 line-clamp-3 whitespace-pre-line text-[14px] leading-relaxed text-[#454545] dark:text-slate-300">{r.comment}</p>}
      {r.post_id && (
        <Link href={`/board/review/${r.post_id}`} className="mt-1 inline-block text-[12px] text-[#999] hover:text-[#5707EB]">
          댓글 보기 →
        </Link>
      )}
    </article>
  )
}
