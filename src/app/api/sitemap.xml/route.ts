import { NextResponse } from 'next/server'
import { q } from '@/lib/db'

export async function GET() {
  // 공개 게시판과 공개 게시글만 포함
  const boards = await q<{ slug: string }>('select slug from boards where read_min_level <= 0').catch(() => [])
  const posts = await q<{ id: string; slug: string; updated_at: string }>(
    `select p.id, b.slug, p.updated_at
       from posts p join boards b on b.id = p.board_id
      where p.status = 'published' and b.read_min_level <= 0
      order by p.updated_at desc limit 5000`,
  ).catch(() => [])

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const boardUrls = boards.map((b) => `
    <url>
      <loc>${origin}/board/${b.slug}</loc>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>
  `).join('')

  const postUrls = posts.map((p) => {
    const boardSlug = p.slug
    return `
    <url>
      <loc>${origin}/board/${boardSlug}/${p.id}</loc>
      <lastmod>${new Date(p.updated_at).toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.6</priority>
    </url>
  `}).join('')

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${origin}/calculator</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${origin}/login</loc>
    <priority>0.3</priority>
  </url>
  ${boardUrls}
  ${postUrls}
</urlset>`

  return new NextResponse(sitemapXml.trim(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
    },
  })
}
