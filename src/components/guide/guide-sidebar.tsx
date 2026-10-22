import Link from 'next/link'
import { Calculator, Store } from 'lucide-react'
import { GUIDES } from '@/lib/guides/content'

/** 가이드 우측: 전체 가이드 목록(허브 링크) + 핵심 도구 바로가기 */
export default function GuideSidebar({ current }: { current?: string }) {
  return (
    <>
      <section className="rounded-lg bg-white p-5 dark:bg-[#111827]">
        <h2 className="text-[17px] font-bold leading-9 text-black dark:text-white">휴대폰 구매 가이드</h2>
        <ul className="mt-1">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guide/${g.slug}`}
                aria-current={g.slug === current ? 'page' : undefined}
                className={`block truncate py-1.5 text-[15px] hover:underline ${g.slug === current ? 'font-bold text-[#5707EB] dark:text-[#A78BFA]' : 'text-black dark:text-slate-200'}`}
              >
                {g.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2.5">
        <Link href="/calculator" className="flex h-[62px] items-center gap-2.5 rounded-lg bg-white px-5 text-[15px] font-bold text-[#454545] hover:text-[#5707EB] dark:bg-[#111827] dark:text-slate-200">
          <Calculator className="h-5 w-5" /> 공시지원금 vs 선택약정 계산기
        </Link>
        <Link href="/seongji" className="flex h-[62px] items-center gap-2.5 rounded-lg bg-white px-5 text-[15px] font-bold text-[#454545] hover:text-[#5707EB] dark:bg-[#111827] dark:text-slate-200">
          <Store className="h-5 w-5" /> 지역별 성지 평가·실구매가
        </Link>
      </section>
    </>
  )
}
