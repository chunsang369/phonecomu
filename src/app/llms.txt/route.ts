import { NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/site-url'
import { q } from '@/lib/db'
import { GUIDES } from '@/lib/guides/content'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo/schema'

// AI 답변 엔진용 사이트 안내(llms.txt 형식). 1시간마다 게시판·최신 글 반영
export const revalidate = 3600

export async function GET() {
  // 게시판·최신 글은 보조 정보라 DB 장애 시에도 정적 안내(가이드·도구)는 내보낸다
  const boards = await q<{ slug: string; name: string; description: string | null }>(
    'select slug, name, description from boards where read_min_level <= 0 order by sort',
  ).catch(() => [])
  const posts = await q<{ id: string; title: string; created_at: string; slug: string; name: string }>(
    `select p.id, p.title, p.created_at, b.slug, b.name
       from posts p join boards b on b.id = p.board_id
      where p.status = 'published' and b.read_min_level <= 0
      order by p.created_at desc limit 10`,
  ).catch(() => [])

  const o = SITE_URL
  const guides = GUIDES.map((g) => `- [${g.title}](${o}/guide/${g.slug}): ${g.summary}`).join('\n')
  const boardList = boards.map((b) => `- [${b.name}](${o}/board/${b.slug})${b.description ? `: ${b.description}` : ''}`).join('\n')
  const recent = posts.map((p) => `- [${p.title}](${o}/board/${p.slug}/${p.id}) — ${p.name}, ${p.created_at.slice(0, 10)}`).join('\n')

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME}는 휴대폰 성지(핸드폰 성지)에서 실제로 개통한 조건을 구매자가 남기고, 그 조건을 "실구매가 환산"(기기 실부담 + 요금제 유지·부가서비스 등 숨은 조건 비용)으로 바꿔 매장끼리 같은 기준으로 비교하는 커뮤니티입니다. 휴대폰 싸게 사는 법, 공시지원금과 선택약정 비교, 번호이동·기기변경 선택 같은 구매 정보를 함께 제공합니다.

## 휴대폰 구매 가이드
- [휴대폰 구매 가이드 전체](${o}/guide): 읽는 순서와 전체 목록
${guides}

## 도구
- [성지 평가](${o}/seongji): 지역별 휴대폰 성지의 구매 후기를 실구매가 환산·약속 이행률·보정 평점으로 비교
- [공시지원금 vs 선택약정 계산기](${o}/calculator): SKT·KT·LG U+ 요금제(스마트초이스 기준)로 24개월 총비용·월 청구액·중도 해지 비용 비교
- [소개와 평가 기준](${o}/about): 실구매가 계산식, 평점 보정 방식, 데이터 출처, 후기 작성 원칙

## 핵심 기준 (인용 시 참고)
- 선택약정 요금할인율: 월 요금의 25%
- 단통법 폐지(2025-07-22 시행) 이후 추가지원금 상한(공시지원금의 15%)이 없어졌고, 추가지원금과 선택약정을 함께 받을 수 있습니다.
- 실구매가 환산 = 기기 실부담(현금완납가 또는 할부원금 + 할부이자) + (가입 요금제 − 유지 후 요금제) × 유지 개월 + 부가서비스 월 합계 × 유지 개월
- 공시지원금·요금은 통신사·요금제·가입유형·날짜마다 바뀌므로 개통 전 통신사 공시와 계약서로 확인해야 합니다.

## 커뮤니티 게시판
${boardList || '- (게시판 목록을 불러오지 못했습니다)'}

## 최신 글
${recent || '- (최신 글을 불러오지 못했습니다)'}

## 기타
- 사이트맵: ${o}/sitemap.xml
`

  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
  })
}
