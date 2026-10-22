'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { one, q, tx } from '@/lib/db'
import { getCurrentProfile } from '@/lib/auth/session'
import { awardPoints, recalcLevel } from '@/lib/db/points'

const voteSchema = z.object({
  targetType: z.enum(['post', 'comment']),
  targetId: z.string().uuid(),
  value: z.union([z.literal(1), z.literal(-1)]),
})

class VoteError extends Error {}

// 로그인 회원 투표 (Supabase cast_vote RPC 대체): 같은 값 재투표 = 취소, 반대 값 = 전환
export async function castVoteAction(targetType: 'post' | 'comment', targetId: string, value: 1 | -1) {
  const me = await getCurrentProfile()
  if (!me) {
    return { error: '로그인이 필요한 서비스입니다.' }
  }

  const validation = voteSchema.safeParse({ targetType, targetId, value })
  if (!validation.success) {
    return { error: '올바르지 않은 투표 데이터입니다.' }
  }

  try {
    const diff = await tx(async (c) => {
      const table = targetType === 'post' ? 'posts' : 'comments'
      const target = await one<{ author_id: string | null }>(`select author_id from ${table} where id = $1`, [targetId], c)
      if (!target) throw new VoteError('대상을 찾을 수 없습니다.')
      if (target.author_id === me.id) throw new VoteError('본인의 글이나 댓글에는 투표할 수 없습니다.')

      const existing = await one<{ value: number }>(
        'select value from votes where user_id = $1 and target_type = $2 and target_id = $3 for update',
        [me.id, targetType, targetId],
        c,
      )

      let voteDiff: number
      if (existing?.value === value) {
        await q('delete from votes where user_id = $1 and target_type = $2 and target_id = $3', [me.id, targetType, targetId], c)
        voteDiff = -value
      } else if (existing) {
        await q('update votes set value = $4 where user_id = $1 and target_type = $2 and target_id = $3', [me.id, targetType, targetId, value], c)
        voteDiff = value * 2
      } else {
        await q('insert into votes (user_id, target_type, target_id, value) values ($1, $2, $3, $4)', [me.id, targetType, targetId, value], c)
        voteDiff = value
      }

      if (targetType === 'post') {
        if (value === 1) {
          await q('update posts set upvotes = greatest(upvotes + $2, 0) where id = $1', [targetId, voteDiff], c)
          if (voteDiff > 0 && target.author_id) await awardPoints(target.author_id, 3, 'upvote_received', targetId, c)
        } else {
          await q('update posts set downvotes = greatest(downvotes + $2, 0) where id = $1', [targetId, -voteDiff], c)
          if (voteDiff < 0 && target.author_id) {
            await q('update profiles set penalty_points = penalty_points + 2 where id = $1', [target.author_id], c)
            await recalcLevel(target.author_id, c)
          }
        }
      } else if (value === 1) {
        await q('update comments set upvotes = greatest(upvotes + $2, 0) where id = $1', [targetId, voteDiff], c)
      }
      return voteDiff
    })

    revalidatePath(`/board/[slug]/[id]`, 'page')
    revalidatePath(`/board/[slug]`, 'page')
    revalidatePath(`/`)

    return { success: true, actionValue: diff }
  } catch (err) {
    if (err instanceof VoteError) return { error: err.message }
    return { error: '투표 처리 중 서버 오류가 발생했습니다.' }
  }
}
