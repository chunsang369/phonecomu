import Link from 'next/link'
import { Store, Calculator, MapPin, MessageCircle, EyeOff, Megaphone, ChevronRight } from 'lucide-react'
import SiteHeader from '@/components/layout/site-header'
import Footer from '@/components/ui/footer'
import AdSlot from '@/components/ads/ad-slot'
import MainTabbedFeed from '@/components/ui/main-tabbed-feed'
import ProfileCard from '@/components/home/profile-card'
import SideTabs from '@/components/home/side-tabs'
import { getAllBoards } from '@/lib/queries/board'
import { getPostsByBoard, type PostRow } from '@/lib/queries/post'
import { getRecentComments } from '@/lib/queries/comment'
import { isDemo } from '@/lib/demo/runtime.mjs'
import JsonLd from '@/components/seo/json-ld'
import { siteGraph, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo/schema'
import { pageMeta } from '@/lib/seo/metadata'

export const metadata = pageMeta({
  title: `${SITE_NAME} — 휴대폰 성지 평가·실구매가 비교 커뮤니티`,
  description: SITE_DESCRIPTION,
  path: '/',
})
export const dynamic='force-dynamic'

// 첫 화면 소개 아래 구매 가이드 링크 (질문형 검색어 → 가이드 문서로 연결)
const GUIDE_CHIPS = [
  { href: '/guide/buy-phone-cheap', label: '휴대폰 싸게 사는 법' },
  { href: '/guide/what-is-seongji', label: '휴대폰 성지란?' },
  { href: '/guide/subsidy-vs-selective', label: '공시지원금 vs 선택약정' },
  { href: '/guide/avoid-bait', label: '성지 낚시 피하는 법' },
  { href: '/guide/contract-checklist', label: '개통 전 계약서 체크리스트' },
]

// 피드에 쓰는 짧은 게시판 이름 (아이보스: 자유·행사정보 등 2~4자)
const SHORT: Record<string, string> = {
  info: '정보공유',
  free: '자유',
  anonymous: '익명',
  qna: '질문답변',
  coordinate: '진짜성지',
  notice: '공지',
  review: '성지후기',
  politics: '정치·시사',
}

// 가운데 바로가기 카드 (아이보스: 180×62, 15px bold)
const QUICK_LINKS = [
  { href: '/seongji', label: '성지 평가', Icon: Store },
  { href: '/calculator', label: '요금계산기', Icon: Calculator },
  { href: '/board/coordinate', label: '지역별 진짜성지', Icon: MapPin },
  { href: '/board/qna', label: '질문하기', Icon: MessageCircle },
  { href: '/board/anonymous', label: '익명 수다', Icon: EyeOff },
  { href: '/board/notice', label: '공지사항', Icon: Megaphone },
]

export default async function Home() {
  const [allBoards, recentComments] = await Promise.all([
    getAllBoards(),
    getRecentComments(8),
  ])

  // 통합 피드
  const boards = allBoards.filter((b) => ['free', 'info', 'anonymous', 'coordinate', 'qna', 'notice', 'review', 'politics'].includes(b.slug))
  const perBoard = await Promise.all(
    boards.map(async (b) =>
      (await getPostsByBoard(b.id, 60)).map((p: PostRow) => ({
        id: p.id,
        title: p.title,
        created_at: p.created_at,
        comment_count: p.comment_count,
        upvotes: p.upvotes,
        board_slug: b.slug,
        board_name: SHORT[b.slug] ?? b.name,
        author_name: p.is_anonymous ? p.anon_tag || '익명' : p.author?.display_name || '성지회원',
        author_username: p.is_anonymous ? null : p.author_username,
        is_anonymous: p.is_anonymous,
      })),
    ),
  )
  const unifiedPosts = perBoard.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const newPosts = unifiedPosts.slice(0, 8).map((p) => ({ id: p.id, text: p.title, href: `/board/${p.board_slug}/${p.id}` }))
  const newComments = recentComments.map((c) => ({ id: c.id, text: c.content, href: `/board/${c.board_slug}/${c.post_id}` }))

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#454545] dark:bg-[#0B0F19] dark:text-[#E2E8F0]">
      <JsonLd data={siteGraph()} />
      <SiteHeader active="home" />

      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_180px_360px]">
          {/* ── 왼쪽: 상단 광고 · 요금계산기 바로가기 · 피드 ── */}
          <div className="min-w-0 space-y-5">
            <AdSlot slot="home-top" />

            {/* 요금계산기 바로가기 칸 */}
            <Link
              href="/calculator"
              className="group flex items-center gap-3 rounded-lg bg-white px-4 py-4 sm:gap-4 sm:py-5 transition hover:ring-1 hover:ring-[#5707EB]/40 sm:px-[30px] dark:bg-[#111827]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EDE7FE] text-[#5707EB] dark:bg-[#2A1366] dark:text-[#C4B5FD]">
                <Calculator className="h-6 w-6" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold text-black dark:text-white">휴대폰 요금계산기</span>
                <span className="mt-0.5 block truncate text-[13px] text-[#888]">
                  공시지원금 vs 선택약정 · SKT·KT·LG U+ 요금제별 월 청구액 한눈에 비교
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-[#5707EB] px-3 py-2.5 text-[14px] font-bold text-white group-hover:bg-[#4E07D2] sm:px-4 dark:bg-[#A78BFA] dark:text-[#14082E]">
                <span className="hidden sm:inline">계산하러 가기</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
            <MainTabbedFeed initialPosts={unifiedPosts} />
          </div>

          {/* ── 가운데: 바로가기 카드 ── */}
          <nav aria-label="바로가기" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:flex lg:flex-col">
            {(isDemo() ? [...QUICK_LINKS,{href:'/board/politics',label:'정치·시사',Icon:MessageCircle}] : QUICK_LINKS).map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex h-[62px] items-center gap-2.5 rounded-lg bg-white px-5 text-[15px] font-bold text-[#454545] transition hover:text-[#5707EB] dark:bg-[#111827] dark:text-slate-200 dark:hover:text-[#A78BFA]"
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                {label}
              </Link>
            ))}
          </nav>

          {/* ── 오른쪽: 로그인/프로필 · 광고 · 새글/새댓글 ── */}
          <div className="space-y-5">
            <ProfileCard />

            <AdSlot slot="home-side" />

            <SideTabs posts={newPosts} comments={newComments} />

            <Link
              href="/board/info"
              className="flex items-center justify-between rounded-lg bg-white px-5 py-4 text-[15px] font-bold text-[#454545] hover:text-[#5707EB] dark:bg-[#111827] dark:text-slate-200"
            >
              휴대폰 정보공유 게시판 <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 사이트 소개(하단): 페이지 유일한 H1 + 바로 아래 직접 답 문단 — 첫 화면은 피드·광고 위주로 두고 검색·AI용 설명은 아래에 둔다 */}
        <section className="mt-8 border-t border-[#E5E8EC] px-1 pt-6 dark:border-[#1F2937]">
          <h1 className="text-[16px] font-bold tracking-[-0.3px] text-[#333] dark:text-slate-200">휴대폰 성지 평가 커뮤니티 {SITE_NAME}</h1>
          <p data-seo="answer" className="mt-1.5 max-w-[900px] text-[13px] leading-[1.7] text-[#777] dark:text-slate-400">
            {SITE_NAME}는 휴대폰 성지(핸드폰 성지)에서 실제로 개통한 조건을 구매자가 남기고, 요금제 유지·부가서비스 비용까지 더한 실구매가와 약속 이행률로 매장을 비교하는 커뮤니티입니다. 휴대폰을 싸게 사는 법과 공시지원금·선택약정 비교 방법도 가이드로 정리해 두었습니다.
          </p>
          <nav aria-label="휴대폰 구매 가이드" className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
            {GUIDE_CHIPS.map((g) => (
              <Link key={g.href} href={g.href} className="text-[#555] hover:text-[#5707EB] hover:underline dark:text-slate-300">
                {g.label}
              </Link>
            ))}
            <Link href="/guide" className="flex items-center font-bold text-[#5707EB] hover:underline dark:text-[#C4B5FD]">
              가이드 전체 <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </section>
      </main>

      <Footer />
    </div>
  )
}
