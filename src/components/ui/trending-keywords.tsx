import { getAllBoards } from '@/lib/queries/board'
import { getTrendingPosts } from '@/lib/queries/post'
import KeywordRoller from '@/components/ui/keyword-roller'

/**
 * '지금 뜨는 글' 롤링 — 실데이터 버전 (기존 하드코딩 배열 전면 교체)
 * - trending_posts RPC: 최근 7일 참여도(추천*3+댓글*2+조회*0.05) 상위 글
 * - 데이터가 없으면(콜드스타트) 가짜 목록을 보여주는 대신 컴포넌트를 렌더하지 않는다.
 *   존재하지 않는 인기를 연출하는 것은 신뢰 자산 훼손 + 검색엔진 저품질 신호.
 * - 서버 컴포넌트이므로 기존 <TrendingKeywords /> 자리에 그대로 드롭인 가능.
 */
export default async function TrendingKeywords() {
  const [trending, boards] = await Promise.all([getTrendingPosts(7, 10), getAllBoards()])

  if (!trending || trending.length === 0) return null

  const boardMap = new Map(boards.map((b) => [b.id, b]))
  const items = trending.map((t) => ({
    title: t.title,
    href: `/board/${boardMap.get(t.board_id)?.slug ?? 'free'}/${t.id}`,
  }))

  return <KeywordRoller items={items} />
}
