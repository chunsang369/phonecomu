import { notFound, permanentRedirect } from 'next/navigation'
import JsonLd from '@/components/seo/json-ld'
import { abs, breadcrumbSchema, SITE_NAME } from '@/lib/seo/schema'
import { pageMeta } from '@/lib/seo/metadata'
import { BOARD_INTRO } from '@/lib/seo/boards'
import ProfileCard from '@/components/home/profile-card'
import PopularList from '@/components/home/popular-list'
import AdSlot from '@/components/ads/ad-slot'
import SiteHeader from '@/components/layout/site-header'
import Link from 'next/link'
import { getBoardBySlug, getAllBoards } from '@/lib/queries/board'
import { getPaginatedPostsByBoard } from '@/lib/queries/post'
import { getCurrentProfile } from '@/lib/auth/session'
import { Metadata } from 'next'
import AnonBadge from '@/components/ui/anon-badge'
import Footer from '@/components/ui/footer'
import WriteButton from '@/components/ui/write-button'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { page } = await searchParams
  const board = await getBoardBySlug(slug)

  if (!board) return { title: '게시판을 찾을 수 없습니다.' }

  // 페이지마다 자기 자신을 canonical로 (2쪽 이상은 ?page=N)
  const n = parseInt(page || '1', 10)
  return pageMeta({
    title: n > 1 ? `${board.name} ${n}페이지` : board.name,
    description: BOARD_INTRO[slug] || board.description || `${board.name} 게시판 목록입니다.`,
    path: n > 1 ? `/board/${slug}?page=${n}` : `/board/${slug}`,
  })
}

