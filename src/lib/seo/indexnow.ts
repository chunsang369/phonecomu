/**
 * IndexNow — 새 글·후기 주소를 Bing·네이버 등 참여 검색엔진에 바로 알린다.
 * INDEXNOW_KEY 환경변수가 있을 때만 동작한다(도메인 확정 후 설정). 키 확인 파일: /indexnow.txt
 * 실패해도 글 작성에는 영향을 주지 않는다.
 */
import { after } from 'next/server'
import { SITE_URL } from '@/lib/site-url'

export function notifyIndexNow(paths: string[]) {
  const key = process.env.INDEXNOW_KEY
  if (!key || process.env.PHONE_DEMO === '1' || SITE_URL.startsWith('http://localhost')) return
  const host = new URL(SITE_URL).host
  after(async () => {
    try {
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key, keyLocation: `${SITE_URL}/indexnow.txt`, urlList: paths.map((p) => `${SITE_URL}${p}`) }),
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) console.error('IndexNow 응답', res.status)
    } catch (e) {
      console.error('IndexNow 실패:', (e as Error).message)
    }
  })
}
