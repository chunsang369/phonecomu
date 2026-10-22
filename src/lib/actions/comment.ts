'use server'

import { one, q, tx } from '@/lib/db'
import { getCurrentProfile } from '@/lib/auth/session'
import { awardPoints } from '@/lib/db/points'
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
  // 1. 유저 인증 검사
  const user = await getCurrentProfile()
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
    const spamRegex = /(010[-. ]?[0-9]{4}[-. ]?[0-9]{4})|(open.kakao.com)/i
    if (spamRegex.test(content)) {
      return { error: '댓글에 연락처 또는 오픈채팅방 링크를 기재할 수 없습니다.' }
    }

    await tx(async (c) => {
      const post = await one<{ author_id: string | null; title: string }>(
        "select author_id, title from posts where id = $1 and status = 'published'",
        [postId],
        c,
      )
      if (!post) throw new Error('POST_NOT_FOUND')

      // 4. 댓글 저장 + 원글 댓글 수 갱신
      const comment = await one<{ id: string }>(
        `insert into comments (post_id, author_id, parent_id, content, is_anonymous, is_secret)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [postId, user.id, parentId || null, content, isAnonymous, isSecret],
        c,
      )
      await q('update posts set comment_count = comment_count + 1 where id = $1', [postId], c)

      // 5. 댓글 포인트 (+3)
      await awardPoints(user.id, 3, 'comment', comment!.id, c)

      // 6. 알림: 대댓글이면 부모 댓글 작성자, 아니면 원글 작성자 (본인 제외)
      const payload = JSON.stringify({ post_id: postId, comment_id: comment!.id, post_title: post.title })
      if (parentId) {
        const parent = await one<{ author_id: string | null }>('select author_id from comments where id = $1', [parentId], c)
        if (parent?.author_id && parent.author_id !== user.id) {
          await q("insert into notifications (user_id, type, payload) values ($1, 'reply', $2)", [parent.author_id, payload], c)
        }
      } else if (post.author_id && post.author_id !== user.id) {
        await q("insert into notifications (user_id, type, payload) values ($1, 'comment', $2)", [post.author_id, payload], c)
      }
    })

    // 7. 캐시 갱신
    revalidatePath(`/board/[slug]/[id]`, 'page')

    return { success: true }
  } catch (err) {
    if ((err as Error).message === 'POST_NOT_FOUND') return { error: '게시글을 찾을 수 없습니다.' }
    console.error('createComment 실패:', (err as Error).message)
    return { error: '댓글 저장 도중 서버 오류가 발생했습니다.' }
  }
}
