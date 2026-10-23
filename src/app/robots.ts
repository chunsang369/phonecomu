import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

/**
 * robots.txt — GEO·AEO 전략 v4
 * 이름이 지정된 그룹이 있으면 그 봇은 `*` 그룹을 읽지 않으므로, 차단 경로를 그룹마다 반복한다.
 * 학습용 봇(GPTBot·ClaudeBot·Google-Extended·CCBot)은 사업 판단 사항이라 현재 허용 상태로 둔다.
 */
// /api/ 는 막지 않는다: 계산기 화면이 /api 응답으로 그려지므로 검색엔진 렌더링에 필요
const DISALLOW = ['/write/', '/mypage/', '/notifications/', '/messages/', '/seongji/write']

// 검색·답변 엔진 (검색 결과·AI 답변의 인용 출처를 만드는 봇)
const SEARCH_BOTS = ['Googlebot', 'Bingbot', 'Yeti', 'Daum', 'DuckDuckBot', 'Applebot']
const ANSWER_BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User']
const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot']

export default function robots(): MetadataRoute.Robots {
  if(process.env.PHONE_DEMO==='1')return {rules:{userAgent:'*',disallow:'/'}}
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: SEARCH_BOTS, allow: '/', disallow: DISALLOW },
      { userAgent: ANSWER_BOTS, allow: '/', disallow: DISALLOW },
      { userAgent: TRAINING_BOTS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
