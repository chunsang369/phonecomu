import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublicProfile, getPostsByAuthor } from '@/lib/queries/profile'
import { getAllBoards } from '@/lib/queries/board'
import { User, MessageSquare, Eye, ThumbsUp, Award, ShieldCheck, CalendarDays } from 'lucide-react'
import Footer from '@/components/ui/footer'

interface PageProps {
  params: Promise<{ username: string }>
}

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getPublicProfile(decodeURIComponent(username))
  if (!profile) return { title: '회원을 찾을 수 없습니다' }
  return {
    title: `${profile.display_name} (@${profile.username}) 활동 프로필 | ${SITE}`,
    description: `${profile.display_name}님의 등급 Lv.${profile.level}, 채택 ${profile.adopted_count}회 활동 이력과 작성글 목록.`,
    alternates: { canonical: `/u/${profile.username}` },
  }
}

/** 등급 → 라벨/색 (levels 시드와 동기화) */
function levelBadge(level: number) {
  const map: Record<number, { name: string; cls: string }> = {
    1: { name: '새싹', cls: 'bg-emerald-900/60 text-emerald-300 border-emerald-700' },
    2: { name: '일반', cls: 'bg-sky-900/60 text-sky-300 border-sky-700' },
    3: { name: '우수', cls: 'bg-indigo-900/60 text-indigo-300 border-indigo-700' },
    4: { name: '고수', cls: 'bg-violet-900/60 text-violet-300 border-violet-700' },
    5: { name: '장인', cls: 'bg-amber-900/60 text-amber-300 border-amber-700' },
    6: { name: '마스터', cls: 'bg-rose-900/60 text-rose-300 border-rose-700' },
  }
  return map[Math.max(1, Math.min(level, 6))] ?? map[1]
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params
  const profile = await getPublicProfile(decodeURIComponent(username))
  if (!profile) notFound()

  const [posts, boards] = await Promise.all([
    getPostsByAuthor(profile.id),
    getAllBoards(),
  ])
  const boardMap = new Map(boards.map((b: any) => [b.id, b]))
  const badge = levelBadge(profile.level)
  const joinedAt = new Date(profile.created_at)

  // SEO: Person 구조화 데이터
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.display_name,
    alternateName: profile.username,
    url: `/u/${profile.username}`,
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-4xl px-4 py-8 w-full">
        {/* ── 평판 카드 (i-boss 벤치마크: 등급·채택·신뢰의 상시 시각화) ── */}
        <section className="rounded-xl border border-slate-700/60 bg-slate-800 p-6">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {/* 아바타 */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-600 bg-slate-700">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={`${profile.display_name} 프로필 이미지`} className="h-full w-full object-cover" />
              ) : (
                <User className="h-9 w-9 text-slate-400" aria-hidden />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold">{profile.display_name}</h1>
                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                  Lv.{profile.level} {badge.name}
                </span>
                {profile.role !== 'member' && (
                  <span className="rounded-md border border-slate-600 bg-slate-700 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                    {profile.role === 'seller' ? '인증 판매자' : profile.role === 'moderator' ? '운영진' : '관리자'}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-slate-400">@{profile.username}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {joinedAt.getFullYear()}년 {joinedAt.getMonth() + 1}월 가입
              </p>
            </div>
          </div>

          {/* 평판 지표 3종 */}
          <dl className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 text-center">
              <dt className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                <Award className="h-3.5 w-3.5" aria-hidden /> 답변 채택
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums">{profile.adopted_count}회</dd>
            </div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 text-center">
              <dt className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> 신뢰 지수
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums">{Number(profile.trust_score).toFixed(1)}</dd>
            </div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 text-center">
              <dt className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden /> 공개 작성글
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums">{posts.length}개</dd>
            </div>
          </dl>
        </section>

        {/* ── 작성글 목록 (익명글은 DB 뷰 차원에서 제외됨 — 익명 보호) ── */}
        <section className="mt-8">
          <h2 className="mb-3 text-base font-bold text-slate-200">최근 작성글</h2>
          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/50 p-10 text-center">
              <p className="text-sm text-slate-400">아직 공개 작성글이 없습니다.</p>
              <p className="mt-1 text-xs text-slate-500">익명으로 작성한 글은 본인 보호를 위해 프로필에 표시되지 않습니다.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/60 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800">
              {posts.map((post: any) => {
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
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{post.title}</span>
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
          )}
        </section>
      </div>
      <Footer />
    </main>
  )
}
