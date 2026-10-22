'use server'

import { revalidatePath } from 'next/cache'
import { one } from '@/lib/db'
import { createSession, destroySession, verifyPassword } from '@/lib/auth/session'

/** 아이디(또는 가입 시 입력한 이메일) + 비밀번호 로그인 */
export async function signIn(identifier: string, password: string) {
  const id = (identifier || '').trim()
  if (!id || !password) return { error: '아이디와 비밀번호를 입력해 주세요.' }

  const user = await one<{ id: string; password_hash: string; status: string }>(
    id.includes('@')
      ? 'select id, password_hash, status from profiles where lower(recovery_email) = lower($1) order by created_at limit 1'
      : 'select id, password_hash, status from profiles where lower(username) = lower($1)',
    [id],
  )
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }
  if (user.status !== 'active') return { error: '이용이 제한된 계정입니다.' }

  await createSession(user.id)
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signOut() {
  await destroySession()
  revalidatePath('/', 'layout')
  return { success: true }
}
