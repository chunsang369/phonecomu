'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

const postCreateSchema = z.object({
  boardId: z.number(),
  boardSlug: z.string(),
  title: z.string().min(2, { message: '제목은 최소 2자 이상 입력해야 합니다.' }).max(100),
  content: z.string().min(5, { message: '본문은 최소 5자 이상 입력해야 합니다.' }),
  isAnonymous: z.boolean().default(false),
})

export async function createPost(prevState: any, formData: FormData) {
  const supabase = await createClient()

  // 1. 유저 인증 검사
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요한 서비스입니다.' }
  }

  // 2. 입력 값 파싱 및 검증
  const rawBoardId = formData.get('boardId')
  const rawBoardSlug = formData.get('boardSlug')
  const rawTitle = formData.get('title')
  const rawContent = formData.get('content')
  const rawIsAnonymous = formData.get('isAnonymous') === 'true'

  const validation = postCreateSchema.safeParse({
    boardId: Number(rawBoardId),
    boardSlug: rawBoardSlug,
    title: rawTitle,
    content: rawContent,
    isAnonymous: rawIsAnonymous,
  })

  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { boardId, boardSlug, title, content, isAnonymous } = validation.data

  try {
    // 3. 비속어/광고 번호 필터 검사 (정규식 간단 필터링)
    const phoneLinkRegex = /(010[-. ]?[0-9]{4}[-. ]?[0-9]{4})|(open\.kakao\.com)/i
    if (phoneLinkRegex.test(content) || phoneLinkRegex.test(title)) {
      return { error: '본문 또는 제목에 연락처 및 오픈채팅방 링크를 기재할 수 없습니다.' }
    }

    // 4. posts 테이블에 글 저장 (RLS 정책에 의해 author_id는 본인만 가능)
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        board_id: boardId,
        author_id: user.id,
        title,
        content,
        is_anonymous: isAnonymous,
        status: 'published',
      })
      .select('id')
      .single()

    if (postError) {
      return { error: `글 작성 실패: ${postError.message}` }
    }

    // 5. 글쓰기 리워드 포인트 수여 (+10점)
    // RPC award_points는 security definer이므로 anon/auth 역할에서도 호출 허용
    await supabase.rpc('award_points', {
      target_user_id: user.id,
      point_amount: 10,
      points_kind: 'post',
      points_ref_id: post.id,
    })

    // 6. 캐시 갱신
    revalidatePath(`/board/${boardSlug}`)
    revalidatePath('/')

    return { success: true, postId: post.id }
  } catch (err: any) {
    return { error: '글 저장 도중 서버 오류가 발생했습니다.' }
  }
}