export default async function BoardPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { page } = await searchParams
  // ?page=1 은 기본 주소로 영구 이동, 숫자가 아닌 page 값은 404 (중복·무한 URL 방지)
  if (page !== undefined && !/^[1-9]\d{0,4}$/.test(page)) notFound()
  if (page === '1') permanentRedirect(`/board/${slug}`)
  const currentPage = parseInt(page || '1', 10)
  const pageHref = (p: number) => (p === 1 ? `/board/${slug}` : `/board/${slug}?page=${p}`)
  const pageSize = 15
  const board = await getBoardBySlug(slug)

  if (!board) {
    notFound()
  }

  // 게시판 탭(메모리 캐시)·글 목록·로그인 정보를 한 번에 조회 — 순서대로 기다리면 DB 왕복이 그만큼 늘어난다
  const [allBoards, { posts, totalCount }, profile] = await Promise.all([
    getAllBoards(),
    getPaginatedPostsByBoard(board.id, currentPage, pageSize),
    getCurrentProfile(),
  ])
  const activeBoards = allBoards.filter((b) => ['free', 'info', 'anonymous', 'coordinate', 'qna'].includes(b.slug))
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  if (currentPage > totalPages) notFound()

  // 로그인 유저 권한
  const user = profile ? { id: profile.id } : null
  const userLevel = profile?.level || 0

  const canWrite = userLevel >= board.write_min_level

  // 날짜 포맷 함수 (아이보스 스타일)
  const formatBoardDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    
    const isToday = 
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()

    if (isToday) {
      // 오늘 등록된 글은 시간만 노출 (HH:MM)
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } else {
      // 이전 글은 날짜만 노출 (MM.DD)
      return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
    }
  }

  const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString()

  return (
    <div className="min-h-screen bg-[#F2F4F6] pb-12 text-[#454545] dark:bg-[#0B0F19] dark:text-[#E2E8F0]">
      <JsonLd
        data={[
          {
            '@type': 'CollectionPage',
            url: abs(currentPage > 1 ? `/board/${board.slug}?page=${currentPage}` : `/board/${board.slug}`),
            name: `${board.name} | ${SITE_NAME}`,
            description: BOARD_INTRO[board.slug] || board.description || undefined,
            inLanguage: 'ko-KR',
            isPartOf: { '@id': `${abs('/')}#website` },
          },
          breadcrumbSchema([
            { name: '홈', path: '/' },
            { name: board.name, path: `/board/${board.slug}` },
          ]),
        ]}
      />
      <SiteHeader active={board.slug} writeSlug={board.slug} />

      {/* 아이보스 게시판 목록: 본문 + 우측 360px */}
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <AdSlot slot="board-top" />

          <section className="rounded-lg bg-white px-5 py-6 sm:px-[30px] dark:bg-[#111827]">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[22px] font-bold tracking-[-0.5px] text-black dark:text-white">{board.name}</h1>
                {(BOARD_INTRO[board.slug] || board.description) && (
                  <p data-seo="answer" className="mt-1.5 text-[14px] leading-relaxed text-[#666] dark:text-slate-400">{BOARD_INTRO[board.slug] || board.description}</p>
                )}
              </div>
              {canWrite || !user ? (
                <WriteButton
                  boardSlug={board.slug}
                  isLoggedIn={!!user}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#5707EB] px-4 text-[15px] font-bold text-white hover:bg-[#4E07D2]"
                />
              ) : null}
            </div>

            {/* 분류 알약 버튼 (선택: 검정 바탕) */}
            <nav aria-label="게시판" className="mt-5 flex flex-wrap gap-2">
              <Link href="/" className="flex h-9 items-center rounded-full border border-[#DDD] px-4 text-[14px] text-[#666] hover:border-[#999] dark:border-slate-700 dark:text-slate-300">
                전체보기
              </Link>
              {activeBoards.map((b) => (
                <Link
                  key={b.id}
                  href={`/board/${b.slug}`}
                  aria-current={b.slug === board.slug ? 'page' : undefined}
                  className={`flex h-9 items-center rounded-full px-4 text-[14px] ${
                    b.slug === board.slug
                      ? 'bg-black font-bold text-white dark:bg-white dark:text-black'
                      : 'border border-[#DDD] text-[#666] hover:border-[#999] dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {b.name}
                </Link>
              ))}
            </nav>

            {/* 글 목록: 제목 · 댓글수 · 작성자 · 시간 · 조회 · 추천 */}
            <ul className="mt-5 border-t border-[#E5E5E5] dark:border-slate-800">
              {posts.length === 0 && (
                <li className="py-16 text-center text-[14px] text-[#AAA]">아직 등록된 글이 없습니다. 첫 글을 작성해 보세요.</li>
              )}
              {posts.map((post) => (
                <li key={post.id} className="flex min-h-[46px] items-center gap-3 border-b border-[#F0F1F3] py-2 dark:border-slate-800">
                  <div className="flex min-w-0 flex-1 items-center">
                    <Link href={`/board/${board.slug}/${post.id}`} className="truncate text-[16px] tracking-[-0.4px] text-black hover:underline dark:text-slate-100">
                      {post.title}
                    </Link>
                    {post.comment_count > 0 && (
                      <span className="ml-1.5 shrink-0 text-[12px] font-bold text-[#4E07D2] dark:text-[#A78BFA]">{post.comment_count}</span>
                    )}
                    {post.is_anonymous && <span className="ml-1.5 shrink-0"><AnonBadge tag={post.anon_tag || '익명'} /></span>}
                  </div>
                  <span className="hidden w-[120px] shrink-0 items-center gap-1.5 truncate text-[13px] text-[#666] sm:flex dark:text-slate-400">
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#EDE7FE] text-[10px] font-bold text-[#5707EB] dark:bg-[#2A1366] dark:text-[#C4B5FD]">
                      {post.is_anonymous ? '익' : (post.author?.display_name || '회').slice(0, 1)}
                    </span>
                    {post.is_anonymous ? (
                      post.anon_tag || '익명'
                    ) : post.author?.username ? (
                      <Link href={`/u/${post.author.username}`} className="truncate hover:underline">{post.author.display_name}</Link>
                    ) : (
                      post.author?.display_name || '성지회원'
                    )}
                  </span>
                  <span className={`w-[42px] shrink-0 text-right text-[12px] tracking-[-0.5px] ${isToday(post.created_at) ? 'font-medium text-[#4E07D2] dark:text-[#A78BFA]' : 'text-[#454545] dark:text-slate-400'}`}>
                    {formatBoardDate(post.created_at)}
                  </span>
                  <span className="hidden w-[36px] shrink-0 text-right text-[12px] text-[#999] sm:block">{post.view_count.toLocaleString()}</span>
                  <span className="w-[28px] shrink-0 text-right text-[12px] font-bold text-[#4E07D2] dark:text-[#A78BFA]">{post.upvotes || ''}</span>
                </li>
              ))}
            </ul>

            {/* 페이지네이션 UI */}
            {totalPages > 1 && (() => {
              const blockPageSize = 10
              const currentBlock = Math.floor((currentPage - 1) / blockPageSize)
              const startPage = currentBlock * blockPageSize + 1
              const endPage = Math.min(startPage + blockPageSize - 1, totalPages)
              const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)

              return (
                <div className="flex items-center justify-center gap-1.5 mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                  {/* 이전 페이지 */}
                  {currentPage > 1 ? (
                    <Link
                      href={pageHref(currentPage - 1)}
                      className="flex h-8 px-3 items-center justify-center rounded-lg border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition"
                    >
                      &lt; 이전
                    </Link>
                  ) : (
                    <span className="flex h-8 px-3 items-center justify-center rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-300 dark:text-slate-600 text-xs font-bold cursor-not-allowed">
                      &lt; 이전
                    </span>
                  )}

                  {/* 앞쪽 ... 생략선 */}
                  {startPage > 1 && (
                    <>
                      <Link
                        href={pageHref(1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        1
                      </Link>
                      <Link
                        href={pageHref(startPage - 1)}
                        className="flex h-8 w-8 items-center justify-center text-xs font-bold text-slate-400 hover:text-[#5707EB] transition"
                        title="이전 10페이지"
                      >
                        ...
                      </Link>
                    </>
                  )}

                  {/* 페이지 번호 리스트 */}
                  {pages.map((p) => {
                    const isCurrent = p === currentPage
                    return (
                      <Link
                        key={p}
                        href={pageHref(p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                          isCurrent
                            ? 'bg-[#5707EB] text-white'
                            : 'border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  })}

                  {/* 뒤쪽 ... 생략선 */}
                  {endPage < totalPages && (
                    <>
                      <Link
                        href={pageHref(endPage + 1)}
                        className="flex h-8 w-8 items-center justify-center text-xs font-bold text-slate-400 hover:text-[#5707EB] transition"
                        title="다음 10페이지"
                      >
                        ...
                      </Link>
                      <Link
                        href={pageHref(totalPages)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        {totalPages}
                      </Link>
                    </>
                  )}

                  {/* 다음 페이지 */}
                  {currentPage < totalPages ? (
                    <Link
                      href={pageHref(currentPage + 1)}
                      className="flex h-8 px-3 items-center justify-center rounded-lg border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition"
                    >
                      다음 &gt;
                    </Link>
                  ) : (
                    <span className="flex h-8 px-3 items-center justify-center rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-300 dark:text-slate-600 text-xs font-bold cursor-not-allowed">
                      다음 &gt;
                    </span>
                  )}
                </div>
              )
            })()}

            <div className="mt-5 flex items-center justify-between">
              <Link href={`/board/${board.slug}`} className="flex h-10 items-center rounded-lg border border-[#DDD] px-4 text-[14px] text-[#454545] hover:border-[#999] dark:border-slate-700 dark:text-slate-300">
                목록
              </Link>
              <WriteButton
                boardSlug={board.slug}
                isLoggedIn={!!user}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-[#5707EB] px-4 text-[15px] font-bold text-white hover:bg-[#4E07D2]"
              />
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <ProfileCard />
          <AdSlot slot="board-side" />
          <PopularList />
        </aside>
      </main>
      <Footer />
    </div>
  )
}
