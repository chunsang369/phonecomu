import { q } from '@/lib/db'
import { getCurrentProfile } from '@/lib/auth/session'
import { isDemo, rows } from '@/lib/demo/runtime.mjs'
import { demoComments } from '@/lib/demo/queries'

type CommentRow = {
  id: string
  post_id: string
  parent_id: string | null
  content: string
  upvotes: number
  created_at: string
  is_anonymous: boolean
  is_secret: boolean
  author_id: string | null
  post_author_id: string | null
  username: string | null
  display_name: string | null
  avatar_url: string | null
  level: number | null
}

/** 홈 '새댓글' 목록: 공개 게시판의 공개 댓글 최신순 (비밀댓글 제외) */
export async function getRecentComments(limit = 8) {
  if (isDemo()) return rows("SELECT c.id,c.content,c.created_at,c.post_id,b.slug board_slug FROM comments c JOIN posts p ON p.id=c.post_id JOIN boards b ON b.id=p.board_id WHERE p.status='published' AND c.status='published' ORDER BY c.created_at DESC LIMIT ?",[limit]) as unknown as {id:string;content:string;created_at:string;post_id:string;board_slug:string}[]
  try {
    return await q<{ id: string; content: string; created_at: string; post_id: string; board_slug: string }>(
      `select c.id, c.content, c.created_at, c.post_id, b.slug as board_slug
         from comments c
         join posts p on p.id = c.post_id and p.status = 'published'
         join boards b on b.id = p.board_id and b.read_min_level <= 0
        where c.status = 'published' and not c.is_secret
        order by c.created_at desc limit $1`,
      [limit],
    )
  } catch (e) {
    console.error('getRecentComments 조회 오류:', (e as Error).message)
    return []
  }
}

export async function getCommentsForPost(postId: string) {
  if (isDemo()) return demoComments(postId)
  let comments: CommentRow[]
  try {
    comments = await q<CommentRow>(
      `select c.id, c.post_id, c.parent_id, c.content, c.upvotes, c.created_at, c.is_anonymous, c.is_secret,
              c.author_id, po.author_id as post_author_id,
              a.username, a.display_name, a.avatar_url, a.level
         from comments c
         join posts po on po.id = c.post_id
         left join profiles a on a.id = c.author_id
        where c.post_id = $1 and c.status = 'published'
        order by c.created_at asc`,
      [postId],
    )
  } catch (e) {
    console.error('getCommentsForPost 조회 오류:', (e as Error).message)
    return []
  }

  // 비밀댓글: 관리자·댓글 작성자·원글 작성자만 본문 열람
  const me = await getCurrentProfile()
  const isStaff = me?.role === 'admin' || me?.role === 'moderator'

  // 익명 작성자별 고유 번호 (익명1, 익명2 …)
  const anonMap = new Map<string, string>()
  let anonCounter = 1

  return comments.map((c) => {
    let displayName: string
    let author: { id: string; username: string; display_name: string; avatar_url: string | null; level: number } | null

    if (c.is_anonymous) {
      let tag = '익명'
      if (c.author_id) {
        if (!anonMap.has(c.author_id)) anonMap.set(c.author_id, `익명${anonCounter++}`)
        tag = anonMap.get(c.author_id)!
      }
      displayName = tag
      author = { id: '', username: '', display_name: tag, avatar_url: null, level: 1 }
    } else {
      displayName = c.display_name || '성지회원'
      author = c.author_id
        ? { id: c.author_id, username: c.username ?? '', display_name: displayName, avatar_url: c.avatar_url, level: c.level ?? 1 }
        : null
    }

    const canSeeSecret = !c.is_secret || isStaff || (!!me && (me.id === c.author_id || me.id === c.post_author_id))

    return {
      id: c.id,
      post_id: c.post_id,
      parent_id: c.parent_id,
      content: canSeeSecret ? c.content : '비밀댓글입니다.',
      upvotes: c.upvotes,
      created_at: c.created_at,
      is_anonymous: c.is_anonymous,
      is_secret: c.is_secret,
      author_id: c.is_anonymous ? null : c.author_id,
      author_username: c.is_anonymous ? '' : c.username,
      author_display_name: displayName,
      author_avatar_url: c.is_anonymous ? null : c.avatar_url,
      author_level: c.is_anonymous ? 1 : c.level,
      anon_tag: c.is_anonymous ? displayName : null,
      author,
    }
  })
}
