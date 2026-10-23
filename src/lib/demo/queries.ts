import { rows, row } from './runtime.mjs'
import type { PostRow } from '@/lib/queries/post'
import type { Board } from '@/lib/queries/board'
import type { PublicProfile } from '@/lib/queries/profile'

export const demoBoards = () => rows('SELECT * FROM boards ORDER BY sort') as unknown as Board[]
export const demoProfile = (username: string) => row("SELECT id,username,display_name,avatar_url,role,status,level,created_at,activity_points,adopted_count,trust_score,'' bio FROM profiles WHERE username=?",[username]) as unknown as PublicProfile | null
export type Filters = { q?: string; region?: string; carrier?: string; sort?: string }
export function demoPosts(boardId?: number, page = 1, limit = 20, filters: Filters = {}, authorId?: string) {
  const params: (string | number)[] = [], conditions = ["p.status='published'"]
  if (boardId) { conditions.push('p.board_id=?'); params.push(boardId) }
  if (authorId) { conditions.push('p.author_id=? AND p.is_anonymous=0'); params.push(authorId) }
  if (filters.q) { conditions.push("(p.title LIKE ? ESCAPE '\' OR p.content LIKE ? ESCAPE '\')"); const term = `%${filters.q.replace(/[\\%_]/g,'\\$&')}%`; params.push(term,term) }
  if (filters.region) { conditions.push('p.region=?'); params.push(filters.region) }
  if (filters.carrier) { conditions.push('p.carrier=?'); params.push(filters.carrier) }
  const where = conditions.join(' AND ')
  const totalCount = Number(row(`SELECT count(*) n FROM posts p WHERE ${where}`, params)?.n || 0)
  const order = filters.sort === 'recommended' ? 'p.upvotes DESC,p.created_at DESC' : filters.sort === 'popular' ? '(p.upvotes*3+p.comment_count*2+p.view_count*0.05) DESC,p.created_at DESC' : 'p.created_at DESC'
  const found = rows(`SELECT p.*,a.username,a.display_name,a.level,a.avatar_url FROM posts p LEFT JOIN profiles a ON a.id=p.author_id WHERE ${where} ORDER BY p.is_pinned DESC,${order} LIMIT ? OFFSET ?`,[...params,limit,(Math.max(1,page)-1)*limit])
  return { posts: found.map(mapPost), totalCount }
}
function mapPost(p: Record<string, unknown>) {
  return { ...p, is_anonymous: !!p.is_anonymous, is_pinned: !!p.is_pinned, author_id:p.is_anonymous ? null:p.author_id, author_username:p.is_anonymous ? null:p.username, anon_tag:p.is_anonymous ? `익명-${String(p.id).slice(0,4)}`:null, author:p.is_anonymous ? null:{ id:p.author_id,username:p.username,display_name:p.display_name,avatar_url:p.avatar_url,level:p.level } } as PostRow
}
export function demoPost(id: string) {
  const p = row("SELECT p.*,a.username,a.display_name,a.level,a.avatar_url FROM posts p LEFT JOIN profiles a ON a.id=p.author_id WHERE p.id=? AND p.status='published'",[id])
  return p ? { ...mapPost(p), raw_author_id: p.author_id as string } : null
}
export function demoComments(postId: string) {
  return rows('SELECT c.*,a.username,a.display_name,a.level FROM comments c JOIN profiles a ON a.id=c.author_id WHERE post_id=? ORDER BY created_at',[postId]).map(c => ({
    id:String(c.id),post_id:String(c.post_id),parent_id:c.parent_id as string|null,content:String(c.content),upvotes:Number(c.upvotes),created_at:String(c.created_at),is_anonymous:!!c.is_anonymous,is_secret:false,
    author_id:c.is_anonymous?null:String(c.author_id),author_username:c.is_anonymous?'':String(c.username),author_display_name:c.is_anonymous?`익명-${String(c.author_id).slice(0,4)}`:String(c.display_name),author_avatar_url:null,author_level:Number(c.level),anon_tag:c.is_anonymous?`익명-${String(c.author_id).slice(0,4)}`:null,
    author:{id:c.is_anonymous?'':String(c.author_id),username:c.is_anonymous?'':String(c.username),display_name:c.is_anonymous?`익명-${String(c.author_id).slice(0,4)}`:String(c.display_name),avatar_url:null,level:Number(c.level)},
  }))
}
