import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const origin = SITE_URL
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/write/', '/mypage/', '/notifications/', '/messages/'],
      },
      {
        // AI 에이전트 및 LLM 크롤러 허용 정책
        userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot', 'PerplexityBot'],
        allow: ['/', '/llms.txt', '/api/sitemap.xml'],
      }
    ],
    sitemap: `${origin}/api/sitemap.xml`,
  }
}
