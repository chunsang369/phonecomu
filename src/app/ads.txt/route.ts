// /ads.txt : 애드센스 승인·수익 지급에 필요한 판매자 인증 파일.
// NEXT_PUBLIC_ADSENSE_CLIENT(ca-pub-...)가 있을 때만 응답한다.

export const dynamic = 'force-static'

export function GET() {
  const client = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '').trim()
  if (!client.startsWith('ca-pub-')) {
    return new Response('', { status: 404 })
  }
  const pub = client.replace(/^ca-/, '')
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
