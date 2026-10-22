import Link from 'next/link'
import { Smartphone } from 'lucide-react'

export default function Footer() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'

  return (
    <footer className="w-full bg-[#FAFBFD] border-t border-[#E5E8EC] py-10 dark:bg-[#0B0F19] dark:border-[#1F2937] mt-auto select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row items-start justify-between gap-8">
        
        {/* 좌측 로고 영역 */}
        <div className="flex items-center gap-2 shrink-0">
          <Smartphone className="h-5 w-5 text-[#5707EB]" />
          <span className="text-sm font-black text-[#1A1D24] dark:text-white uppercase tracking-wider">
            {siteName}
          </span>
        </div>

        {/* 중앙 정보 영역 */}
        <div className="flex-1 space-y-4 text-[10px] sm:text-[11px] text-[#828B9C] dark:text-[#94A3B8] font-bold">
          {/* 상단 바로가기 퀵 링크 */}
          <div className="flex items-center gap-3.5 flex-wrap text-slate-600 dark:text-slate-300">
            <Link href="/support/advertise" className="hover:text-[#5707EB]">광고문의</Link>
            <span>|</span>
            <Link href="/support/terms" className="hover:text-[#5707EB]">이용약관</Link>
            <span>|</span>
            <Link href="/support/privacy" className="hover:text-[#5707EB] text-slate-800 dark:text-slate-100 font-extrabold">개인정보 처리방침</Link>
            <span>|</span>
            <Link href="/support/infringement" className="hover:text-[#5707EB]">권리침해신고</Link>
            <span>|</span>
            <Link href="/support/contact" className="hover:text-[#5707EB]">문의/건의사항</Link>
          </div>

          {/* 하단 커뮤니티 안내 고지 정보 */}
          <div className="space-y-1.5 leading-relaxed font-semibold">
            <p className="text-slate-500 dark:text-slate-400">
              {siteName.toUpperCase()}는 휴대폰 정보 공유 커뮤니티입니다. 상품 주문, 배송 및 환불의 의무와 책임은 각 판매 업체에 있습니다.
            </p>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              E-mail : contact@{siteName.toLowerCase()}.com
            </p>
            <p className="text-[9px] text-[#A1AAB9] dark:text-[#64748B] font-medium mt-2">
              Copyright &copy; {siteName.toUpperCase()} All Rights Reserved.
            </p>
          </div>
        </div>

      </div>
    </footer>
  )
}
