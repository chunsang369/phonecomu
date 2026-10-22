// IndexNow 키 확인 파일 — INDEXNOW_KEY가 설정된 경우에만 키를 돌려준다
export function GET() {
  const key = process.env.INDEXNOW_KEY
  if (!key) return new Response('Not Found', { status: 404 })
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
