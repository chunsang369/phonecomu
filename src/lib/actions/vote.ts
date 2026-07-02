'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

const voteSchema = z.object({
  targetType: z.enum(['post', 'comment']),
  targetId: z.string().uuid(),
  value: z.union([z.literal(1), z.literal(-1)]),
})

export async function castVoteAction(targetType: 'post' | 'comment', targetId: string, value: 1 | -1) {
  const supabase = await createClient()

  // 1. 유저 인증 검사
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요한 서비스입니다.' }
  }

  // 2. 입력값 유효성 검사
  const validation = voteSchema.safeParse({ targetType, targetId, value })
  if (!validation.success) {
    return { error: '올바르지 않은 투표 데이터입니다.' }
  }

  try {
    // 3. cast_vote RPC 함수 호출
    const { data, error } = await supabase.rpc('cast_vote', {
      vote_target_type: targetType,
      vote_target_id: targetId,
      vote_value: value,
    })

    if (error) {
      // 본인 글 투표 방지 에러 메시지 등을 그대로 리턴
      return { error: error.message }
    }

    // 4. 캐시 갱신
    revalidatePath(`/board/[slug]/[id]`, 'page')
    revalidatePath(`/board/[slug]`)
    revalidatePath(`/`)

    return { success: true, actionValue: (data as any)?.action_value }
  } catch (err) {
    return { error: '투표 처리 중 서버 오류가 발생했습니다.' }
  }
}
