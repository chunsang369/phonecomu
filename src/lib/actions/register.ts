'use server'

import * as z from 'zod'
import { one } from '@/lib/db'
import { createSession, hashPassword } from '@/lib/auth/session'

// 회원가입 기본정보 스키마 (아이디 가입 규칙 반영)
const registerSchema = z.object({
  username: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{2,19}$/, {
    message: '아이디는 영문으로 시작하는 3~20자의 영문+숫자여야 합니다.',
  }),
  password: z
    .string()
    .min(8, { message: '비밀번호는 8~60자여야 합니다.' })
    .max(60, { message: '비밀번호는 8~60자여야 합니다.' }),
  displayName: z
    .string()
    .min(2, { message: '닉네임은 2~8자 이내여야 합니다.' })
    .max(8, { message: '닉네임은 2~8자 이내여야 합니다.' }),
  email: z.string().email({ message: '올바른 이메일 주소를 입력해주세요.' }),
  mailingOptIn: z.boolean().default(true),
})

export type RegisterInput = z.infer<typeof registerSchema>

export async function registerAccount(input: RegisterInput) {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] as string }
  }
  const { username, password, displayName, email, mailingOptIn } = parsed.data

  // 1. 아이디·닉네임 중복 확인 (대소문자 무시)
  const dupUser = await one('select 1 from profiles where lower(username) = lower($1)', [username])
  if (dupUser) {
    return { error: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.', field: 'username' }
  }
  const dupNick = await one('select 1 from profiles where lower(display_name) = lower($1)', [displayName])
  if (dupNick) {
    return { error: '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.', field: 'displayName' }
  }

  // 2. 계정 생성 (동시 가입으로 유니크 인덱스에 걸리면 중복 안내)
  let created: { id: string } | null
  try {
    created = await one<{ id: string }>(
      `insert into profiles (username, display_name, password_hash, recovery_email, mailing_opt_in)
       values ($1, $2, $3, $4, $5) returning id`,
      [username, displayName, await hashPassword(password), email.toLowerCase(), mailingOptIn],
    )
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      return { error: '이미 사용 중인 아이디 또는 닉네임입니다.', field: 'username' }
    }
    console.error('회원가입 실패:', (e as Error).message)
    return { error: '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }
  }
  if (!created) return { error: '회원가입에 실패했습니다.' }

  // 3. 바로 로그인
  try {
    await createSession(created.id)
    return { success: true, loggedIn: true }
  } catch {
    return { success: true, loggedIn: false }
  }
}
