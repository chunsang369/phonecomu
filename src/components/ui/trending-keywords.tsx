'use client'

import { useState, useEffect } from 'react'

interface Keyword {
  rank: number
  word: string
}

const KEYWORDS: Keyword[] = [
  { rank: 1, word: '갤럭시 S26 대란' },
  { rank: 2, word: '아이폰 17 공시지원금' },
  { rank: 3, word: '신도림 테크노 좌표' },
  { rank: 4, word: '선택약정 25% 계산기' },
  { rank: 5, word: '제휴카드 상술 분석' },
  { rank: 6, word: '번호이동 보조금 스팟' },
  { rank: 7, word: '당일 단가 대리점' },
  { rank: 8, word: '자급제폰 최저가 비교' },
  { rank: 9, word: '호갱탈출 가이드북' },
  { rank: 10, word: '성지 초성 약어사전' }
]

export default function TrendingKeywords() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [animate, setAnimate] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      // 롤링 애니메이션을 위해 먼저 transition 적용했다가 슬라이드 전환 후 인덱스 갱신
      setAnimate(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % KEYWORDS.length)
        setAnimate(true)
      }, 200)
    }, 3000)

    return () => clearInterval(timer)
  }, [])

  const current = KEYWORDS[currentIndex]

  return (
    <div className="flex items-center gap-3 border border-[#E2E8F0] rounded-lg bg-slate-50 px-4 py-2 dark:border-[#374151] dark:bg-[#1F2937] w-64 h-10 overflow-hidden shrink-0">
      <span className="text-[10px] font-black text-[#7C3AED] shrink-0 select-none">인기검색</span>
      <span className="text-[#E2E8F0] dark:text-[#374151] text-xs">|</span>
      
      {/* 부드러운 Fade & Slide Up 애니메이션 컨테이너 */}
      <div className="relative flex-1 h-5 overflow-hidden">
        <div 
          className={`flex items-center gap-2 h-full transition-all duration-300 transform ${
            animate 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 -translate-y-2'
          }`}
        >
          <span className="text-[#7C3AED] text-xs font-black w-4 text-center shrink-0">
            {current.rank}
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate select-none">
            {current.word}
          </span>
        </div>
      </div>
    </div>
  )
}
