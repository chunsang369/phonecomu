import { NextResponse } from 'next/server'

// 예전 주소(/api/sitemap.xml) → 표준 주소(/sitemap.xml)로 영구 이동. 사이트맵 본문은 app/sitemap.ts
export function GET(req: Request) {
  return NextResponse.redirect(new URL('/sitemap.xml', req.url), 308)
}
