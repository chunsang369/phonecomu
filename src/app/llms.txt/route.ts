import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // 1. boards 목록 조회
  const { data: boards } = await supabase
    .from('boards')
    .select('slug, name, description')
    .order('sort')

  // 2. 최신 게시글 5개 조회 (llms.txt 동적 Context 용)
  const { data: posts } = await supabase
    .from('public_posts')
    .select('id, title, created_at, board:board_id(slug, name)')
    .order('created_at', { ascending: false })
    .limit(5)

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'

  const boardsSection = (boards || []).map(b => 
    `- [${b.name}](${origin}/board/${b.slug}): ${b.description || '게시판 설명 없음'}`
  ).join('\n')

  const postsSection = (posts || []).map(p => {
    const boardSlug = (p.board as any)?.slug || 'free'
    const boardName = (p.board as any)?.name || '자유게시판'
    return `- [${boardName}] [${p.title}](${origin}/board/${boardSlug}/${p.id}) (${new Date(p.created_at).toLocaleDateString()})`
  }).join('\n')

  const markdownContent = `# ${siteName} - LLM Context 및 사이트 맵

본 문서는 AI 에이전트 및 LLM 크롤러를 위해 구조화된 사이트 맵 지침서입니다.

## 1. 플랫폼 소개
- **서비스명:** ${siteName}
- **목적:** 마케터 및 일반 사용자를 위한 투명하고 고밀도화된 휴대폰 성지 좌표, 단가표, 마케팅 노하우 공유 커뮤니티.
- **등급 체계:** 6단계 등급 스키마 탑재 (새싹, 일반, 우수, 전문가, 스태프, 관리자). 포인트와 출석 일수에 따라 동적으로 연동됩니다.

## 2. 주요 게시판 스페이스 (Boards)
${boardsSection}

## 3. 실시간 최신 정보 및 피드 (Recent Threads)
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
