/** 휴대폰 구매 가이드 문서 구조 — AEO: 질문형 소제목 + 첫 문장에 답 + FAQ + 출처·수정일 */
export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { type: 'note'; text: string }

export type GuideSection = {
  id: string
  /** 질문형 소제목 (H2) */
  question: string
  /** 소제목 바로 아래 첫 문단: 질문에 대한 직접 답 (인용 단위) */
  answer: string
  blocks?: GuideBlock[]
}

export type Guide = {
  slug: string
  /** 페이지 제목(H1) */
  title: string
  /** 검색 결과 제목 */
  metaTitle: string
  /** 검색 결과 설명 */
  description: string
  /** 문서 맨 위 요약: 핵심 답을 2~3문장으로 */
  summary: string
  keywords: string[]
  datePublished: string
  dateModified: string
  sections: GuideSection[]
  howTo?: { name: string; steps: { name: string; text: string }[] }
  faq: { q: string; a: string }[]
  /** 근거 자료 (직접 확인한 공개 자료만) */
  sources?: { name: string; url: string; note?: string }[]
  related: string[]
  /** 문서 끝 행동 유도 링크 */
  cta?: { label: string; href: string }[]
}
