import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBoardBySlug, getAllBoards } from '@/lib/queries/board'
import { getPostsByBoard } from '@/lib/queries/post'
import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import AnonBadge from '@/components/ui/anon-badge'
import { PenTool, Search, Smartphone, Calendar, ChevronDown, User, MessageSquare } from 'lucide-react'
import Footer from '@/components/ui/footer'
import WriteButton from '@/components/ui/write-button'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const board = await getBoardBySlug(slug)

  if (!board) return { title: '게시판을 찾을 수 없습니다.' }

  return {
    title: `${board.name} - ${process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'}`,
    description: board.description || `${board.name} 게시판 목록입니다.`,
    alternates: {
      canonical: `/board/${slug}`,
    },
  }
}

export default async function BoardPage({ params }: PageProps) {
  const { slug } = await params
  const board = await getBoardBySlug(slug)

  if (!board) {
    notFound()
  }

  // 1. 게시판들 전체 조회 (서브 카테고리 탭 생성용)
  const allBoards = await getAllBoards()
  const activeBoards = allBoards.filter(b => ['free', 'info', 'anonymous', 'coordinate', 'qna'].includes(b.slug))

  // 2. 게시글 목록 로드
  const posts = await getPostsByBoard(board.id)

  // 3. 로그인 유저 권한 조회
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let userLevel = 0
  if (user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = prof
    userLevel = profile?.level || 1
  }

  const canWrite = userLevel >= board.write_min_level
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'

  // 실시간 인기글 1~5위 더미
  const sidebarPopularPosts = [
    { rank: 1, title: '갤럭시 S26 당일 엠바고 풀린 지원금 정리', comments: 12 },
    { rank: 2, title: '선택약정 25% 온가족할인 중복 적용법', comments: 5 },
    { rank: 3, word: '신도림 성지 대란 좌표 급구', comments: 19 },
    { rank: 4, title: '제휴카드 추가할인 카드사별 실속 비교', comments: 8 },
    { rank: 5, title: '자급제 성지 단가 계산하는 공식표 공유', comments: 3 }
  ]

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

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0B0F19] text-[#1E293B] dark:text-[#E2E8F0] font-sans antialiased pb-12">
      
      {/* 1. 최상단 차콜 탭 바 */}
      <div className="bg-[#2D2F34] text-[#B0B3B8] text-xs font-bold py-2 px-4 dark:bg-[#111317]">
        <div className="mx-auto max-w-7xl flex items-center gap-6 overflow-x-auto">
          <Link href="/" className="text-white font-extrabold pr-4 border-r border-slate-600">폰커뮤니티</Link>
          <Link href="/board/info" className="hover:text-white transition">정보게시판</Link>
          <Link href="/board/free" className="hover:text-white transition">자유게시판</Link>
          <Link href="/board/anonymous" className="hover:text-white transition">익명게시판</Link>
          <Link href="/board/coordinate" className="hover:text-white transition">지역별 시세표</Link>
          <Link href="/board/qna" className="hover:text-white transition">질문/답변게시판</Link>
        </div>
      </div>

      {/* 2. GNB 헤더 영역 */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white shadow-sm dark:bg-[#111827] dark:border-[#1F2937]">
        <div className="mx-auto flex h-20 items-center justify-between px-4 sm:px-6 max-w-7xl gap-6">
          <div className="flex items-center gap-6 flex-1">
            <Link href="/" className="text-2xl font-black text-[#1A1D24] dark:text-[#F3F4F6] tracking-tight shrink-0 flex items-center gap-1">
              <Smartphone className="h-6 w-6 text-[#7C3AED]" />
              <span>{siteName.toUpperCase()}</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* 돋보기 인풋창 */}
            <div className="relative max-w-[180px] sm:max-w-xs w-full">
              <input
                type="text"
                placeholder="검색"
                className="w-full rounded border border-[#CBD5E1] bg-white pl-3 pr-8 py-1.5 text-xs focus:border-[#7C3AED] focus:outline-none dark:border-[#374151] dark:bg-[#1F2937] dark:text-[#F3F4F6]"
              />
              <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#94A3B8] cursor-pointer" />
            </div>

            <WriteButton boardSlug={board.slug} isLoggedIn={!!user} />
          </div>
        </div>
      </header>

      {/* 3. 메인 콘텐츠 그리드 (아이보스식 3단 구성) */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* 중앙 게시글 섹션 (8컬럼) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 게시판 기본 정보 카드 */}
          <div className="rounded-2xl border border-[#E5E8EC] bg-white p-6 shadow-sm dark:bg-[#111827] dark:border-[#1F2937] space-y-4">
            <div>
              <span className="text-[10px] font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider">BOARD VIEW</span>
              <h1 className="text-2xl font-black text-[#1A1D24] dark:text-white mt-1">
                {board.name}
              </h1>
              {board.description && (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {board.description}
                </p>
              )}
            </div>

            {/* 아이보스 스타일 게시판 스위처 둥근 버튼 바 */}
            <div className="flex items-center gap-2 flex-wrap border-t border-slate-100 pt-4 dark:border-[#1F2937]">
              <Link
                href="/"
                className="border border-[#CBD5E1] text-[#5B6472] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                전체보기
              </Link>
              {activeBoards.map((b) => {
                const isActive = b.slug === board.slug
                return (
                  <Link
                    key={b.id}
                    href={`/board/${b.slug}`}
                    className={`px-4.5 py-1.5 rounded-full text-xs font-bold transition ${
                      isActive 
                        ? 'bg-[#1A1D24] text-white dark:bg-white dark:text-[#1A1D24]' 
                        : 'border border-[#CBD5E1] text-[#5B6472] hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {b.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* 게시글 리스트 보드 */}
          <div className="rounded-2xl border border-[#E5E8EC] bg-white shadow-sm dark:bg-[#111827] dark:border-[#1F2937] overflow-hidden p-4 sm:p-6">
            {posts.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                  아직 등록된 게시글이 없습니다.<br />첫 번째 글을 작성해 보세요!
                </p>
              </div>
            ) : (
              /* 아이보스식 초정밀 미니멀리즘 리스트 */
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 px-2 rounded-lg transition"
                  >
                    {/* 제목 영역 */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/board/${board.slug}/${post.id}`}
                          className="text-[13px] font-bold text-slate-800 hover:text-[#7C3AED] dark:text-slate-100 dark:hover:text-[#A78BFA] transition truncate block max-w-full"
                        >
                          {post.title}
                        </Link>
                        {post.comment_count > 0 && (
                          <span className="text-[11px] font-black text-[#7C3AED] dark:text-[#A78BFA] shrink-0">
                            {post.comment_count}
                          </span>
                        )}
                        {post.is_anonymous ? (
                          <AnonBadge tag={post.anon_tag || '익명'} />
                        ) : null}
                      </div>
                    </div>

                    {/* 메타 정보 영역 (우측 정렬 배치) */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 text-[11px] text-[#828B9C] dark:text-[#94A3B8]">
                      
                      {/* 작성자 아바타 칩 */}
                      <div className="flex items-center gap-1.5 font-bold relative z-20">
                        <div className="h-4.5 w-4.5 rounded-full bg-purple-50 text-[9px] text-[#7C3AED] flex items-center justify-center font-bold border border-purple-100 dark:bg-slate-800 dark:text-[#A78BFA] dark:border-slate-700">
                          {post.is_anonymous ? '익' : (post.author?.display_name ? post.author.display_name.substring(0, 1) : 'M')}
                        </div>
                        {post.is_anonymous ? (
                          <span className="text-slate-700 dark:text-slate-300">
                            {post.anon_tag || '익명'}
                          </span>
                        ) : (
                          post.author?.username ? (
                            <Link href={`/u/${post.author.username}`} className="text-[#7C3AED] dark:text-[#A78BFA] hover:underline font-extrabold transition">
                              {post.author?.display_name || '성지회원'}
                            </Link>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300">
                              {post.author?.display_name || '성지회원'}
                            </span>
                          )
                        )}
                        {!post.is_anonymous && (
                          <span className="text-[9px] text-[#7C3AED] font-black">★</span>
                        )}
                      </div>

                      {/* 등록 시간 */}
                      <span className="w-10 text-center font-semibold">
                        {formatBoardDate(post.created_at)}
                      </span>

                      {/* 조회수 */}
                      <span className="w-12 text-center font-semibold">
                        {post.view_count.toLocaleString()}
                      </span>

                      {/* 추천수 (보라색 볼드 강조) */}
                      <span className="w-8 text-right font-black text-[#7C3AED] dark:text-[#A78BFA] text-xs">
                        {post.upvotes}
                      </span>

                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* 하단 글쓰기 및 목록 버튼 컨트롤러 */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#1F2937] mt-4">
              <Link
                href={`/board/${board.slug}`}
                className="px-5 py-2 border border-[#CBD5E1] rounded text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition bg-white dark:bg-transparent"
              >
                목록
              </Link>
              <WriteButton boardSlug={board.slug} isLoggedIn={!!user} />
            </div>
          </div>

        </div>

        {/* 우측 사이드바 섹션 (4컬럼) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 로그인 카드 */}
          <div className="rounded-2xl border border-[#E5E8EC] bg-white shadow-sm dark:bg-[#111827] dark:border-[#1F2937] overflow-hidden">
            {user ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full border border-slate-100 bg-[#FAF8FE] dark:bg-[#1E1B4B] overflow-hidden flex items-center justify-center font-bold text-[#7C3AED] text-lg">
                      {profile?.display_name ? profile.display_name.substring(0, 1) : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-extrabold text-[#1A1D24] dark:text-white">
                          {profile?.display_name || '성지회원님'}
                        </h4>
                        <span className="text-[9px] text-[#94A3B8]">@ {profile?.username || 'unknown'}</span>
                      </div>
                      <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                        <span>접속중</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3단 정보 칩 그리드 */}
                <div className="grid grid-cols-3 gap-2.5 text-center text-[10px] font-bold">
                  <div className="rounded-lg bg-[#FAF8FE] py-2.5 border border-[#F5F3FF] dark:bg-[#1E1B4B]/20 dark:border-[#312E81]">
                    <p className="text-[#94A3B8]">활동 포인트</p>
                    <p className="mt-0.5 text-sm text-[#7C3AED] dark:text-[#A78BFA]">{profile?.activity_points || 0} 리터</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2.5 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                    <p className="text-[#94A3B8]">작성글 수</p>
                    <p className="mt-0.5 text-sm text-[#1A1D24] dark:text-white">1 게시</p>
                  </div>
                  <div className="rounded-lg bg-[#F5F3FF]/10 py-2.5 border border-[#F5F3FF] dark:bg-[#1E1B4B]/20 dark:border-[#312E81]">
                    <p className="text-[#94A3B8]">회원 등급</p>
                    <p className="mt-0.5 text-sm text-[#7C3AED] dark:text-[#A78BFA]">LV.{profile?.level || 1}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="text-center py-4 border-b border-[#E5E8EC] dark:border-[#1F2937]">
                  <span className="text-xl font-black tracking-tight text-[#1A1D24] dark:text-white uppercase">
                    {siteName} <span className="text-[#7C3AED] text-sm">LOGIN</span>
                  </span>
                </div>

                <Link
                  href="/login"
                  className="block w-full text-center rounded bg-[#7C3AED] py-3 text-xs font-bold text-white hover:bg-[#6D28D9] transition"
                >
                  로그인
                </Link>

                <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 pt-2">
                  <Link href="/login" className="hover:text-[#7C3AED]">회원가입</Link>
                  <span>|</span>
                  <Link href="/login" className="hover:text-[#7C3AED]">계정찾기</Link>
                </div>
              </div>
            )}
          </div>

          {/* 비주얼 카드 배너 */}
          <div className="rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] p-6 border border-[#7C3AED] relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[140px] text-white">
            <div>
              <span className="inline-block rounded bg-white/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                COMMUNITY EVENT
              </span>
              <h4 className="mt-3 text-sm font-black leading-snug">
                전국 휴대폰 대란 정보방<br />우수 구매 후기 2026 어워드
              </h4>
            </div>
            <button className="mt-4 rounded bg-white px-3 py-1.5 text-[10px] font-extrabold text-[#7C3AED] w-max hover:bg-slate-50 transition">
              자세히 보기 &rarr;
            </button>
          </div>

          {/* 인기글 위젯 */}
          <div className="rounded-2xl border border-[#E5E8EC] bg-white p-6 shadow-sm dark:bg-[#111827] dark:border-[#1F2937] space-y-4">
            <h3 className="text-xs font-black text-[#1A1D24] dark:text-white pb-3 border-b border-[#F1F5F9] dark:border-[#1F2937]">
              지금 인기글
            </h3>
            
            <ul className="text-xs space-y-3">
              {sidebarPopularPosts.map((p, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-black text-[#7C3AED] shrink-0 w-4 text-center">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-700 dark:text-slate-300 truncate hover:text-[#7C3AED] cursor-pointer">
                      {p.title || '갤럭시 대란 변동 분석'}
                    </p>
                  </div>
                  {p.comments > 0 && (
                    <span className="text-[10px] font-bold text-[#7C3AED] shrink-0">
                      {p.comments}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>

      </main>
      <Footer />
    </div>
  )
}
