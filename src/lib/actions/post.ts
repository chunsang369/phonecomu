'use server'

import { one, tx } from '@/lib/db'
import { getCurrentProfile } from '@/lib/auth/session'
import { awardPoints } from '@/lib/db/points'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { sanitizeHtml, htmlToText, looksLikeHtml } from '@/lib/sanitize-html'

const postCreateSchema = z.object({
  boardId: z.number(),
  boardSlug: z.string(),
  title: z.string().min(2, { message: '제목은 최소 2자 이상 입력해야 합니다.' }).max(100),
  content: z.string().min(5, { message: '본문은 최소 5자 이상 입력해야 합니다.' }),
  isAnonymous: z.boolean().default(false),
})

export async function createPost(prevState: any, formData: FormData) {
  // 1. 유저 인증 검사
  const user = await getCurrentProfile()
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

  const { boardId, boardSlug, title, isAnonymous } = validation.data
  let { content } = validation.data

  // 리치 에디터(HTML) 본문 처리: 허용목록 새니타이즈 + 실제 텍스트 기준 길이 검증
  const isHtmlContent = looksLikeHtml(content)
  const contentText = isHtmlContent ? htmlToText(content) : content
  if (isHtmlContent) {
    content = sanitizeHtml(content)
    const hasMedia = /<(img|iframe|video|table)\b/i.test(content)
    if (contentText.trim().length < 5 && !hasMedia) {
      return { error: '본문은 최소 5자 이상 입력해야 합니다.' }
    }
  }

  try {
    // 3. 비속어/광고 번호 필터 검사 (정규식 간단 필터링 - 문의게시판은 연락처 기재 허용)
    const phoneLinkRegex = /(010[-. ]?[0-9]{4}[-. ]?[0-9]{4})|(open\.kakao\.com)/i
    if (
      boardSlug !== 'inquiry' &&
      (phoneLinkRegex.test(content) || phoneLinkRegex.test(contentText) || phoneLinkRegex.test(title))
    ) {
      return { error: '본문 또는 제목에 연락처 및 오픈채팅방 링크를 기재할 수 없습니다.' }
    }

    // 4. 게시판 확인: 클라이언트가 보낸 boardId 대신 slug 로 다시 조회하고 쓰기 권한(레벨)·익명 허용 여부를 서버에서 검증
    const board = await one<{ id: number; write_min_level: number; allow_anonymous: boolean; type: string }>(
      'select id, write_min_level, allow_anonymous, type from boards where slug = $1',
      [boardSlug],
    )
    if (!board || board.id !== boardId) {
      return { error: '게시판 정보가 올바르지 않습니다.' }
    }
    if (user.level < board.write_min_level && user.role !== 'admin') {
      return { error: '이 게시판에 글을 쓸 권한이 없습니다.' }
    }
    const anonymous = board.type === 'anonymous' || (board.allow_anonymous && isAnonymous)

    // 5. 글 저장 + 글쓰기 포인트(+10)
    const post = await tx(async (c) => {
      const row = await one<{ id: string }>(
        `insert into posts (board_id, author_id, title, content, is_anonymous)
         values ($1, $2, $3, $4, $5) returning id`,
        [board.id, user.id, title, content, anonymous],
        c,
      )
      await awardPoints(user.id, 10, 'post', row!.id, c)
      return row!
    })

    // 6. 캐시 갱신
    revalidatePath(`/board/${boardSlug}`)
    revalidatePath('/')

    return { success: true, postId: post.id }
  } catch (err) {
    console.error('createPost 실패:', (err as Error).message)
    return { error: '글 저장 도중 서버 오류가 발생했습니다.' }
  }
}
