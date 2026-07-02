import { createClient } from '@/lib/supabase/server'

/**
 * 게시글 댓글 조회 — 보안 원칙 준수 버전
 * ① 공개 댓글: public_comments 뷰 (작성자 조인·익명 마스킹이 DB 레벨에서 완료됨)
 * ② 비밀댓글: comments base 테이블 (RLS가 작성자/글쓴이/스태프만 통과시킴)
 * 앱 레벨 마스킹·클라이언트 조인 금지 — 익명성은 DB에서 지킨다.
 */
export async function getCommentsForPost(postId: string) {
  const supabase = await createClient()

  // ① 공개 댓글 (뷰: 익명이면 author_id NULL + anon_tag 제공)
  const { data: publicComments, error: pubErr } = await supabase
    .from('public_comments')
    .select('id, post_id, parent_id, content, upvotes, created_at, is_anonymous, author_id, author_username, author_display_name, author_avatar_url, author_level, anon_tag')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (pubErr) {
    console.error('getCommentsForPost(공개) 조회 오류:', pubErr)
    return []
  }

  // ② 비밀댓글 (base: RLS가 관련자 외 자동 차단 — 비관련자는 빈 배열)
  const { data: secretComments } = await supabase
    .from('comments')
    .select('id, post_id, parent_id, content, upvotes, created_at, is_anonymous, is_secret, author_id')
    .eq('post_id', postId)
    .eq('is_secret', true)
    .eq('status', 'published')
    .order('created_at', { ascending: true })

  const mapped = [
    ...(publicComments ?? []).map((c) => ({
      ...c,
      is_secret: false,
      author: c.author_id
        ? {
            id: c.author_id,
            username: c.author_username,
            display_name: c.author_display_name,
            avatar_url: c.author_avatar_url,
            level: c.author_level,
          }
        : null,
    })),
    ...(secretComments ?? []).map((c) => ({
      ...c,
      anon_tag: null,
      author: c.author_id ? { id: c.author_id, username: '', display_name: '비밀댓글', avatar_url: null, level: 1 } : null,
    })),
  ]

  // 생성 시각 기준 재정렬 (트리 구성은 컴포넌트에서 parent_id로)
  return mapped.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}
