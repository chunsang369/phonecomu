'use server'

import { cookies } from 'next/headers'
import { one } from '@/lib/db'

// 게시글 조회수 증가.
// 같은 브라우저에서 새로고침/재방문으로 조회수가 부풀지 않도록 쿠키로 6시간 동안 중복을 막는다.
// (클라이언트 <ViewCounter/> 가 마운트 시 1회 호출 → 프리페치성 렌더로 인한 과다 증가 방지)
const DEDUP_HOURS = 6

export async function incrementViewCount(postId: string) {
  if (!postId) return { ok: false }

  const cookieStore = await cookies()
  const cookieName = `pv_seen_${postId}`

  // 이미 최근에 조회한 흔적이 있으면 스킵
  if (cookieStore.get(cookieName)) {
    return { ok: true, skipped: true }
  }

  const row = await one<{ view_count: number }>(
    'update posts set view_count = view_count + 1 where id = $1 returning view_count',
    [postId],
  ).catch(() => null)
  if (!row) return { ok: false }
  const next = row.view_count

  // 중복 방지 쿠키 설정 (6시간)
  cookieStore.set(cookieName, '1', {
    path: '/',
    maxAge: DEDUP_HOURS * 60 * 60,
    httpOnly: true,
    sameSite: 'lax',
  })

  return { ok: true, viewCount: next }
}
