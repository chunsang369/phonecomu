// 아이디 기반 로그인 지원을 위한 공용 헬퍼.
// Supabase 는 이메일로 인증하므로, 사용자의 아이디를 결정적 가상 이메일로 매핑한다.
// (서버 액션 파일이 아니므로 클라이언트/서버 양쪽에서 자유롭게 import 가능)

export const AUTH_EMAIL_DOMAIN = 'phonecomu.com'

export function usernameToAuthEmail(username: string) {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`
}

// 로그인 입력이 이메일이면 그대로, 아이디면 가상 이메일로 변환
export function resolveLoginEmail(identifier: string) {
  const id = identifier.trim()
  return id.includes('@') ? id.toLowerCase() : usernameToAuthEmail(id)
}
