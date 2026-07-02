import Link from 'next/link'
import type { Metadata } from 'next'
import { searchPosts } from '@/lib/queries/search'
import { getAllBoards } from '@/lib/queries/board'
import { Search, MessageSquare, Eye, ThumbsUp } from 'lucide-react'
import AnonBadge from '@/components/ui/anon-badge'
import Footer from '@/components/ui/footer'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `'${q}' 검색 결과 | ${SITE}` : `통합 검색 | ${SITE}`,
    // 검색 결과 페이지는 얇은 중복 콘텐츠 → 색인 제외가 SEO 정석
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const query = (q ?? '').trim()

  const [results, boards] = await Promise.all([
    query.length >= 2 ? searchPosts(query) : Promise.resolve([]),
    getAllBoards(),
  ])
  const boardMap = new Map(boards.map((b: any) => [b.id, b]))

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-4xl px-4 py-8 w-full">
        <h1 className="text-xl font-bold">통합 검색</h1>

        {/* GET 폼 — JS 없이도 동작 (크롤러·저사양 친화) */}
        <form action="/search" method="get" role="search" className="mt-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800 px-4 py-3 focus-within:border-slate-500">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="제목·본문 검색 (2자 이상)"
              minLength={2}
              required
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              aria-label="검색어 입력"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-slate-600"
            >
              검색
            </button>
          </div>
        </form>

        {/* 결과 */}
        <section className="mt-6" aria-live="polite">
          {query.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">
              찾고 싶은 시세·후기·질문 키워드를 입력하세요.
            </p>
          ) : query.length < 2 ? (
            <p className="py-16 text-center text-sm text-slate-500">검색어를 2자 이상 입력하세요.</p>
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/50 p-12 text-center">
              <p className="text-sm text-slate-300">'{query}'에 대한 결과가 없습니다.</p>
              <p className="mt-2 text-xs text-slate-500">
                아직 아무도 다루지 않은 주제라면, 직접 첫 글의 주인공이 되어보세요.
              </p>
              <Link
                href="/write/free"
                className="mt-4 inline-block rounded-lg bg-slate-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-600"
              >
                이 주제로 글쓰기
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-slate-400">
                '{query}' 검색 결과 <b className="tabular-nums">{results.length}</b>건
              </p>
              <ul className="divide-y divide-slate-700/60 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800">
                {results.map((post: any) => {
                  const board: any = boardMap.get(post.board_id)
                  return (
                    <li key={post.id}>
                      <Link
                        href={`/board/${board?.slug ?? 'free'}/${post.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-700/40"
                      >
                        <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                          {board?.name ?? '게시판'}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{post.title}</span>
                        <span className="hidden shrink-0 items-center gap-1 text-[11px] text-slate-500 sm:flex">
                          {post.is_anonymous ? (
                            <AnonBadge tag={post.anon_tag || '익명'} />
                          ) : (
                            <span>{post.author_display_name ?? '알 수 없음'}</span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-[11px] tabular-nums text-slate-500">
                          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" aria-hidden />{post.upvotes}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" aria-hidden />{post.comment_count}</span>
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" aria-hidden />{post.view_count}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      </div>
      <Footer />
    </main>
  )
}
