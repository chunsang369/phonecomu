import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import ReviewForm from '@/components/seongji/review-form'
import { getCurrentProfile } from '@/lib/auth/session'
import { REGIONS } from '@/lib/seongji/cost'

export const metadata: Metadata = { title: '성지 구매 후기 쓰기', robots: { index: false } }

export default async function WriteReviewPage({ searchParams }: { searchParams: Promise<{ store?: string; region?: string }> }) {
  const me = await getCurrentProfile()
  if (!me) redirect('/login?next=/seongji/write')
  const sp = await searchParams
  const initialStore =
    sp.store && /^[0-9a-f-]{36}$/i.test(sp.store) && (REGIONS as readonly string[]).includes(sp.region ?? '')
      ? { id: sp.store, region: sp.region! }
      : undefined

  return (
    <div className="min-h-screen bg-[#F2F4F6] dark:bg-[#0B0F19]">
      <main className="mx-auto max-w-[900px] space-y-5 px-4 py-6 sm:px-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.5px] text-black dark:text-white">성지 구매 후기 쓰기</h1>
          <p className="mt-1 text-[14px] text-[#666] dark:text-slate-400">
            계약서 기준의 실제 조건을 남기면 다음 사람이 같은 기준으로 성지를 비교할 수 있습니다. 후기는 &lsquo;성지 평가 후기&rsquo; 게시판에도 함께 올라갑니다.
          </p>
        </div>
        <ReviewForm initialStore={initialStore} />
      </main>
    </div>
  )
}
