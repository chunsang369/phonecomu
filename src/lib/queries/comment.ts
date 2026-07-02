import { createClient } from '@/lib/supabase/server'

export async function getCommentsForPost(postId: string) {
  const supabase = await createClient()

  // 1단계: RLS(comments public read) 정책에 의해 비밀댓글은 권한이 있는 사람만 성공적으로 SELECT됨
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getCommentsForPost 조회 오류:', error)
    return []
  }

  // 2단계: 각 댓글에 작성자 프로필 매핑 (조인 오류 우회)
  const formattedComments = await Promise.all(
    comments.map(async (comment) => {
      // 익명댓글인 경우 작성자 정보를 원천 은닉
      if (comment.is_anonymous) {
        const hash = require('crypto')
          .createHash('md5')
          .update(comment.author_id + comment.post_id)
          .digest('hex')
        
        return {
          ...comment,
          author: null,
          anon_tag: `익명-${hash.substring(0, 4)}`
        }
      }

      // 실명댓글이며 작성자 ID가 존재할 때 프로필 매핑
      if (comment.author_id) {
        const { data: author } = await supabase
          .from('public_profiles')
          .select('id, username, display_name, avatar_url, role, level')
          .eq('id', comment.author_id)
          .single()

        return {
          ...comment,
          author: author || null,
          anon_tag: null
        }
      }

      return {
        ...comment,
        author: null,
        anon_tag: null
      }
    })
  )

  return formattedComments
}
