import Link from 'next/link'
import { Search, Smartphone, SquarePen, Calculator, Flame } from 'lucide-react'
import { getCurrentProfile } from '@/lib/auth/session'
import { signOut } from '@/lib/actions/auth'

/**
 * 공통 헤더 — 아이보스(i-boss.co.kr) 헤더 구조·치수 기준
 * - 1단(80px): 로고 · 검색(230×40, r8, #E0E0E0) · 우측 텍스트 메뉴 · 아바타 · 보라 글쓰기 버튼
 * - 2단(52px): GNB 16px bold #454545, 자간 -0.4px / 구분선 뒤 강조 메뉴(#663399) / 우측 광고 문의
 * 컨테이너: 최대 1440px, 좌우 20px (본문과 동일)
 */

const NAV = [
  { key: 'home', href: '/', label: '홈' },
  { key: 'info', href: '/board/info', label: '정보공유' },
  { key: 'free', href: '/board/free', label: '자유게시판' },
  { key: 'anonymous', href: '/board/anonymous', label: '익명게시판' },
  { key: 'qna', href: '/board/qna', label: '질문답변' },
]
const NAV_ACCENT = [
  { key: 'seongji', href: '/seongji', label: '성지평가' },
  { key: 'coordinate', href: '/board/coordinate', label: '지역별 진짜성지' },
  { key: 'calculator', href: '/calculator', label: '요금계산기' },
  { key: 'guide', href: '/guide', label: '구매 가이드' },
  { key: 'notice', href: '/board/notice', label: '공지사항' },
]

export default async function SiteHeader({ active, writeSlug = 'free' }: { active?: string; writeSlug?: string }) {
  const demo = process.env.PHONE_DEMO === '1'
  // DB 장애 시에도 헤더 때문에 페이지 전체가 늦어지지 않도록 2초 제한
  const user = await Promise.race([getCurrentProfile(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))])
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '폰커뮤니티'
  const logout = async () => {
    'use server'
    await signOut()
  }

  const navCls = (on: boolean, accent = false) =>
    `relative flex shrink-0 items-center text-[15px] font-bold tracking-[-0.4px] transition sm:text-[16px] ${
      on
        ? 'text-black after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-black dark:text-white dark:after:bg-white'
        : accent
          ? 'text-[#663399] hover:text-[#5707EB] dark:text-[#C4B5FD]'
          : 'text-[#454545] hover:text-black dark:text-slate-300 dark:hover:text-white'
    }`

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E9EBEE] bg-white dark:border-[#1F2937] dark:bg-[#111827]">
      <div className="mx-auto flex h-[64px] max-w-[1440px] items-center gap-5 px-4 sm:h-[80px] sm:px-5">
        <Link href="/" aria-label={`${siteName} 홈`} className="flex shrink-0 items-center gap-1 text-[21px] font-extrabold tracking-[-0.8px] text-black dark:text-white sm:text-[23px]">
          <Smartphone className="h-[22px] w-[22px] text-[#5707EB] dark:text-[#A78BFA]" strokeWidth={2.4} />
          {siteName}
        </Link>

        <form action="/search" method="get" role="search" className="relative hidden w-[230px] md:block">
          <input
            type="search"
            name="q"
            placeholder="검색"
            aria-label="게시글 검색"
            className="h-10 w-full rounded-lg border border-[#E0E0E0] bg-white pl-3 pr-10 text-[16px] font-semibold text-black placeholder:font-normal placeholder:text-[#AAA] focus:border-[#5707EB] focus:outline-none dark:border-[#374151] dark:bg-[#1F2937] dark:text-white"
          />
          <button type="submit" aria-label="검색" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#222] dark:text-slate-300">
            <Search className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
        </form>

        <nav aria-label="사용자 메뉴" className="ml-auto flex items-center gap-1 text-[15px] text-[#454545] dark:text-slate-300">
          <Link href="/search" aria-label="검색" className="p-2 md:hidden">
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/board/free" className="hidden px-2.5 py-1 hover:text-black lg:inline dark:hover:text-white">새로운 글</Link>
          <Link href="/board/info" className="hidden items-center gap-1 px-2.5 py-1 hover:text-black lg:flex dark:hover:text-white">
            <Flame className="h-4 w-4" /> 인기글
          </Link>
          <Link href="/calculator" className="hidden items-center gap-1 px-2.5 py-1 hover:text-black lg:flex dark:hover:text-white">
            <Calculator className="h-4 w-4" /> 요금계산기
          </Link>
          <span className="mx-2 hidden h-4 w-px bg-[#DDD] lg:block" />
          {demo ? <Link href={`/demo/write?board=${writeSlug}`} className="rounded-lg bg-[#5707EB] px-3 py-2 text-sm font-semibold text-white">글쓰기</Link> : user ? (
            <>
              <Link
                href="/mypage"
                aria-label="마이페이지"
                title={user.display_name}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDE7FE] text-[15px] font-bold text-[#5707EB] dark:bg-[#2A1366] dark:text-[#C4B5FD]"
              >
                {user.display_name.slice(0, 1)}
              </Link>
              <form action={logout} className="hidden sm:block">
                <button type="submit" className="px-2.5 py-1 text-[14px] hover:text-black dark:hover:text-white">로그아웃</button>
              </form>
              <Link
                href={`/write/${writeSlug}`}
                className="ml-1 flex h-10 items-center gap-1.5 rounded-lg bg-[#5707EB] px-3 text-[15px] font-bold text-white hover:bg-[#4E07D2] sm:h-12 sm:px-4 sm:text-[17px]"
              >
                <SquarePen className="h-[18px] w-[18px]" /> 글쓰기
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="px-2.5 py-1 hover:text-black dark:hover:text-white">로그인</Link>
              <Link href="/signup" className="px-2.5 py-1 hover:text-black dark:hover:text-white">회원가입</Link>
              <Link
                href={`/login?next=/write/${writeSlug}`}
                className="ml-1 hidden h-12 items-center gap-1.5 rounded-lg bg-[#5707EB] px-4 text-[17px] font-bold text-white hover:bg-[#4E07D2] sm:flex"
              >
                <SquarePen className="h-[18px] w-[18px]" /> 글쓰기
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="mx-auto flex h-[48px] max-w-[1440px] items-stretch px-4 sm:h-[52px] sm:px-5">
        <nav aria-label="주 메뉴" className="flex min-w-0 flex-1 items-stretch gap-5 overflow-x-auto [scrollbar-width:none] sm:gap-[30px]">
          {NAV.map((n) => (
            <Link key={n.key} href={n.href} aria-current={active === n.key ? 'page' : undefined} className={navCls(active === n.key)}>
              {n.label}
            </Link>
          ))}
          <><Link href="/board/review" className={navCls(active==='review')}>구매 후기</Link><Link href="/board/politics" className={navCls(active==='politics')}>정치·시사</Link></>
          <span aria-hidden className="my-auto h-3.5 w-px shrink-0 bg-[#DDD]" />
          {NAV_ACCENT.map((n) => (
            <Link key={n.key} href={n.href} aria-current={active === n.key ? 'page' : undefined} className={navCls(active === n.key, true)}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/support/advertise" className="ml-4 hidden shrink-0 items-center text-[16px] font-bold tracking-[-0.4px] text-[#5707EB] hover:underline lg:flex dark:text-[#A78BFA]">
          광고 문의
        </Link>
      </div>
    </header>
  )
}
