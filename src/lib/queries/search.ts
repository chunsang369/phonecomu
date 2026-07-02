import { createClient } from '@/lib/supabase/server'

export async function searchPosts(queryText: string) {
  const supabase = await createClient()

  // 데이터베이스에 선언할 search_posts RPC 호출
  const { data: posts, error } = await supabase
    .rpc('search_posts', { query_text: queryText })

  if (error) {
    console.error('searchPosts 조회 오류:', error)
    return []
  }

  // 기존 글 목록 UI 구조와 호환을 위한 author 맵핑 처리
  return (posts || []).map((post: any) => ({
    ...post,
    author: post.author_id ? {
      id: post.author_id,
      username: post.author_username,
      display_name: post.author_display_name,
      avatar_url: post.author_avatar_url,
      level: post.author_level
    } : null
  }))
}
