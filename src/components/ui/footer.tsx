import Link from 'next/link'
import { Smartphone } from 'lucide-react'

// 모든 페이지 하단: 구매 가이드 허브·소개 페이지로 가는 내부 링크 (고립 페이지 방지)
const GUIDE_LINKS = [
  { href: '/guide/buy-phone-cheap', label: '휴대폰 싸게 사는 법' },
  { href: '/guide/what-is-seongji', label: '휴대폰 성지란?' },
  { href: '/guide/subsidy-vs-selective', label: '공시지원금 vs 선택약정' },
  { href: '/guide/avoid-bait', label: '성지 낚시 피하는 법' },
  { href: '/guide/contract-checklist', label: '개통 전 계약서 체크리스트' },
  { href: '/guide/glossary', label: '휴대폰 구매 용어사전' },
]

export default function Footer() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '성지평가제'

  return (
    <footer className="mt-auto w-full select-none border-t border-[#E5E8EC] bg-[#FAFBFD] py-10 dark:border-[#1F2937] dark:bg-[#0B0F19]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 px-4 sm:px-5 md:flex-row">
        <div className="flex shrink-0 items-center gap-2">
          <Smartphone className="h-5 w-5 text-[#5707EB]" />
          <span className="text-sm font-black tracking-wider text-[#1A1D24] dark:text-white">{siteName}</span>
        </div>

        <div className="flex-1 space-y-4 text-[12px] text-[#828B9C] dark:text-[#94A3B8]">
          <nav aria-label="휴대폰 구매 가이드" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-bold text-slate-700 dark:text-slate-200">
            <Link href="/guide" className="text-[#5707EB] hover:underline dark:text-[#A78BFA]">구매 가이드</Link>
            {GUIDE_LINKS.map((g) => (
              <Link key={g.href} href={g.href} className="hover:text-[#5707EB]">
                {g.label}
              </Link>
            ))}
            <Link href="/seongji" className="hover:text-[#5707EB]">성지 평가</Link>
            <Link href="/calculator" className="hover:text-[#5707EB]">요금계산기</Link>
          </nav>

          <div className="flex flex-wrap items-center gap-3.5 font-semibold text-slate-600 dark:text-slate-300">
            <Link href="/about" className="hover:text-[#5707EB]">성지평가제 소개·평가 기준</Link>
            <span>|</span>
            <Link href="/support/advertise" className="hover:text-[#5707EB]">광고문의</Link>
            <span>|</span>
            <Link href="/support/terms" className="hover:text-[#5707EB]">이용약관</Link>
            <span>|</span>
            <Link href="/support/privacy" className="font-extrabold text-slate-800 hover:text-[#5707EB] dark:text-slate-100">개인정보 처리방침</Link>
            <span>|</span>
            <Link href="/support/infringement" className="hover:text-[#5707EB]">권리침해신고</Link>
            <span>|</span>
            <Link href="/support/contact" className="hover:text-[#5707EB]">문의/건의사항</Link>
          </div>

          <div className="space-y-1.5 leading-relaxed">
            <p>
              {siteName}는 휴대폰 성지의 실제 개통 조건과 구매 후기를 나누는 정보 커뮤니티입니다. 상품 판매·개통·환불의 의무와 책임은 각 판매점에 있습니다.
            </p>
            <p className="text-[11px] text-[#A1AAB9] dark:text-[#64748B]">Copyright &copy; {siteName} All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
