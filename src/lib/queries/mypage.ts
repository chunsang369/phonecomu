import { q } from '@/lib/db'

// 내가 쓴 글 (익명글 포함 — 본인 전용 화면)
export async function getMyPosts(userId: string, limit = 50) {
  try {
    return await q(
      `select p.id, p.title, p.view_count, p.upvotes, p.comment_count, p.created_at, p.is_anonymous, p.board_id,
              coalesce(b.slug, 'free') as board_slug, coalesce(b.name, '게시판') as board_name
         from posts p left join boards b on b.id = p.board_id
        where p.author_id = $1 and p.status = 'published'
        order by p.created_at desc limit $2`,
      [userId, limit],
    )
  } catch (e) {
    console.error('getMyPosts 조회 오류:', (e as Error).message)
    return []
  }
}

// 내가 쓴 댓글 (원글 제목·게시판 정보 포함해 링크 가능하게)
export async function getMyComments(userId: string, limit = 50) {
  try {
    return await q(
      `select c.id, c.content, c.created_at, c.is_anonymous, c.post_id,
              coalesce(p.title, '(삭제된 글)') as post_title,
              coalesce(b.slug, 'free') as board_slug, coalesce(b.name, '게시판') as board_name
         from comments c
         left join posts p on p.id = c.post_id
         left join boards b on b.id = p.board_id
        where c.author_id = $1 and c.status = 'published'
        order by c.created_at desc limit $2`,
      [userId, limit],
    )
  } catch (e) {
    console.error('getMyComments 조회 오류:', (e as Error).message)
    return []
  }
}
