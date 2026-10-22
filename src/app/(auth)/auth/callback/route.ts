import { NextResponse } from 'next/server'

// Supabase OAuth 콜백은 자체 인증 전환으로 사용하지 않는다. 기존 링크로 들어오면 로그인 화면으로 보낸다.
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login`)
}
