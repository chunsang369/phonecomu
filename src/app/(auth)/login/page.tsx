'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { AlertCircle, Loader2 } from 'lucide-react'

// zod 스키마 정의
const authSchema = z.object({
  email: z.string().email({ message: '올바른 이메일 주소를 입력해주세요.' }),
  password: z.string().min(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' }),
})

type AuthFormValues = z.infer<typeof authSchema>

function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: AuthFormValues) => {
    setLoading(true)
    setErrorMsg(null)
    setMessage(null)

    try {
      if (isSignUp) {
        // 회원가입 처리
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        })

        if (error) {
          setErrorMsg(error.message)
        } else if (data.user && data.session === null) {
          // 이메일 확인 메일 발송 완료 상태
          setMessage('회원가입 확인 메일이 전송되었습니다. 이메일을 확인해 주세요.')
        } else if (data.session) {
          // 자동 로그인 성공 (이메일 확인 불필요 설정 등의 경우)
          router.push('/onboarding')
        }
      } else {
        // 로그인 처리
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        })

        if (error) {
          setErrorMsg('이메일 혹은 비밀번호가 일치하지 않습니다.')
        } else {
          router.push(next)
          router.refresh()
        }
      }
    } catch (err: any) {
      setErrorMsg('인증 도중 알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md border border-[#E5E8EC] dark:bg-[#151E2E] dark:border-[#334155]">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-[#16305B] dark:text-[#38BDF8]">
          {process.env.NEXT_PUBLIC_SITE_NAME || 'phone-community'}
        </h2>
        <p className="mt-2 text-sm text-[#5B6472] dark:text-[#94A3B8]">
          {isSignUp ? '간편하게 회원가입을 완료하세요' : '로그인하여 커뮤니티에 참여하세요'}
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4 rounded-md">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1A1D24] dark:text-[#F1F5F9]">
              이메일 주소
            </label>
            <input
              id="email"
              type="email"
              disabled={loading}
              {...register('email')}
              className="mt-1 block w-full rounded-lg border border-[#E5E8EC] bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-gray-100 dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9] dark:focus:border-[#3B82F6]"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1A1D24] dark:text-[#F1F5F9]">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              disabled={loading}
              {...register('password')}
              className="mt-1 block w-full rounded-lg border border-[#E5E8EC] bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-gray-100 dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9] dark:focus:border-[#3B82F6]"
              placeholder="••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-lg bg-[#16305B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E4079] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:bg-gray-400 dark:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSignUp ? (
              '이메일로 가입하기'
            ) : (
              '로그인'
            )}
          </button>
        </div>
      </form>

      <div className="text-center">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setIsSignUp(!isSignUp)
            setErrorMsg(null)
            setMessage(null)
          }}
          className="text-sm font-medium text-[#2563EB] hover:underline dark:text-[#38BDF8]"
        >
          {isSignUp ? '이미 계정이 있으신가요? 로그인하기' : '계정이 없으신가요? 회원가입하기'}
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4 py-12 dark:bg-[#0B111E]">
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#16305B] dark:text-[#38BDF8]" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
