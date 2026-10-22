import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/session'
import { getMyPosts, getMyComments } from '@/lib/queries/mypage'
import BackButton from '@/components/ui/back-button'
import { FileText, MessageSquare, Eye, ThumbsUp } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  if (isToday) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default async function MyPage({ searchParams }: PageProps) {
  const { tab } = await searchParams
  const activeTab = tab === 'comments' ? 'comments' : 'posts'

  // 로그인 확인
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/login?next=/mypage')
  }
  const user = { id: profile.id }

  const [posts, comments] = await Promise.all([getMyPosts(user.id), getMyComments(user.id)])

  const tabBase =
    'flex items-center justify-center gap-1.5 border-b-2 px-4 py-3 text-sm font-bold transition'
  const tabOn = 'border-[#5707EB] text-[#5707EB] dark:border-[#A78BFA] dark:text-[#A78BFA]'
  const tabOff =
    'border-transparent text-[#828B9C] hover:text-[#1A1D24] dark:text-[#94A3B8] dark:hover:text-white'

  return (
    <div className="min-h-screen bg-[#F2F4F6] px-4 py-6 dark:bg-[#0B0F19]">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {/* 상단 뒤로가기 + 타이틀 */}
        <div className="flex items-center gap-3">
          <BackButton fallbackHref="/" />
          <div>
            <h1 className="text-lg font-black text-[#1A1D24] dark:text-white">마이페이지</h1>
            <p className="text-xs font-semibold text-[#828B9C] dark:text-[#94A3B8]">
              {profile?.display_name || '회원'}
              {profile?.username ? ` · @${profile.username}` : ''}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white dark:border-[#1F2937] dark:bg-[#111827]">
          {/* 탭: 내글 / 내댓글 */}
          <div className="grid grid-cols-2 border-b border-slate-100 dark:border-[#1F2937]">
            <Link href="/mypage?tab=posts" className={`${tabBase} ${activeTab === 'posts' ? tabOn : tabOff}`}>
              <FileText className="h-4 w-4" />
              내글 <span className="text-xs font-black">{posts.length}</span>
            </Link>
            <Link href="/mypage?tab=comments" className={`${tabBase} ${activeTab === 'comments' ? tabOn : tabOff}`}>
              <MessageSquare className="h-4 w-4" />
              내댓글 <span className="text-xs font-black">{comments.length}</span>
            </Link>
          </div>

          {/* 내글 */}
          {activeTab === 'posts' && (
            <div>
              {posts.length === 0 ? (
                <p className="px-4 py-16 text-center text-sm font-semibold text-[#94A3B8]">
                  아직 작성한 글이 없습니다.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {posts.map((p: any) => (
                    <li key={p.id}>
                      <Link
                        href={`/board/${p.board_slug}/${p.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/60 dark:hover:bg-slate-800/20"
                      >
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {p.board_name}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#1A1D24] dark:text-slate-100">
                          {p.is_anonymous && <span className="mr-1 text-[10px] font-black text-[#5707EB]">[익명]</span>}
                          {p.title}
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-[11px] tabular-nums text-[#94A3B8]">
                          <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" />{p.upvotes}</span>
                          <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{p.comment_count}</span>
                          <span className="hidden items-center gap-0.5 sm:flex"><Eye className="h-3 w-3" />{p.view_count}</span>
                          <span className="w-10 text-right">{fmtDate(p.created_at)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 내댓글 */}
          {activeTab === 'comments' && (
            <div>
              {comments.length === 0 ? (
                <p className="px-4 py-16 text-center text-sm font-semibold text-[#94A3B8]">
                  아직 작성한 댓글이 없습니다.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {comments.map((c: any) => (
                    <li key={c.id}>
                      <Link
                        href={`/board/${c.board_slug}/${c.post_id}`}
                        className="block px-4 py-3 transition hover:bg-slate-50/60 dark:hover:bg-slate-800/20"
                      >
                        <p className="line-clamp-2 text-sm font-semibold text-[#1A1D24] dark:text-slate-100">
                          {c.is_anonymous && <span className="mr-1 text-[10px] font-black text-[#5707EB]">[익명]</span>}
                          {c.content}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-[#94A3B8]">
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            {c.board_name}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{c.post_title}</span>
                          <span className="shrink-0 tabular-nums">{fmtDate(c.created_at)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
