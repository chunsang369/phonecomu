import { one, q } from '@/lib/db'
import { isDemo } from '@/lib/demo/runtime.mjs'
import { demoPosts, demoPost, demoBoards, type Filters } from '@/lib/demo/queries'

export type PostAuthor = { id: string; username: string; display_name: string; avatar_url: string | null; level: number }
export type PostRow = {
  id: string
  board_id: number
  title: string
  content: string | null
  view_count: number
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  updated_at: string
  is_pinned: boolean
  is_anonymous: boolean
  status: string
  author_id: string | null
  author_username: string | null
  author: PostAuthor | null
  anon_tag: string | null
}

// 목록·상세 공통 SELECT. 익명글은 작성자 객체를 내보내지 않고 anon_tag(익명-xxxx)만 노출한다.
const POST_SELECT = `
  select p.id, p.board_id, p.title, p.content, p.view_count, p.upvotes, p.downvotes, p.comment_count,
         p.created_at, p.updated_at, p.is_pinned, p.is_anonymous, p.status,
         case when p.is_anonymous then null else p.author_id end as author_id,
         case when p.is_anonymous then null else a.username end as author_username,
         case when p.is_anonymous or a.id is null then null
              else json_build_object('id', a.id, 'username', a.username, 'display_name', a.display_name,
                                     'avatar_url', a.avatar_url, 'level', a.level) end as author,
         case when p.is_anonymous then '익명-' || substr(md5(coalesce(p.author_id::text, '') || p.id::text), 1, 4) end as anon_tag
    from posts p
    left join profiles a on a.id = p.author_id`

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

export async function getPostsByBoard(boardId: number, limit: number = 20) {
  if (isDemo()) return demoPosts(boardId,1,limit).posts
  try {
    return await q<PostRow>(
      `${POST_SELECT} where p.board_id = $1 and p.status = 'published'
        order by p.is_pinned desc, p.created_at desc limit $2`,
      [boardId, limit],
    )
  } catch (e) {
    console.error('getPostsByBoard 조회 오류:', (e as Error).message)
    return []
  }
}

export async function getPaginatedPostsByBoard(boardId: number, page: number = 1, pageSize: number = 15, filters: Filters = {}) {
  if (isDemo()) return demoPosts(boardId,page,pageSize,filters)
  try {
    const offset = Math.max(page - 1, 0) * pageSize
    const [posts, count] = await Promise.all([
      q<PostRow>(
        `${POST_SELECT} where p.board_id = $1 and p.status = 'published'
          order by p.is_pinned desc, p.created_at desc limit $2 offset $3`,
        [boardId, pageSize, offset],
      ),
      one<{ n: number }>(`select count(*)::int as n from posts where board_id = $1 and status = 'published'`, [boardId]),
    ])
    return { posts, totalCount: count?.n ?? 0 }
  } catch (e) {
    console.error('getPaginatedPostsByBoard 조회 오류:', (e as Error).message)
    return { posts: [] as PostRow[], totalCount: 0 }
  }
}

/** 상세 조회. raw_author_id 는 서버에서 소유자 확인용으로만 사용한다. */
export async function getPostDetail(postId: string) {
  if (isDemo()) return demoPost(postId)
  if (!isUuid(postId)) return null
  try {
    return await one<PostRow & { raw_author_id: string | null }>(
      `${POST_SELECT.replace('select p.id,', 'select p.author_id as raw_author_id, p.id,')} where p.id = $1 and p.status = 'published'`,
      [postId],
    )
  } catch (e) {
    console.error('getPostDetail 조회 오류:', (e as Error).message)
    return null
  }
}

/** 최근 24시간 추천·조회 상위 5개, 부족하면 전체 기간 추천순으로 채움 */
export async function getPopularPosts24h() {
  if (isDemo()) return demoPosts(undefined,1,5,{sort:'popular'}).posts.map(p=>({id:p.id,title:p.title,comments:p.comment_count,boardSlug:demoBoards().find(b=>b.id===p.board_id)!.slug}))
  try {
    const rows = await q<{ id: string; title: string; comment_count: number; slug: string }>(
      `(select p.id, p.title, p.comment_count, b.slug, 0 as pri, p.upvotes, p.view_count
          from posts p join boards b on b.id = p.board_id
         where p.status = 'published' and b.read_min_level <= 0 and p.created_at > now() - interval '24 hours'
         order by p.upvotes desc, p.view_count desc limit 5)
       union all
       (select p.id, p.title, p.comment_count, b.slug, 1 as pri, p.upvotes, p.view_count
          from posts p join boards b on b.id = p.board_id
         where p.status = 'published' and b.read_min_level <= 0
         order by p.upvotes desc limit 10)
       order by pri, upvotes desc, view_count desc`,
    )
    const seen = new Set<string>()
    return rows
      .filter((r) => !seen.has(r.id) && seen.add(r.id))
      .slice(0, 5)
      .map((r) => ({ id: r.id, title: r.title, comments: r.comment_count || 0, boardSlug: r.slug }))
  } catch (e) {
    console.error('getPopularPosts24h 조회 오류:', (e as Error).message)
    return []
  }
}

/** 인기글 (Supabase trending_posts RPC 대체): 최근 N일 참여도 = 추천*3 + 댓글*2 + 조회*0.05 */
export async function getTrendingPosts(days = 7, maxRows = 10) {
  if (isDemo()) return demoPosts(undefined,1,maxRows,{sort:'popular'}).posts.map(p=>({id:p.id,title:p.title,board_id:p.board_id,score:p.upvotes*3+p.comment_count*2}))
  try {
    return await q<{ id: string; title: string; board_id: number; score: number }>(
      `select p.id, p.title, p.board_id, (p.upvotes * 3 + p.comment_count * 2 + p.view_count * 0.05)::float as score
         from posts p join boards b on b.id = p.board_id
        where p.status = 'published' and b.read_min_level <= 0
          and p.created_at > now() - make_interval(days => $1)
        order by score desc, p.created_at desc limit $2`,
      [days, maxRows],
    )
  } catch (e) {
    console.error('getTrendingPosts 조회 오류:', (e as Error).message)
    return []
  }
}
