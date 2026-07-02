import { createClient } from '@/lib/supabase/server'

export async function getBoardBySlug(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export async function getAllBoards() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('sort')

  if (error) return []
  return data
}

export async function getTopUsers(limit: number = 5) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, username, display_name, level, adopted_count, trust_score')
    .order('level', { ascending: false })
    .order('adopted_count', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getTopUsers 조회 오류:', error)
    return []
  }
  return data
}
