import { NextResponse, type NextRequest } from 'next/server'

// 로그인 필수 경로: 세션 쿠키가 없으면 로그인 화면으로 보낸다.
// 쿠키의 유효성(만료·위조)은 각 페이지/서버 액션의 getCurrentProfile()이 DB로 다시 확인한다.
const AUTH_REQUIRED = ['/write', '/messages', '/notifications', '/mypage']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (AUTH_REQUIRED.some((p) => pathname.startsWith(p)) && !request.cookies.get('pc_session')?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/write/:path*', '/messages/:path*', '/notifications/:path*', '/mypage/:path*'],
}
