import { headers } from 'next/headers'
import { isDemo } from './runtime.mjs'

export async function requireLocalDemo() {
  if (!isDemo() || process.env.VERCEL) throw new Error('로컬 시연에서만 사용할 수 있습니다.')
  const h = await headers()
  const host = h.get('host') || ''
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) throw new Error('로컬 주소로 접속하세요.')
  const origin = h.get('origin')
  if (origin && new URL(origin).host !== host) throw new Error('요청 출처가 일치하지 않습니다.')
}
