'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

const commentCreateSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  content: z.string().min(2, { message: '댓글 내용은 최소 2자 이상 입력해야 합니다.' }).max(500),
  isAnonymous: z.boolean().default(false),
  isSecret: z.boolean().default(false),
})

export async function createComment(prevState: any, formData: FormData) {
  const supabase = await createClient()

  // 1. 유저 인증 검사
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요한 서비스입니다.' }
  }

  // 2. 입력값 파싱 및 검증
  const rawPostId = formData.get('postId')
  const rawParentId = formData.get('parentId')
  const rawContent = formData.get('content')
  const rawIsAnonymous = formData.get('isAnonymous') === 'true'
  const rawIsSecret = formData.get('isSecret') === 'true'

  const validation = commentCreateSchema.safeParse({
    postId: rawPostId,
    parentId: rawParentId || null,
    content: rawContent,
    isAnonymous: rawIsAnonymous,
    isSecret: rawIsSecret,
  })

  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { postId, parentId, content, isAnonymous, isSecret } = validation.data

  try {
    // 3. 비속어/광고 필터
    const spamRegex = /(010[-. ]?[0-9]{4}[-. ]?[0-9]{4})|(open\.kakao\.com)/i
    if (spamRegex.test(content)) {
      return { error: '댓글에 연락처 또는 오픈채팅방 링크를 기재할 수 없습니다.' }
    }

    // 4. comments 테이블에 삽입
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        parent_id: parentId || null,
        content,
        is_anonymous: isAnonymous,
        is_secret: isSecret,
        status: 'published'
      })
      .select('id')
      .single()

    if (commentError) {
      return { error: `댓글 작성 실패: ${commentError.message}` }
    }

    // 5. 댓글 리워드 포인트 수여 (+3점)
    await supabase.rpc('award_points', {
      target_user_id: user.id,
      point_amount: 3,
      points_kind: 'comment',
      points_ref_id: comment.id,
    })

    // 6. 알림 처리 (RSC용 알림 테이블 인서트)
    // 원본 게시글 작성자 조회
    const { data: post } = await supabase
      .from('posts')
      .select('author_id, title')
      .eq('id', postId)
      .single()

    if (post && post.author_id && post.author_id !== user.id) {
      if (parentId) {
        // 대댓글인 경우 부모 댓글 작성자에게 알림
        const { data: parentComment } = await supabase
          .from('comments')
          .select('author_id')
          .eq('id', parentId)
          .single()

        if (parentComment && parentComment.author_id && parentComment.author_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: parentComment.author_id,
            type: 'reply',
            payload: {
              post_id: postId,
              comment_id: comment.id,
              post_title: post.title
            }
          })
        }
      } else {
        // 일반 댓글인 경우 원글 작성자에게 알림
        await supabase.from('notifications').insert({
          user_id: post.author_id,
          type: 'comment',
          payload: {
            post_id: postId,
            comment_id: comment.id,
            post_title: post.title
          }
        })
      }
    }

    // 7. 캐시 갱신
    revalidatePath(`/board/[slug]/[id]`, 'page')

    return { success: true }
  } catch (err: any) {
    return { error: '댓글 저장 도중 서버 오류가 발생했습니다.' }
  }
}
