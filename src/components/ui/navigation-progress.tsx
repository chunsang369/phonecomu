'use client'

import { useEffect, useState } from 'react'

/**
 * 링크를 누른 즉시 화면 맨 위에 진행 막대를 보여준다(다음 페이지 서버 응답을 기다리는 동안 "멈춘 것처럼" 보이지 않게).
 * loading.tsx(Suspense)를 쓰지 않으므로 검색엔진·AI가 받는 HTML 구조에는 영향이 없다.
 */
export default function NavigationProgress() {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle')

  useEffect(() => {
    let startHref = ''
    let poll: ReturnType<typeof setInterval> | undefined
    let hide: ReturnType<typeof setTimeout> | undefined

    const finish = () => {
      clearInterval(poll)
      setPhase('done')
      hide = setTimeout(() => setPhase('idle'), 300)
    }

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return
      const to = new URL(a.href, location.href)
      if (to.origin !== location.origin) return
      const strip = (u: string) => u.split('#')[0]
      if (strip(to.href) === strip(location.href)) return

      clearTimeout(hide)
      clearInterval(poll)
      startHref = location.href
      setPhase('loading')
      // 주소가 바뀌면(이동 완료) 막대를 채우고 숨긴다. 이동이 취소·실패해도 10초 뒤에는 숨긴다.
      const startedAt = Date.now()
      poll = setInterval(() => {
        if (location.href !== startHref || Date.now() - startedAt > 10_000) finish()
      }, 80)
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      clearInterval(poll)
      clearTimeout(hide)
    }
  }, [])

  if (phase === 'idle') return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]">
      <div
        className={`h-full bg-[#5707EB] shadow-[0_0_8px_#5707EB] dark:bg-[#A78BFA] ${
          phase === 'loading' ? 'w-[85%]' : 'w-full opacity-0 transition-[width,opacity] duration-300'
        }`}
        style={phase === 'loading' ? { animation: 'nav-progress-start 8s ease-out' } : undefined}
      />
      <style>{`@keyframes nav-progress-start{0%{width:0}5%{width:25%}100%{width:85%}}`}</style>
    </div>
  )
}
