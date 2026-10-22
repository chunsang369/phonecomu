import { NextResponse } from 'next/server'

// 공개 GET 으로 계정을 만들던 Supabase 테스트 엔드포인트. 자체 인증 전환 후 비활성화.
// 테스트 계정은 /signup 화면에서 만든다.
export async function GET() {
  return NextResponse.json({ error: 'disabled' }, { status: 404 })
}
