import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SiteHeader from '@/components/layout/site-header'
import Footer from '@/components/ui/footer'
import AdSlot from '@/components/ads/ad-slot'
import JsonLd from '@/components/seo/json-ld'
import GuideArticle from '@/components/guide/guide-article'
import GuideSidebar from '@/components/guide/guide-sidebar'
import { GUIDES, getGuide, glossaryTerms } from '@/lib/guides/content'
import { articleSchema, breadcrumbSchema, definedTermSetSchema, faqSchema, howToSchema, kstDate } from '@/lib/seo/schema'
import { pageMeta } from '@/lib/seo/metadata'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const g = getGuide(slug)
  if (!g) return {}
  return pageMeta({
    title: g.metaTitle,
    description: g.description,
    path: `/guide/${g.slug}`,
    type: 'article',
    publishedTime: kstDate(g.datePublished),
    modifiedTime: kstDate(g.dateModified),
    keywords: g.keywords,
  })
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const g = getGuide(slug)
  if (!g) notFound()
  const related = g.related.map((s) => getGuide(s)).filter((x): x is NonNullable<typeof x> => !!x).map((x) => ({ slug: x.slug, title: x.title }))

  const ld: object[] = [
    articleSchema({ path: `/guide/${g.slug}`, headline: g.title, description: g.description, datePublished: g.datePublished, dateModified: g.dateModified, about: g.keywords }),
    breadcrumbSchema([
      { name: '홈', path: '/' },
      { name: '휴대폰 구매 가이드', path: '/guide' },
      { name: g.title, path: `/guide/${g.slug}` },
    ]),
    faqSchema(g.faq),
  ]
  if (g.howTo) ld.push(howToSchema({ name: g.howTo.name, description: g.summary, steps: g.howTo.steps }))
  if (g.slug === 'glossary') ld.push(definedTermSetSchema(`/guide/${g.slug}`, g.title, glossaryTerms()))

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#454545] dark:bg-[#0B0F19] dark:text-[#E2E8F0]">
      <JsonLd data={ld} />
      <SiteHeader active="guide" />
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <GuideArticle g={g} relatedGuides={related} />
        </div>
        <aside className="space-y-5">
          <GuideSidebar current={g.slug} />
          <AdSlot slot="board-side" />
        </aside>
      </main>
      <Footer />
    </div>
  )
}
