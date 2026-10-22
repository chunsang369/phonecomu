import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { classifyVisit } from '@/lib/seo/traffic'
import { recordSeoHit } from '@/lib/seo/record-hit'

// Next.js 16 Proxy(구 middleware) — app/ 이 src/ 아래에 있으므로 이 파일도 src/ 에 있어야 동작한다.

// 로그인 필수 경로: 세션 쿠키가 없으면 로그인 화면으로 보낸다.
// 쿠키의 유효성(만료·위조)은 각 페이지/서버 액션의 getCurrentProfile()이 DB로 다시 확인한다.
const AUTH_REQUIRED = ['/write', '/messages', '/notifications', '/mypage', '/seongji/write']

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl
  if (AUTH_REQUIRED.some((p) => pathname.startsWith(p)) && !request.cookies.get('pc_session')?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // 검색·AI 크롤러 방문과 AI 답변 서비스 유입을 일자별로 센다(응답은 기다리지 않음)
  if (request.method === 'GET') {
    const hit = classifyVisit(request.headers.get('user-agent') ?? '', request.headers.get('referer'), request.nextUrl.searchParams.get('utm_source'))
    if (hit) event.waitUntil(recordSeoHit(hit))
  }
  return NextResponse.next()
}

export const config = {
  // 정적 파일·이미지·API는 제외하고 페이지와 robots.txt·sitemap.xml·llms.txt 요청을 받는다
  matcher: ['/((?!_next/static|_next/image|api/|uploads/|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$).*)'],
}
