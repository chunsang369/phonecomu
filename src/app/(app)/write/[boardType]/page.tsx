import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getBoardBySlug } from '@/lib/queries/board'
import { getPostsByBoard } from '@/lib/queries/post'
import WriteForm from './write-form'
import BackButton from '@/components/ui/back-button'

interface PageProps {
  params: Promise<{ boardType: string }>
}

// 목록용 날짜 포맷 (오늘이면 HH:mm, 아니면 MM.DD)
function formatListDate(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  if (isToday) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

export default async function WritePage({ params }: PageProps) {
  const { boardType } = await params
  // 성지 평가 후기는 구조화된 후기 폼으로만 작성
  if (boardType === 'review') redirect('/seongji/write')
  const board = await getBoardBySlug(boardType)

  if (!board) {
    notFound()
  }

  // 글 적는 창 아래에 보여줄 같은 게시판의 다른 게시글 목록
  const recentPosts = await getPostsByBoard(board.id, 15)

  return (
    <div className="mx-auto w-full max-w-3xl pb-28 md:px-4 md:py-8 md:pb-8">
      {/* 상단 뒤로가기 + 게시판명 */}
      <div className="flex items-center gap-3 px-3 pt-3 md:px-0 md:pt-0 md:mb-4">
        <BackButton fallbackHref={`/board/${board.slug}`} />
        <span className="text-sm font-black text-[#1A1D24] dark:text-[#F1F5F9]">{board.name} 글쓰기</span>
      </div>

      <WriteForm board={board} />

      {/* 글 적는 창 아래: 같은 게시판의 다른 게시글 목록 */}
      <div className="mt-6 rounded-xl border border-[#E5E8EC] bg-white px-3 py-4 md:px-6 dark:border-[#334155] dark:bg-[#151E2E]">
        <h3 className="mb-3 border-b border-slate-100 pb-3 text-xs font-black text-slate-800 dark:border-[#1F2937] dark:text-white">
          {board.name}의 다른 게시글
        </h3>

        {recentPosts.length === 0 ? (
          <p className="py-6 text-center text-xs font-semibold text-[#94A3B8]">아직 등록된 게시글이 없습니다.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentPosts.map((sp: any) => (
              <Link
                key={sp.id}
                href={`/board/${board.slug}/${sp.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-slate-50/60 dark:hover:bg-slate-800/20"
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate text-[12px] font-bold text-slate-800 hover:text-[#7C3AED] dark:text-slate-100 dark:hover:text-[#A78BFA]">
                    {sp.title}
                  </span>
                  {sp.comment_count > 0 && (
                    <span className="shrink-0 text-[10px] font-black text-[#7C3AED] dark:text-[#A78BFA]">
                      {sp.comment_count}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-4 text-[10px] font-semibold text-[#828B9C] dark:text-[#94A3B8]">
                  <span className="hidden sm:inline">
                    {sp.is_anonymous ? '익명' : sp.author?.display_name || '성지회원'}
                  </span>
                  <span className="w-10 text-center">{formatListDate(sp.created_at)}</span>
                  <span className="w-8 text-right">조회 {sp.view_count?.toLocaleString?.() ?? sp.view_count}</span>
                  <span className="w-6 text-right font-black text-[#7C3AED] dark:text-[#A78BFA]">{sp.upvotes}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-slate-100 pt-4 text-center dark:border-[#1F2937]">
          <Link
            href={`/board/${board.slug}`}
            className="inline-block rounded-lg border border-[#CBD5E1] px-5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {board.name} 전체 목록 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
