import { notFound } from 'next/navigation'
import ProfileCard from '@/components/home/profile-card'
import PopularList from '@/components/home/popular-list'
import AdSlot from '@/components/ads/ad-slot'
import SiteHeader from '@/components/layout/site-header'
import Link from 'next/link'
import { Heart, Bookmark, Share2, AlertCircle, Sparkles } from 'lucide-react'
import { getBoardBySlug, getAllBoards } from '@/lib/queries/board'
import { getPostDetail, getPostsByBoard } from '@/lib/queries/post'
import { getCommentsForPost } from '@/lib/queries/comment'
import { getCurrentProfile } from '@/lib/auth/session'
import { getTrendingPosts } from '@/lib/queries/post'
import { Metadata } from 'next'
import PostContent from '@/components/ui/post-content'
import { htmlToText } from '@/lib/sanitize-html'
import VoteButtons from '@/components/ui/vote-buttons'
import CommentSection from '@/components/ui/comment-section'
import Footer from '@/components/ui/footer'
import WriteButton from '@/components/ui/write-button'
import BackButton from '@/components/ui/back-button'
import ViewCounter from '@/components/ui/view-counter'
import { cookies } from 'next/headers'
import JsonLd from '@/components/seo/json-ld'
import { breadcrumbSchema, discussionPostingSchema } from '@/lib/seo/schema'
import { pageMeta } from '@/lib/seo/metadata'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, id } = await params
  const post = await getPostDetail(id)

  if (!post) return { title: '게시글을 찾을 수 없습니다.' }

  return pageMeta({
    title: post.title,
    description: post.content ? htmlToText(post.content).substring(0, 150) : '게시글 본문 상세 내용입니다.',
    path: `/board/${slug}/${id}`,
    type: 'article',
    publishedTime: post.created_at,
    modifiedTime: post.updated_at,
  })
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug, id } = await params
  const board = await getBoardBySlug(slug)
  const post = await getPostDetail(id)

  if (!board || !post) {
    notFound()
  }

  // 1. 세션 유저 취득
  const profile = await getCurrentProfile()
  const user = profile ? { id: profile.id } : null

  // 이 브라우저가 이 게시글에 이미 던진 표 (쿠키 기반 공개 투표)
  const cookieStore = await cookies()
  const myVoteRaw = cookieStore.get(`pv_${post.id}`)?.value
  const initialMyVote: 1 | -1 | 0 = myVoteRaw === '1' ? 1 : myVoteRaw === '-1' ? -1 : 0

  const userLevel = profile?.level || 0

  // 2. 실시간 댓글 로드
  const comments = await getCommentsForPost(id)

  // 3. 하단 목록용 전체 게시글 조회
  const siblingPosts = await getPostsByBoard(board.id, 15)

  // 4. 전체 게시판들 조회 (GNB LNB용)
  const allBoards = await getAllBoards()
  const activeBoards = allBoards.filter((b) => ['free', 'info', 'anonymous', 'coordinate', 'qna'].includes(b.slug))

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

  // 5. 작성자의 다른 최신글 조회 (익명이 아닐 때만)
  let authorRecentPosts: any[] = []
  if (!post.is_anonymous && post.author_id) {
    const { getPostsByAuthor } = await import('@/lib/queries/profile')
    const authorPosts = await getPostsByAuthor(post.author_id, 5)
    authorRecentPosts = authorPosts.filter((p: any) => p.id !== post.id)
  }

  // 6. 연관 추천 게시글 조회 (실제 인기글 연동)
  const trendingRaw = await getTrendingPosts(14, 5)
  const relatedAiPosts = trendingRaw
    .filter((p: any) => p.id !== post.id)
    .slice(0, 4)

  return (
    <div className="min-h-screen bg-[#F2F4F6] dark:bg-[#0B0F19] text-[#1E293B] dark:text-[#E2E8F0] font-sans antialiased pb-12">
      
      {/* 토론 포럼 구조화 데이터: 본문·작성자·작성/수정 시각·공개 댓글 (비밀댓글 제외) */}
      <JsonLd
        data={[
          discussionPostingSchema({
            path: `/board/${board.slug}/${post.id}`,
            headline: post.title,
            text: post.content ? htmlToText(post.content).slice(0, 5000) : post.title,
            datePublished: post.created_at,
            dateModified: post.updated_at !== post.created_at ? post.updated_at : undefined,
            authorName: post.is_anonymous ? post.anon_tag || '익명' : post.author?.display_name || '성지회원',
            authorPath: !post.is_anonymous && post.author?.username ? `/u/${post.author.username}` : null,
            commentCount: post.comment_count,
            upvotes: post.upvotes,
            comments: comments
              .filter((c) => !c.is_secret)
              .slice(0, 20)
              .map((c) => ({ text: c.content, datePublished: c.created_at, authorName: c.author_display_name })),
          }),
          breadcrumbSchema([
            { name: '홈', path: '/' },
            { name: board.name, path: `/board/${board.slug}` },
            { name: post.title, path: `/board/${board.slug}/${post.id}` },
          ]),
        ]}
      />
      <SiteHeader active={board.slug} writeSlug={board.slug} />

      {/* 3. 메인 레이아웃 (아이보스식 3단 구성) */}
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        
        {/* 본문/댓글 섹션 (8컬럼) */}
        <div className="min-w-0 space-y-5">

          {/* 방문 시 조회수 1 증가 (마운트 트리거) */}
          <ViewCounter postId={post.id} />

          {/* 뒤로가기 */}
          <div>
            <BackButton fallbackHref={`/board/${board.slug}`} />
          </div>

          {/* 게시글 본문 상세 카드 */}
          <article className="rounded-lg bg-white p-6 sm:p-8 dark:bg-[#111827] dark:border-[#1F2937] space-y-6">
            
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
              <div className="h-9 w-9 rounded-full bg-purple-50 text-[12px] text-[#5707EB] flex items-center justify-center font-bold border border-purple-100 dark:bg-slate-800 dark:text-[#A78BFA] dark:border-slate-700 shrink-0">
                {post.is_anonymous ? '익' : (post.author?.display_name ? post.author.display_name.substring(0, 1) : 'M')}
              </div>
              <div>
                <div className="flex items-center gap-1 font-bold">
                  {post.is_anonymous ? (
                    <span className="text-slate-800 dark:text-slate-200">
                      {post.anon_tag || '익명'}
                    </span>
                  ) : (
                    post.author?.username ? (
                      <Link href={`/u/${post.author.username}`} className="text-[#5707EB] dark:text-[#A78BFA] hover:underline font-extrabold transition">
                        {post.author?.display_name || '성지회원'}
                      </Link>
                    ) : (
                      <span className="text-slate-800 dark:text-slate-200">
                        {post.author?.display_name || '성지회원'}
                      </span>
                    )
                  )}
                  {!post.is_anonymous && (
                    <span className="text-[9px] text-[#5707EB] font-black">★</span>
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

            {/* 본문 (리치 에디터 HTML 또는 레거시 일반 텍스트) */}
            <PostContent content={post.content ?? ""} />

            {/* 아이보스 특유의 둥근 보라색 좋아요 버튼 */}
            <div className="pt-6 text-center border-t border-slate-100 dark:border-[#1F2937]">
              <VoteButtons
                postId={post.id}
                initialUpvotes={post.upvotes}
                initialDownvotes={post.downvotes}
                initialMyVote={initialMyVote}
              />
            </div>

            {/* 하단 텍스트 공유 / 신고 기능 바 */}
            <div className="flex items-center justify-between text-[11px] text-[#828B9C] dark:text-[#94A3B8] font-bold border-t border-slate-100 pt-4 dark:border-[#1F2937]">
              <div className="flex items-center gap-4">
                <button className="hover:text-[#5707EB] flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  <span>좋아요 {post.upvotes}</span>
                </button>
                <button className="hover:text-[#5707EB] flex items-center gap-1">
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>스크랩</span>
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button className="hover:text-[#5707EB] flex items-center gap-1">
                  <Share2 className="h-3.5 w-3.5" />
                  <span>공유</span>
                </button>
                <button className="hover:text-[#5707EB] flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>신고</span>
                </button>
              </div>
            </div>

            <AdSlot slot="post-bottom" />

          {/* 작성자 및 최신 게시글 2열 박스 */}
            <div className="border border-[#E2E8F0] p-5 rounded-2xl flex flex-col md:flex-row gap-5 dark:border-[#1F2937]">
              {/* 좌측: 작성자 이용자 정보 */}
              <div className={`${(!post.is_anonymous && authorRecentPosts.length > 0) ? 'md:w-1/2' : 'w-full'} flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800`}>
                <div className="h-14 w-14 rounded-full bg-purple-100 text-[18px] text-[#5707EB] flex items-center justify-center font-bold border border-purple-200 dark:bg-slate-700 dark:text-[#A78BFA] dark:border-slate-600 shrink-0">
                  {post.is_anonymous ? '익' : (post.author?.display_name ? post.author.display_name.substring(0, 1) : 'M')}
                </div>
                <div className="space-y-1">
                  <h5 className="text-[12px] font-black text-slate-800 dark:text-slate-100">
                    {post.is_anonymous ? (post.anon_tag || '익명') : (post.author?.display_name || '성지회원')}
                  </h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                    회원 등급: <span className="text-[#5707EB] dark:text-[#A78BFA]">Level {post.is_anonymous ? 1 : (post.author?.level || 1)}</span>
                  </p>
                  <p className="text-[9px] text-[#94A3B8] font-semibold">
                    {post.is_anonymous ? '익명 게시판 가상 프로필' : '인증 완료 정회원'}
                  </p>
                </div>
              </div>

              {/* 우측: 작성자명의 최신 게시글 리스트 */}
              {!post.is_anonymous && authorRecentPosts.length > 0 && (
                <div className="md:w-1/2 space-y-2">
                  <h5 className="text-[11px] font-black text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-[#1F2937]">
                    {post.author?.display_name || '성지회원'}님의 최신 게시글
                  </h5>
                  <ul className="text-[10px] space-y-2">
                    {authorRecentPosts.map((ap) => (
                      <li key={ap.id}>
                        <Link
                          href={`/board/free/${ap.id}`}
                          className="flex justify-between font-bold text-slate-600 dark:text-slate-300 hover:text-[#5707EB] transition"
                        >
                          <span className="truncate pr-4">{ap.title}</span>
                          <span className="shrink-0 text-slate-400">
                            {new Date(ap.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/ /g, '')}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

          </article>

          {/* 댓글 영역 */}
          <div className="rounded-lg bg-white p-6 dark:bg-[#111827] dark:border-[#1F2937] space-y-4">
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
          {relatedAiPosts.length > 0 && (
            <div className="rounded-lg bg-white p-6 dark:bg-[#111827] dark:border-[#1F2937] space-y-4">
              <h3 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 pb-3 dark:border-[#1F2937] flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-[#5707EB]" />
                <span>AI가 비슷한 글을 추천해요!</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedAiPosts.map((rp: any) => (
                  <div key={rp.id} className="p-3 border border-[#F1F5F9] rounded-xl hover:border-[#5707EB] transition dark:border-slate-800 flex items-start gap-2">
                    <div className="h-5 w-5 bg-purple-50 text-[9px] text-[#5707EB] flex items-center justify-center font-bold rounded dark:bg-slate-800 dark:text-[#A78BFA] shrink-0 mt-0.5">
                      TIP
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/board/free/${rp.id}`}
                        className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate hover:text-[#5707EB] transition block"
                      >
                        {rp.title}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 게시글 하단의 게시판 목록 리스트 테이블 연동! */}
          <div className="rounded-lg bg-white dark:bg-[#111827] dark:border-[#1F2937] overflow-hidden p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 pb-3 dark:border-[#1F2937]">
              {board.name} 최신 게시글 목록
            </h3>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {siblingPosts.map((sp: any) => {
                const isCurrent = sp.id === post.id
                return (
                  <div
                    key={sp.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-2 px-2 rounded-lg transition ${
                      isCurrent 
                        ? 'bg-purple-50/40 dark:bg-slate-800/20 border-l-2 border-[#5707EB]' 
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/10'
                    }`}
                  >
                    {/* 제목 */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCurrent && (
                          <span className="text-[9px] font-bold text-[#5707EB] shrink-0 select-none">&rarr; 읽는중</span>
                        )}
                        <Link
                          href={`/board/${board.slug}/${sp.id}`}
                          className={`text-[12px] font-bold truncate block max-w-full ${
                            isCurrent 
                              ? 'text-[#5707EB] dark:text-[#A78BFA]' 
                              : 'text-slate-800 dark:text-slate-100 hover:text-[#5707EB] dark:hover:text-[#A78BFA] transition'
                          }`}
                        >
                          {sp.title}
                        </Link>
                        {sp.comment_count > 0 && (
                          <span className="text-[10px] font-black text-[#5707EB] dark:text-[#A78BFA] shrink-0">
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
                      <span className="w-6 text-right font-black text-[#5707EB] dark:text-[#A78BFA]">
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

        {/* 우측 사이드바 (아이보스: 360px) */}
        <aside className="space-y-5">
          <ProfileCard />
          <AdSlot slot="post-side" />
          <PopularList />
        </aside>

      </main>

      {/* 공통 푸터 */}
      <Footer />
    </div>
  )
}
