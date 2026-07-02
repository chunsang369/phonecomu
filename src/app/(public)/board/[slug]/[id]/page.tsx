import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBoardBySlug, getAllBoards } from '@/lib/queries/board'
import { getPostDetail, getPostsByBoard } from '@/lib/queries/post'
import { getCommentsForPost } from '@/lib/queries/comment'
import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import AnonBadge from '@/components/ui/anon-badge'
import VoteButtons from '@/components/ui/vote-buttons'
import CommentSection from '@/components/ui/comment-section'
import Footer from '@/components/ui/footer'
import { PenTool, Search, Smartphone, Calendar, ChevronDown, User, MessageSquare, Heart, Bookmark, Share2, AlertCircle, Sparkles } from 'lucide-react'
import WriteButton from '@/components/ui/write-button'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, id } = await params
  const post = await getPostDetail(id)

  if (!post) return { title: '게시글을 찾을 수 없습니다.' }

  return {
    title: `${post.title} - ${process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'}`,
    description: post.content ? post.content.substring(0, 150) : '게시글 본문 상세 내용입니다.',
    alternates: {
      canonical: `/board/${slug}/${id}`,
    },
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug, id } = await params
  const board = await getBoardBySlug(slug)
  const post = await getPostDetail(id)

  if (!board || !post) {
    notFound()
  }

  // 1. 세션 유저 취득
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

  // 2. 실시간 댓글 로드
  const comments = await getCommentsForPost(id)

  // 3. 하단 목록용 전체 게시글 조회
  const siblingPosts = await getPostsByBoard(board.id, 15)

  // 4. 전체 게시판들 조회 (GNB LNB용)
  const allBoards = await getAllBoards()
  const activeBoards = allBoards.filter(b => ['free', 'info', 'anonymous', 'coordinate', 'qna'].includes(b.slug))

  const canWrite = userLevel >= board.write_min_level
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'

  // 날짜 포맷 함수
  const formatBoardDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const isToday = 
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()

    if (isToday) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    } else {
      return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
    }
  }

  // AI 연관 추천 게시글 모조 데이터
  const relatedAiPosts = [
    { title: '갤럭시 자급제 공시지원금 인상 기사 분석', date: '2026.06.28', author: '대란예언가' },
    { title: '제휴카드는 상술일까 아닐까?', date: '2026.06.30', author: '호갱탈출러' },
    { title: '아이폰 17 기기변경 당일 징 30만원 스팟 후기', date: '2026.07.01', author: '아이폰기변' },
    { title: '7월 번호이동 보조금 스팟 단가 실시간 예측표', date: '2026.07.01', author: '단가분석봇' },
    { title: '신도림 테크노마트 은어 및 대화 노하우 공유', date: '2026.06.27', author: '성지마스터' }
  ]

  // 작성자의 다른 최신 게시글 모조
  const authorRecentPosts = [
    { title: '이번 달 최신 공시지원금 변동 일람', time: '14:17' }
  ]

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
            {/* 검색창 */}
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

        {/* LNB 카테고리 바 */}
        <div className="border-t border-[#F1F5F9] bg-[#FAFBFD] dark:bg-[#0F172A] dark:border-[#1F2937] relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <nav className="flex items-center gap-6 text-xs font-bold text-[#475569] dark:text-[#94A3B8]">
              <Link href="/" className="hover:text-[#7C3AED] py-3 shrink-0 transition">
                커뮤니티 홈
              </Link>
              {activeBoards.map((b) => {
                const isSelected = b.slug === board.slug
                return (
                  <Link
                    key={b.id}
                    href={`/board/${b.slug}`}
                    className={`py-3 shrink-0 transition ${
                      isSelected 
                        ? 'text-[#7C3AED] dark:text-[#A78BFA] border-b-2 border-[#7C3AED] dark:border-[#A78BFA]' 
                        : 'hover:text-[#7C3AED]'
                    }`}
                  >
                    {b.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* 3. 메인 레이아웃 (아이보스식 3단 구성) */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* 본문/댓글 섹션 (8컬럼) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 게시글 본문 상세 카드 */}
          <article className="rounded-2xl border border-[#E5E8EC] bg-white p-6 sm:p-8 shadow-sm dark:bg-[#111827] dark:border-[#1F2937] space-y-6">
            
            {/* 게시판 분류 배지 */}
            <span className="inline-block rounded-full bg-slate-100 text-slate-500 px-3 py-1 text-[10px] font-black dark:bg-[#1F2937] dark:text-[#94A3B8]">
              {board.name}
            </span>

            {/* 글 제목 */}
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1A1D24] dark:text-white leading-snug">
              {post.title}
            </h1>

            {/* 작성자 및 메타 정보 */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5 dark:border-[#1F2937] text-[11px] text-[#828B9C] dark:text-[#94A3B8]">
              <div className="h-9 w-9 rounded-full bg-purple-50 text-[12px] text-[#7C3AED] flex items-center justify-center font-bold border border-purple-100 dark:bg-slate-800 dark:text-[#A78BFA] dark:border-slate-700 shrink-0">
                {post.is_anonymous ? '익' : (post.author?.display_name ? post.author.display_name.substring(0, 1) : 'M')}
              </div>
              <div>
                <div className="flex items-center gap-1 font-bold">
                  <span className="text-slate-800 dark:text-slate-200">
                    {post.is_anonymous ? (post.anon_tag || '익명') : (post.author?.display_name || '성지회원')}
                  </span>
                  {!post.is_anonymous && (
                    <span className="text-[9px] text-[#7C3AED] font-black">★</span>
                  )}
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 font-semibold">
                  <span>{new Date(post.created_at).toISOString().split('T')[0]}</span>
                  <span>•</span>
                  <span>조회수 {post.view_count}</span>
                  <span>•</span>
                  <span>좋아요 {post.upvotes}</span>
                  <span>•</span>
                  <span>댓글 {post.comment_count}</span>
                </p>
              </div>
            </div>

            {/* 본문 텍스트 (줄간격 1.6, 15px) */}
            <div className="prose max-w-none text-[15px] leading-[1.6] text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium">
              {post.content}
            </div>

            {/* 아이보스 특유의 둥근 보라색 좋아요 버튼 */}
            <div className="pt-6 text-center border-t border-slate-100 dark:border-[#1F2937]">
              <VoteButtons
                postId={post.id}
                initialUpvotes={post.upvotes}
                initialDownvotes={post.downvotes}
                currentUserId={user?.id || null}
              />
            </div>

            {/* 하단 텍스트 공유 / 신고 기능 바 */}
            <div className="flex items-center justify-between text-[11px] text-[#828B9C] dark:text-[#94A3B8] font-bold border-t border-slate-100 pt-4 dark:border-[#1F2937]">
              <div className="flex items-center gap-4">
                <button className="hover:text-[#7C3AED] flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  <span>좋아요 {post.upvotes}</span>
                </button>
                <button className="hover:text-[#7C3AED] flex items-center gap-1">
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>스크랩</span>
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button className="hover:text-[#7C3AED] flex items-center gap-1">
                  <Share2 className="h-3.5 w-3.5" />
                  <span>공유</span>
                </button>
                <button className="hover:text-[#7C3AED] flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>신고</span>
                </button>
              </div>
            </div>

            {/* 작성자 및 최신 게시글 2열 박스 */}
            <div className="border border-[#E2E8F0] p-5 rounded-2xl flex flex-col md:flex-row gap-5 dark:border-[#1F2937]">
              {/* 좌측: 작성자 이용자 정보 */}
              <div className="md:w-1/2 flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="h-14 w-14 rounded-full bg-purple-100 text-[18px] text-[#7C3AED] flex items-center justify-center font-bold border border-purple-200 dark:bg-slate-700 dark:text-[#A78BFA] dark:border-slate-600 shrink-0">
                  {post.is_anonymous ? '익' : (post.author?.display_name ? post.author.display_name.substring(0, 1) : 'M')}
                </div>
                <div className="space-y-1">
                  <h5 className="text-[12px] font-black text-slate-800 dark:text-slate-100">
                    {post.is_anonymous ? (post.anon_tag || '익명') : (post.author?.display_name || '성지회원')}
                  </h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                    회원 등급: <span className="text-[#7C3AED] dark:text-[#A78BFA]">Level {post.is_anonymous ? 1 : (post.author?.level || 1)}</span>
                  </p>
                  <p className="text-[9px] text-[#94A3B8] font-semibold">
                    {post.is_anonymous ? '익명 게시판 가상 프로필' : '인증 완료 정회원'}
                  </p>
                </div>
              </div>

              {/* 우측: 작성자명의 최신 게시글 리스트 */}
              <div className="md:w-1/2 space-y-2">
                <h5 className="text-[11px] font-black text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-[#1F2937]">
                  {post.is_anonymous ? (post.anon_tag || '익명') : (post.author?.display_name || '성지회원')}님의 최신 게시글
                </h5>
                <ul className="text-[10px] space-y-2">
                  {authorRecentPosts.map((ap, idx) => (
                    <li key={idx} className="flex justify-between font-bold text-slate-600 dark:text-slate-300 hover:text-[#7C3AED] cursor-pointer">
                      <span className="truncate pr-4">{ap.title}</span>
                      <span className="shrink-0 text-slate-400">{ap.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </article>

          {/* 댓글 영역 */}
          <div className="rounded-2xl border border-[#E5E8EC] bg-white p-6 shadow-sm dark:bg-[#111827] dark:border-[#1F2937] space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 pb-3 dark:border-[#1F2937]">
              댓글 {comments.length}
            </h3>
            
            <CommentSection
              postId={post.id}
              comments={comments}
              currentUserId={user?.id || null}
            />
          </div>

          {/* AI 추천 연관글 위젯 */}
          <div className="rounded-2xl border border-[#E5E8EC] bg-white p-6 shadow-sm dark:bg-[#111827] dark:border-[#1F2937] space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 pb-3 dark:border-[#1F2937] flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-[#7C3AED]" />
              <span>AI가 비슷한 글을 추천해요!</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedAiPosts.map((rp, idx) => (
                <div key={idx} className="p-3 border border-[#F1F5F9] rounded-xl hover:border-[#7C3AED] transition dark:border-slate-800 flex items-start gap-2">
                  <div className="h-5 w-5 bg-purple-50 text-[9px] text-[#7C3AED] flex items-center justify-center font-bold rounded dark:bg-slate-800 dark:text-[#A78BFA] shrink-0 mt-0.5">
                    TIP
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate hover:text-[#7C3AED] cursor-pointer">
                      {rp.title}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1">
                      {rp.date} • {rp.author}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 게시글 하단의 게시판 목록 리스트 테이블 연동! */}
          <div className="rounded-2xl border border-[#E5E8EC] bg-white shadow-sm dark:bg-[#111827] dark:border-[#1F2937] overflow-hidden p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 pb-3 dark:border-[#1F2937]">
              {board.name} 최신 게시글 목록
            </h3>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {siblingPosts.map((sp) => {
                const isCurrent = sp.id === post.id
                return (
                  <div
                    key={sp.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-2 px-2 rounded-lg transition ${
                      isCurrent 
                        ? 'bg-purple-50/40 dark:bg-slate-800/20 border-l-2 border-[#7C3AED]' 
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/10'
                    }`}
                  >
                    {/* 제목 */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCurrent && (
                          <span className="text-[9px] font-bold text-[#7C3AED] shrink-0 select-none">&rarr; 읽는중</span>
                        )}
                        <Link
                          href={`/board/${board.slug}/${sp.id}`}
                          className={`text-[12px] font-bold truncate block max-w-full ${
                            isCurrent 
                              ? 'text-[#7C3AED] dark:text-[#A78BFA]' 
                              : 'text-slate-800 dark:text-slate-100 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition'
                          }`}
                        >
                          {sp.title}
                        </Link>
                        {sp.comment_count > 0 && (
                          <span className="text-[10px] font-black text-[#7C3AED] dark:text-[#A78BFA] shrink-0">
                            {sp.comment_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 메타 */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 text-[10px] text-[#828B9C] dark:text-[#94A3B8]">
                      
                      {/* 작성자 */}
                      <div className="flex items-center gap-1 font-bold">
                        <span className="text-slate-700 dark:text-slate-300">
                          {sp.is_anonymous ? '익명' : (sp.author?.display_name || '성지회원')}
                        </span>
                      </div>

                      {/* 작성일 */}
                      <span className="w-10 text-center font-semibold">
                        {formatBoardDate(sp.created_at)}
                      </span>

                      {/* 조회수 */}
                      <span className="w-10 text-center font-semibold">
                        {sp.view_count.toLocaleString()}
                      </span>

                      {/* 추천 */}
                      <span className="w-6 text-right font-black text-[#7C3AED] dark:text-[#A78BFA]">
                        {sp.upvotes}
                      </span>

                    </div>
                  </div>
                )
              })}
            </div>
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

        {/* 우측 사이드바 (4컬럼) */}
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

          {/* 광고 배너 */}
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

        </div>

      </main>

      {/* 공통 푸터 */}
      <Footer />
    </div>
  )
}
