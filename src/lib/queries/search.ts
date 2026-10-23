import { q } from '@/lib/db'
import { isDemo } from '@/lib/demo/runtime.mjs'
import { demoPosts } from '@/lib/demo/queries'

/** 제목·본문 부분일치 검색 (한국어는 형태소 분리가 없어 FTS보다 ILIKE가 정확함). 공개 게시판만, 최근 50건 */
export async function searchPosts(queryText: string) {
  if (isDemo()) return queryText.trim() ? demoPosts(undefined,1,50,{q:queryText}).posts : []
  const term = queryText.trim()
  if (!term) return []
  const like = `%${term.replace(/[\\%_]/g, (m) => '\\' + m)}%`
  try {
    return await q(
      `select p.id, p.board_id, p.title, p.content, p.view_count, p.upvotes, p.downvotes, p.comment_count,
              p.created_at, p.updated_at, p.is_anonymous,
              case when p.is_anonymous then null else p.author_id end as author_id,
              case when p.is_anonymous then null else a.username end as author_username,
              case when p.is_anonymous then null else a.display_name end as author_display_name,
              case when p.is_anonymous then '익명-' || substr(md5(coalesce(p.author_id::text, '') || p.id::text), 1, 4) end as anon_tag,
              case when p.is_anonymous or a.id is null then null
                   else json_build_object('id', a.id, 'username', a.username, 'display_name', a.display_name,
                                          'avatar_url', a.avatar_url, 'level', a.level) end as author
         from posts p
         join boards b on b.id = p.board_id
         left join profiles a on a.id = p.author_id
        where p.status = 'published' and b.read_min_level <= 0
          and (p.title ilike $1 or p.content ilike $1)
        order by p.created_at desc limit 50`,
      [like],
    )
  } catch (e) {
    console.error('searchPosts 조회 오류:', (e as Error).message)
    return []
  }
}
