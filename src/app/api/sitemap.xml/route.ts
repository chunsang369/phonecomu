import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // 1. boards 목록 조회
  const { data: boards } = await supabase
    .from('boards')
    .select('slug')

  // 2. public_posts 글 목록 조회
  const { data: posts } = await supabase
    .from('public_posts')
    .select('id, board:board_id(slug), updated_at')

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const boardUrls = (boards || []).map(b => `
    <url>
      <loc>${origin}/board/${b.slug}</loc>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>
  `).join('')

  const postUrls = (posts || []).map(p => {
    // board 조인 데이터를 활용
    const boardSlug = (p.board as any)?.slug || 'free'
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
