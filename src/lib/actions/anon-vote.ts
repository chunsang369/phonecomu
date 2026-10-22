'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { one } from '@/lib/db'

// 로그인 없이 누구나 좋아요/다른의견을 누를 수 있는 공개 투표.
// 중복 방지: 게시글당 브라우저(쿠키) 1회. 같은 버튼 재클릭 시 취소, 반대 버튼 클릭 시 전환.
// (익명 IP 단위 영구 저장은 별도 테이블/DDL 이 필요해 현재 스키마에서는 쿠키 방식으로 구현 — 경량 커뮤니티 표준 패턴)

type VoteValue = 1 | -1

function cookieName(postId: string) {
  return `pv_${postId}`
}

export async function castPublicVote(postId: string, value: VoteValue) {
  if (!postId || (value !== 1 && value !== -1)) {
    return { error: '잘못된 투표 요청입니다.' }
  }

  const cookieStore = await cookies()
  const name = cookieName(postId)
  const prevRaw = cookieStore.get(name)?.value
  const prev: VoteValue | 0 = prevRaw === '1' ? 1 : prevRaw === '-1' ? -1 : 0

  const post = await one<{ upvotes: number; downvotes: number }>(
    'select upvotes, downvotes from posts where id = $1',
    [postId],
  ).catch(() => null)

  if (!post) {
    return { error: '게시글을 찾을 수 없습니다.' }
  }

  let upvotes = post.upvotes || 0
  let downvotes = post.downvotes || 0
  let nextVote: VoteValue | 0

  if (prev === value) {
    // 같은 버튼 재클릭 → 취소
    if (value === 1) upvotes = Math.max(0, upvotes - 1)
    else downvotes = Math.max(0, downvotes - 1)
    nextVote = 0
  } else {
    // 이전 투표가 반대편에 있으면 먼저 되돌림
    if (prev === 1) upvotes = Math.max(0, upvotes - 1)
    else if (prev === -1) downvotes = Math.max(0, downvotes - 1)
    // 새 투표 반영
    if (value === 1) upvotes += 1
    else downvotes += 1
    nextVote = value
  }

  const updated = await one('update posts set upvotes = $2, downvotes = $3 where id = $1 returning id', [postId, upvotes, downvotes]).catch(() => null)

  if (!updated) {
    return { error: '투표 반영 중 오류가 발생했습니다.' }
  }

  // 쿠키 갱신 (취소 시 삭제)
  if (nextVote === 0) {
    cookieStore.set(name, '', { path: '/', maxAge: 0 })
  } else {
    cookieStore.set(name, String(nextVote), {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1년
      httpOnly: true,
      sameSite: 'lax',
    })
  }

  revalidatePath(`/board/[slug]/[id]`, 'page')

  return { success: true, upvotes, downvotes, myVote: nextVote }
}
