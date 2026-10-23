import 'server-only'
import { getCurrentProfile } from '@/lib/auth/session'
import { one } from '@/lib/db'

export async function getAdminProvenance(postId: string) {
  const profile = await getCurrentProfile()
  if (profile?.role !== 'admin') return null
  return one<{ source_url: string }>(
    'select source_url from community_rewrite_provenance where post_id = $1', [postId],
  )
}
