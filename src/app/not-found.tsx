import Link from 'next/link'
import SiteHeader from '@/components/layout/site-header'
import Footer from '@/components/ui/footer'

/** 없는 주소 — 404 상태로 응답하면서 주요 페이지로 가는 내부 링크를 제공한다 */
export const metadata = { title: '페이지를 찾을 수 없습니다', robots: { index: false } }

const LINKS = [
  { href: '/', label: '홈' },
  { href: '/seongji', label: '성지 평가' },
  { href: '/calculator', label: '공시지원금 vs 선택약정 계산기' },
  { href: '/guide', label: '휴대폰 구매 가이드' },
  { href: '/guide/buy-phone-cheap', label: '휴대폰 싸게 사는 법' },
  { href: '/board/coordinate', label: '지역별 진짜성지' },
]

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#454545] dark:bg-[#0B0F19] dark:text-[#E2E8F0]">
      <SiteHeader />
      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-5">
        <section className="rounded-lg bg-white px-6 py-10 text-center dark:bg-[#111827]">
          <h1 className="text-[24px] font-extrabold text-black dark:text-white">페이지를 찾을 수 없습니다</h1>
          <p className="mt-3 text-[15px] text-[#666] dark:text-slate-400">주소가 바뀌었거나 삭제된 글입니다. 아래에서 원하는 정보를 찾아보세요.</p>
          <nav aria-label="주요 페이지" className="mt-6 flex flex-wrap justify-center gap-2">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg border border-[#DDD] px-4 py-2 text-[14px] font-bold text-[#333] hover:border-[#5707EB] hover:text-[#5707EB] dark:border-slate-700 dark:text-slate-200">
                {l.label}
              </Link>
            ))}
          </nav>
        </section>
      </main>
      <Footer />
    </div>
  )
}
