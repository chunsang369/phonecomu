/**
 * 페이지별 메타데이터 공통값 — canonical·og:url은 루트 레이아웃이 아니라 각 페이지에서 지정한다(전략 v4).
 * Next.js는 openGraph 객체를 얕게 병합하므로(하위가 상위를 통째로 대체) 공통값을 매 페이지에 펼쳐 넣는다.
 */
import type { Metadata } from 'next'
import { SITE_NAME } from './schema'

export const baseOpenGraph = { siteName: SITE_NAME, locale: 'ko_KR' } as const

type PageMetaInput = {
  /** 검색 결과 제목 (사이트명은 자동으로 붙임) */
  title: string
  description: string
  /** 사이트 기준 경로 (예: /guide/buy-phone-cheap) */
  path: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  keywords?: string[]
}

export function pageMeta(m: PageMetaInput): Metadata {
  const fullTitle = m.title.includes(SITE_NAME) ? m.title : `${m.title} | ${SITE_NAME}`
  return {
    title: fullTitle,
    description: m.description,
    ...(m.keywords ? { keywords: m.keywords } : {}),
    alternates: { canonical: m.path },
    openGraph: {
      ...baseOpenGraph,
      type: m.type ?? 'website',
      title: m.title,
      description: m.description,
      url: m.path,
      ...(m.type === 'article' && m.publishedTime ? { publishedTime: m.publishedTime, modifiedTime: m.modifiedTime ?? m.publishedTime } : {}),
    },
    twitter: { card: 'summary', title: m.title, description: m.description },
  }
}
