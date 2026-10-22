/**
 * 검색엔진·AI 크롤러 방문과 AI 답변 서비스 유입 분류 (src/proxy.ts에서 사용)
 * 결과는 recordSeoHit()로 seo_daily 테이블에 일자별로 센다.
 */
const BOTS: [RegExp, string][] = [
  [/OAI-SearchBot/i, 'oai-searchbot'],
  [/ChatGPT-User/i, 'chatgpt-user'],
  [/GPTBot/i, 'gptbot'],
  [/Claude-SearchBot/i, 'claude-searchbot'],
  [/Claude-User/i, 'claude-user'],
  [/ClaudeBot/i, 'claudebot'],
  [/Perplexity-User/i, 'perplexity-user'],
  [/PerplexityBot/i, 'perplexitybot'],
  [/Googlebot/i, 'googlebot'],
  [/bingbot/i, 'bingbot'],
  [/Yeti/i, 'yeti'],
  [/Daum(oa)?/i, 'daum'],
  [/Applebot/i, 'applebot'],
  [/DuckDuckBot/i, 'duckduckbot'],
  [/CCBot/i, 'ccbot'],
]

const AI_REFERRERS: [RegExp, string][] = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/, 'chatgpt'],
  [/(^|\.)perplexity\.ai$/, 'perplexity'],
  [/(^|\.)gemini\.google\.com$/, 'gemini'],
  [/(^|\.)copilot\.microsoft\.com$/, 'copilot'],
  [/(^|\.)claude\.ai$/, 'claude'],
  [/(^|\.)chat\.deepseek\.com$/, 'deepseek'],
]

export function classifyVisit(userAgent: string, referer: string | null, utmSource: string | null): { kind: 'bot' | 'ai_ref'; source: string } | null {
  for (const [re, source] of BOTS) if (re.test(userAgent)) return { kind: 'bot', source }
  // AI 답변의 링크는 referer 또는 utm_source(예: chatgpt.com)로 들어온다
  const hosts = [referer, utmSource && /^[\w.-]+$/.test(utmSource) ? `https://${utmSource}` : null]
  for (const h of hosts) {
    if (!h) continue
    let host: string
    try {
      host = new URL(h).hostname
    } catch {
      continue
    }
    for (const [re, source] of AI_REFERRERS) if (re.test(host)) return { kind: 'ai_ref', source }
  }
  return null
}
