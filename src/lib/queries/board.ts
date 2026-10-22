import { one, q } from '@/lib/db'

export type Board = {
  id: number
  slug: string
  name: string
  type: string
  allow_anonymous: boolean
  read_min_level: number
  write_min_level: number
  description: string | null
  sort: number
}

export async function getBoardBySlug(slug: string) {
  try {
    return await one<Board>('select * from boards where slug = $1', [slug])
  } catch (e) {
    console.error('getBoardBySlug 조회 오류:', (e as Error).message)
    return null
  }
}

export async function getAllBoards() {
  try {
    return await q<Board>('select * from boards order by sort, id')
  } catch (e) {
    console.error('getAllBoards 조회 오류:', (e as Error).message)
    return []
  }
}

export async function getTopUsers(limit: number = 5) {
  try {
    return await q(
      `select id, username, display_name, level, adopted_count, trust_score
         from profiles where status = 'active'
        order by level desc, adopted_count desc limit $1`,
      [limit],
    )
  } catch (e) {
    console.error('getTopUsers 조회 오류:', (e as Error).message)
    return []
  }
}
