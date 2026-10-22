import { NextResponse } from 'next/server'
import { q } from '@/lib/db'

export async function GET() {
  // 1. 공개 게시판 목록
  const boards = await q<{ slug: string; name: string; description: string | null }>(
    'select slug, name, description from boards where read_min_level <= 0 order by sort',
  ).catch(() => [])

  // 2. 최신 공개 게시글 5개 (llms.txt 동적 Context 용)
  const posts = await q<{ id: string; title: string; created_at: string; slug: string; name: string }>(
    `select p.id, p.title, p.created_at, b.slug, b.name
       from posts p join boards b on b.id = p.board_id
      where p.status = 'published' and b.read_min_level <= 0
      order by p.created_at desc limit 5`,
  ).catch(() => [])

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'

  const boardsSection = boards.map(b => 
    `- [${b.name}](${origin}/board/${b.slug}): ${b.description || '게시판 설명 없음'}`
  ).join('\n')

  const postsSection = posts
    .map((p) => `- [${p.name}] [${p.title}](${origin}/board/${p.slug}/${p.id}) (${new Date(p.created_at).toLocaleDateString('ko-KR')})`)
    .join('\n')

  const markdownContent = `# ${siteName} - LLM Context 및 사이트 맵

본 문서는 AI 에이전트 및 LLM 크롤러를 위해 구조화된 사이트 맵 지침서입니다.

## 1. 플랫폼 소개
- **서비스명:** ${siteName}
- **목적:** 휴대폰 성지(공시지원금·선택약정·번호이동 조건이 좋은 판매점)의 실제 개통 조건을 구매자가 직접 남기고, 같은 기준(실구매가 환산·약속 이행 여부)으로 비교하는 커뮤니티.
- **등급 체계:** 6단계 등급 스키마 탑재 (새싹, 일반, 우수, 전문가, 스태프, 관리자). 포인트와 출석 일수에 따라 동적으로 연동됩니다.

## 2. 도구
- [성지 평가](${origin}/seongji): 실제 개통 조건(할부원금·요금제 유지·부가서비스·카드)으로 환산한 실구매가와 약속 이행률로 지역별 휴대폰 성지를 비교합니다.
- [공시지원금 vs 선택약정 계산기](${origin}/calculator): SKT·KT·LG U+ 요금제(스마트초이스 기준)로 24개월 총비용, 월 청구액, 중도 해지 비용을 비교합니다.

## 3. 주요 게시판 (Boards)
${boardsSection}

## 4. 최신 글 (Recent Threads)
${postsSection || '- 최근 작성된 글이 없습니다.'}

---
- **사이트 주소:** ${origin}
- **sitemap.xml 주소:** ${origin}/api/sitemap.xml
`

  return new NextResponse(markdownContent.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  })
}
