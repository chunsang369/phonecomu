/**
 * schema.org 구조화 데이터(JSON-LD) 생성기 — AEO·GEO·SEO 공용
 * 모든 URL은 SITE_URL(도메인 연결 전에는 Vercel 운영 주소) 기준 절대 주소로 만든다.
 */
import { SITE_URL } from '@/lib/site-url'

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || '성지평가제'
export const SITE_DESCRIPTION =
  '휴대폰 성지(핸드폰 성지)의 실제 개통 조건을 구매자가 직접 남기고, 실구매가·약속 이행률로 비교하는 휴대폰 싸게 사는 법 정보 커뮤니티입니다. 공시지원금·선택약정 계산기와 구매 가이드를 함께 제공합니다.'

/** 날짜(YYYY-MM-DD)를 한국 시간대가 붙은 ISO 문자열로 — dateModified 등에 사용 */
export const kstDate = (d: string) => (d.length === 10 ? `${d}T00:00:00+09:00` : d)

export const abs = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`)

const ORG_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    knowsAbout: ['휴대폰 성지', '핸드폰 성지', '공시지원금', '선택약정 25% 요금할인', '번호이동', '휴대폰 할부원금', '휴대폰 싸게 사는 법'],
  }
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    alternateName: ['성지평가', '휴대폰 성지 평가'],
    url: SITE_URL,
    inLanguage: 'ko-KR',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** 사이트 공통(Organization + WebSite) — 홈 한 곳에만 출력(전 페이지 반복 금지, 전략 v4 A-8) */
export function siteGraph() {
  return { '@context': 'https://schema.org', '@graph': [organizationSchema(), websiteSchema()] }
}

export type Crumb = { name: string; path: string }

export function breadcrumbSchema(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
  }
}

export type QA = { q: string; a: string }

export function faqSchema(items: QA[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
  }
}

/** 가이드 문서 (운영팀 작성, 작성·수정일 명시) */
export function articleSchema(a: { path: string; headline: string; description: string; datePublished: string; dateModified: string; about?: string[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${abs(a.path)}#article`,
    mainEntityOfPage: abs(a.path),
    headline: a.headline,
    description: a.description,
    inLanguage: 'ko-KR',
    datePublished: kstDate(a.datePublished),
    dateModified: kstDate(a.dateModified),
    author: { '@type': 'Organization', name: `${SITE_NAME} 운영팀`, url: abs('/about') },
    publisher: { '@id': ORG_ID },
    ...(a.about ? { about: a.about.map((name) => ({ '@type': 'Thing', name })) } : {}),
  }
}

export function howToSchema(h: { name: string; description: string; steps: { name: string; text: string }[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: h.name,
    description: h.description,
    step: h.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
  }
}

export function definedTermSetSchema(path: string, name: string, terms: { term: string; definition: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': `${abs(path)}#terms`,
    name,
    hasDefinedTerm: terms.map((t) => ({ '@type': 'DefinedTerm', name: t.term, description: t.definition, inDefinedTermSet: `${abs(path)}#terms` })),
  }
}

/** 커뮤니티 글 (Google 토론 포럼 구조화 데이터 형식) */
export function discussionPostingSchema(p: {
  path: string
  headline: string
  text: string
  datePublished: string
  dateModified?: string
  authorName: string
  authorPath?: string | null
  commentCount: number
  upvotes: number
  comments?: { text: string; datePublished: string; authorName: string }[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': `${abs(p.path)}#post`,
    url: abs(p.path),
    headline: p.headline,
    text: p.text,
    datePublished: p.datePublished,
    ...(p.dateModified ? { dateModified: p.dateModified } : {}),
    author: { '@type': 'Person', name: p.authorName, ...(p.authorPath ? { url: abs(p.authorPath) } : {}) },
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: p.commentCount },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: p.upvotes },
    ],
    ...(p.comments?.length
      ? {
          comment: p.comments.map((c) => ({ '@type': 'Comment', text: c.text, datePublished: c.datePublished, author: { '@type': 'Person', name: c.authorName } })),
        }
      : {}),
  }
}

export function itemListSchema(name: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: abs(it.path) })),
  }
}
