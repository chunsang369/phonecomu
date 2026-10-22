import Link from 'next/link'
import { Calculator, MapPin, MessageCircle, EyeOff, Megaphone, Headset, ChevronRight } from 'lucide-react'
import SiteHeader from '@/components/layout/site-header'
import Footer from '@/components/ui/footer'
import AdSlot from '@/components/ads/ad-slot'
import MainTabbedFeed from '@/components/ui/main-tabbed-feed'
import ProfileCard from '@/components/home/profile-card'
import SideTabs from '@/components/home/side-tabs'
import { getAllBoards } from '@/lib/queries/board'
import { getPostsByBoard, type PostRow } from '@/lib/queries/post'
import { getRecentComments } from '@/lib/queries/comment'

// 피드에 쓰는 짧은 게시판 이름 (아이보스: 자유·행사정보 등 2~4자)
const SHORT: Record<string, string> = {
  info: '정보공유',
  free: '자유',
  anonymous: '익명',
  qna: '질문답변',
  coordinate: '시세표',
  notice: '공지',
}

// 가운데 바로가기 카드 (아이보스: 180×62, 15px bold)
const QUICK_LINKS = [
  { href: '/calculator', label: '요금계산기', Icon: Calculator },
  { href: '/board/coordinate', label: '지역별 시세표', Icon: MapPin },
  { href: '/board/qna', label: '질문하기', Icon: MessageCircle },
  { href: '/board/anonymous', label: '익명 수다', Icon: EyeOff },
  { href: '/board/notice', label: '공지사항', Icon: Megaphone },
  { href: '/support/contact', label: '고객센터', Icon: Headset },
]

export default async function Home() {
  const [allBoards, recentComments] = await Promise.all([
    getAllBoards(),
    getRecentComments(8),
  ])

  // 통합 피드
  const boards = allBoards.filter((b) => ['free', 'info', 'anonymous', 'coordinate', 'qna', 'notice'].includes(b.slug))
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
            {QUICK_LINKS.map(({ href, label, Icon }) => (
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
      </main>

      <Footer />
    </div>
  )
}
