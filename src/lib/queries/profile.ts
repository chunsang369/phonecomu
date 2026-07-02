import { createClient } from '@/lib/supabase/server'

/** 공개 프로필 조회 (public_profiles 뷰 — 민감필드 없음) */
export async function getPublicProfile(username: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, username, display_name, avatar_url, role, level, adopted_count, trust_score, created_at')
    .eq('username', username)
    .single()

  if (error) return null
  return data
}

/**
 * 해당 유저의 공개 작성글 (public_posts 뷰)
 * 익명글은 뷰에서 author_id가 NULL이므로 자동 제외 — 설계 의도와 정합.
 */
export async function getPostsByAuthor(authorId: string, limit = 20) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('public_posts')
    .select('id, board_id, title, view_count, upvotes, comment_count, created_at')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data ?? []
}
