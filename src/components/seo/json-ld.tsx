/**
 * JSON-LD 출력 (서버 컴포넌트) — 페이지당 1개의 <script>에 @graph 로 묶어 낸다(GEO·AEO 전략 v4 A-8).
 * `<` 를 이스케이프해 본문 문자열이 script 를 닫지 못하게 한다.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const list = (Array.isArray(data) ? data : [data]).flatMap((d) => {
    const { '@context': _ctx, '@graph': graph, ...rest } = d as Record<string, unknown>
    void _ctx
    return Array.isArray(graph) ? (graph as object[]) : [rest]
  })
  const doc = { '@context': 'https://schema.org', '@graph': list }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(doc).replace(/</g, '\\u003c') }} />
}
