/**
 * 사이트 절대 주소 (sitemap·robots·llms.txt·메타데이터 canonical 기준)
 * 1) NEXT_PUBLIC_SITE_URL (도메인 연결 후 지정)
 * 2) Vercel 운영 주소 VERCEL_PROJECT_PRODUCTION_URL (Vercel이 자동 제공, 예: phonecomu.vercel.app)
 * 3) 로컬 개발 http://localhost:3000
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
).replace(/\/$/, '')
