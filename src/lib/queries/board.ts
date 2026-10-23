import { q } from '@/lib/db'

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

// 게시판 목록은 운영 중 거의 바뀌지 않으므로(앱에서 수정하는 경로 없음, db/schema.sql로만 변경) 서버 메모리에 5분 보관한다.
// 게시판 이동마다 getBoardBySlug·getAllBoards로 DB 왕복이 2~3번 생기던 것을 없앤다.
const BOARDS_TTL_MS = 5 * 60_000
let boardsCache: { at: number; rows: Promise<Board[]> } | null = null

function loadBoards() {
  if (!boardsCache || Date.now() - boardsCache.at > BOARDS_TTL_MS) {
    const rows = q<Board>('select * from boards order by sort, id')
    boardsCache = { at: Date.now(), rows }
    rows.catch(() => (boardsCache = null)) // 실패한 결과는 보관하지 않음
  }
  return boardsCache.rows
}

export async function getBoardBySlug(slug: string) {
  try {
    return (await loadBoards()).find((b) => b.slug === slug) ?? null
  } catch (e) {
    console.error('getBoardBySlug 조회 오류:', (e as Error).message)
    return null
  }
}

export async function getAllBoards() {
  try {
    return [...(await loadBoards())] // 호출부가 정렬 등으로 캐시 배열을 바꾸지 않도록 복사본
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
