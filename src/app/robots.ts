import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
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
