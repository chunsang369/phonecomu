import { createClient } from '@/lib/supabase/server'

export async function getPostsByBoard(boardId: number, limit: number = 20) {
  const supabase = await createClient()
  
  // public_posts 뷰에서 직접 단일 패치 (관계 조인 제거)
  const { data: posts, error: error } = await supabase
    .from('public_posts')
    .select('id, board_id, title, view_count, upvotes, downvotes, comment_count, created_at, is_anonymous, author_id, author_username, author_display_name, author_avatar_url, author_level, anon_tag')
    .eq('board_id', boardId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getPostsByBoard 조회 오류:', error)
    return []
  }

  // 기존 컴포넌트 호환을 위해 author 객체 맵핑 리턴
  return posts.map(post => ({
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

export async function getPostDetail(postId: string) {
  const supabase = await createClient()
  
  // public_posts 뷰에서 조인 없이 단일 조회
  const { data: post, error: postError } = await supabase
    .from('public_posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (postError) {
    console.error('getPostDetail 조회 오류:', postError)
    return null
  }

  // 기존 컴포넌트 호환을 위해 author 객체 맵핑 리턴
  if (post) {
    return {
      ...post,
      author: post.author_id ? {
        id: post.author_id,
        username: post.author_username,
        display_name: post.author_display_name,
        avatar_url: post.author_avatar_url,
        level: post.author_level
      } : null
    }
  }

  return null
}
