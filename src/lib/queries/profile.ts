import { one, q } from '@/lib/db'

export type PublicProfile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  role: string
  level: number
  adopted_count: number
  trust_score: number
  created_at: string
}
export type AuthorPost = { id: string; board_id: number; title: string; view_count: number; upvotes: number; comment_count: number; created_at: string }

/** 공개 프로필 (민감 필드 제외) */
export async function getPublicProfile(username: string) {
  try {
    return await one<PublicProfile>(
      `select id, username, display_name, avatar_url, role, level, adopted_count, trust_score, created_at
         from profiles where lower(username) = lower($1) and status = 'active'`,
      [username],
    )
  } catch {
    return null
  }
}

/** 해당 회원의 공개 작성글 — 익명글과 비공개 게시판(문의 등)은 제외 */
export async function getPostsByAuthor(authorId: string, limit = 20) {
  try {
    return await q<AuthorPost>(
      `select p.id, p.board_id, p.title, p.view_count, p.upvotes, p.comment_count, p.created_at
         from posts p join boards b on b.id = p.board_id
        where p.author_id = $1 and not p.is_anonymous and p.status = 'published' and b.read_min_level <= 0
        order by p.created_at desc limit $2`,
      [authorId, limit],
    )
  } catch {
    return [] as AuthorPost[]
  }
}
