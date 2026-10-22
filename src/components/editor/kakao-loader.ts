// 카카오맵 JavaScript SDK 싱글톤 로더.
// 장소 선택 다이얼로그가 열릴 때만 스크립트를 지연 로드하고, 여러 번 열어도 중복 로드하지 않는다.
//
// 사용하려면 카카오 개발자 콘솔(https://developers.kakao.com)에서 발급받은
// "JavaScript 키"를 .env.local 의 NEXT_PUBLIC_KAKAO_MAP_KEY 에 넣고,
// 앱 도메인(예: http://localhost:3000, 배포 도메인)을 [내 애플리케이션 > 앱 설정 > 플랫폼 > Web]
// 사이트 도메인에 등록해야 한다. services 라이브러리로 키워드 검색·좌표↔주소 변환을 사용한다.

/* eslint-disable @typescript-eslint/no-explicit-any */

let sdkPromise: Promise<any> | null = null

export const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || ''

export function hasKakaoKey(): boolean {
  return KAKAO_MAP_KEY.length > 0
}

export function loadKakaoMaps(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('NO_WINDOW'))
  }
  if (!KAKAO_MAP_KEY) {
    return Promise.reject(new Error('NO_KEY'))
  }

  const w = window as any

  // 이미 로드 완료된 경우 즉시 반환
  if (w.kakao && w.kakao.maps && w.kakao.maps.Map) {
    return Promise.resolve(w.kakao)
  }

  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    const finish = () => {
      // autoload=false 로 로드했으므로 명시적으로 maps 모듈을 초기화
      w.kakao.maps.load(() => resolve(w.kakao))
    }

    const existing = document.getElementById('kakao-maps-sdk') as HTMLScriptElement | null
    if (existing) {
      if (w.kakao && w.kakao.maps) {
        finish()
      } else {
        existing.addEventListener('load', finish)
        existing.addEventListener('error', () => {
          sdkPromise = null
          reject(new Error('SDK_LOAD_FAILED'))
        })
      }
      return
    }

    const script = document.createElement('script')
    script.id = 'kakao-maps-sdk'
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`
    script.onload = finish
    script.onerror = () => {
      sdkPromise = null
      reject(new Error('SDK_LOAD_FAILED'))
    }
    document.head.appendChild(script)
  })

  return sdkPromise
}
