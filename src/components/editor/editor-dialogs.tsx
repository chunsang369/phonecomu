'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, MapPin, Loader2 } from 'lucide-react'
import { CODE_LANGUAGES } from './editor-constants'
import { loadKakaoMaps, hasKakaoKey } from './kakao-loader'

const inputCls =
  'block w-full rounded-lg border border-[#E5E8EC] bg-white px-3 py-2 text-sm text-[#1A1D24] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB] dark:border-[#334155] dark:bg-[#0B111E] dark:text-[#F1F5F9]'

const labelCls = 'block text-xs font-bold text-[#5B6472] dark:text-[#94A3B8] mb-1'

function Modal({
  title,
  onClose,
  onSubmit,
  submitLabel = '확인',
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  onSubmit: () => void
  submitLabel?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full ${wide ? 'max-w-xl' : 'max-w-sm'} rounded-xl bg-white shadow-xl border border-[#E5E8EC] dark:bg-[#151E2E] dark:border-[#334155]`}
      >
        <div className="flex items-center justify-between border-b border-[#E5E8EC] px-5 py-3 dark:border-[#334155]">
          <h3 className="text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#5B6472] hover:bg-[#F7F8FA] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* 글쓰기 폼(form) 내부에 중첩되므로 form 태그를 쓰지 않는다 (중첩 form 은 외부 폼 제출을 유발) */}
        <div
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault()
              onSubmit()
            }
          }}
        >
          <div className="space-y-3 px-5 py-4">{children}</div>
          <div className="flex justify-end gap-2 border-t border-[#E5E8EC] px-5 py-3 dark:border-[#334155]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E5E8EC] px-4 py-1.5 text-xs font-bold text-[#5B6472] hover:bg-[#F7F8FA] dark:border-[#334155] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="rounded-lg bg-[#16305B] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1E4079] dark:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 링크 ─────────────────────────────────────────────
export function LinkDialog({
  initialText,
  onInsert,
  onClose,
}: {
  initialText?: string
  onInsert: (url: string, text: string) => void
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState(initialText || '')
  const [error, setError] = useState('')

  const submit = () => {
    const trimmed = url.trim()
    if (!trimmed) {
      setError('URL을 입력해주세요.')
      return
    }
    const normalized = /^(https?:\/\/|mailto:|\/)/i.test(trimmed) ? trimmed : `https://${trimmed}`
    onInsert(normalized, text.trim() || normalized)
  }

  return (
    <Modal title="링크 삽입" onClose={onClose} onSubmit={submit} submitLabel="삽입">
      <div>
        <label className={labelCls}>URL</label>
        <input
          className={inputCls}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          autoFocus
        />
      </div>
      <div>
        <label className={labelCls}>표시할 텍스트 (선택)</label>
        <input
          className={inputCls}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="비워두면 URL이 표시됩니다"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </Modal>
  )
}

// ── 동영상 ────────────────────────────────────────────
export function parseYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : null
}

export function VideoDialog({
  onInsert,
  onClose,
}: {
  onInsert: (html: string) => void
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    const trimmed = url.trim()
    if (!trimmed) {
      setError('동영상 URL을 입력해주세요.')
      return
    }
    const ytId = parseYouTubeId(trimmed)
    if (ytId) {
      onInsert(
        `<div class="pc-video" contenteditable="false"><iframe src="https://www.youtube.com/embed/${ytId}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div><p><br></p>`
      )
      return
    }
    if (/^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i.test(trimmed)) {
      onInsert(`<video class="pc-video-file" controls preload="metadata" src="${trimmed.replace(/"/g, '&quot;')}"></video><p><br></p>`)
      return
    }
    setError('유튜브 링크 또는 mp4/webm/ogg 동영상 주소만 지원합니다.')
  }

  return (
    <Modal title="동영상 추가" onClose={onClose} onSubmit={submit} submitLabel="추가">
      <div>
        <label className={labelCls}>동영상 URL</label>
        <input
          className={inputCls}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... 또는 .mp4 주소"
          autoFocus
        />
        <p className="mt-1.5 text-[10px] text-[#828B9C] dark:text-[#94A3B8]">
          유튜브(watch/shorts/youtu.be) 링크와 mp4 · webm · ogg 직접 주소를 지원합니다.
        </p>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </Modal>
  )
}

// ── 일정 ─────────────────────────────────────────────
export function ScheduleDialog({
  onInsert,
  onClose,
}: {
  onInsert: (data: { title: string; start: string; end: string; place: string; memo: string }) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [place, setPlace] = useState('')
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!title.trim()) {
      setError('일정 제목을 입력해주세요.')
      return
    }
    if (!start) {
      setError('시작 날짜를 선택해주세요.')
      return
    }
    onInsert({ title: title.trim(), start, end, place: place.trim(), memo: memo.trim() })
  }

  return (
    <Modal title="일정 추가" onClose={onClose} onSubmit={submit} submitLabel="추가" wide>
      <div>
        <label className={labelCls}>일정 제목</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 성지 시세 공동조사 모임" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>시작 날짜</label>
          <input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>종료 날짜 (선택)</label>
          <input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>장소 (선택)</label>
        <input className={inputCls} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="예: 강남역 2번 출구" />
      </div>
      <div>
        <label className={labelCls}>메모 (선택)</label>
        <input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="간단한 설명" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </Modal>
  )
}

// ── 장소 (카카오맵 연동) ───────────────────────────────
export interface PlaceData {
  name: string
  address: string
  roadAddress: string
  lat: number | null
  lng: number | null
}

type MapStatus = 'loading' | 'ready' | 'no-key' | 'error'

export function PlaceDialog({
  onInsert,
  onClose,
}: {
  onInsert: (data: PlaceData) => void
  onClose: () => void
}) {
  const [status, setStatus] = useState<MapStatus>(() => (hasKakaoKey() ? 'loading' : 'no-key'))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searchMsg, setSearchMsg] = useState('')
  const [selected, setSelected] = useState<PlaceData | null>(null)
  const [displayName, setDisplayName] = useState('')

  // 키가 없을 때 수동 입력 폴백용 상태
  const [manualName, setManualName] = useState('')
  const [manualAddr, setManualAddr] = useState('')
  const [manualError, setManualError] = useState('')

  const mapElRef = useRef<HTMLDivElement>(null)
  const kakaoRef = useRef<any>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  const placesRef = useRef<any>(null)

  // 좌표에 마커를 찍고 선택 상태를 갱신 (reverse=true 면 좌표→주소 역지오코딩)
  const markAndSelect = useCallback(
    (lat: number, lng: number, preset: { name: string; address: string; roadAddress: string }, reverse: boolean) => {
      const kakao = kakaoRef.current
      const map = mapRef.current
      if (!kakao || !map) return
      const pos = new kakao.maps.LatLng(lat, lng)
      if (!markerRef.current) {
        markerRef.current = new kakao.maps.Marker({ position: pos })
        markerRef.current.setMap(map)
      } else {
        markerRef.current.setPosition(pos)
      }
      map.panTo(pos)

      if (reverse && geocoderRef.current) {
        geocoderRef.current.coord2Address(lng, lat, (res: any[], st: any) => {
          let road = ''
          let jibun = ''
          if (st === kakao.maps.services.Status.OK && res[0]) {
            road = res[0].road_address ? res[0].road_address.address_name : ''
            jibun = res[0].address ? res[0].address.address_name : ''
          }
          const nm = road || jibun || '지정한 위치'
          setSelected({ name: nm, address: jibun, roadAddress: road, lat, lng })
          setDisplayName(nm)
        })
      } else {
        setSelected({ name: preset.name, address: preset.address, roadAddress: preset.roadAddress, lat, lng })
        setDisplayName(preset.name)
      }
    },
    []
  )

  // SDK 로드 + 지도 초기화 (1회)
  useEffect(() => {
    if (!hasKakaoKey()) return
    let cancelled = false
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapElRef.current) return
        kakaoRef.current = kakao
        const map = new kakao.maps.Map(mapElRef.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978), // 서울시청 기준
          level: 5,
        })
        mapRef.current = map
        geocoderRef.current = new kakao.maps.services.Geocoder()
        placesRef.current = new kakao.maps.services.Places()

        // 지도 클릭 → 해당 좌표에 핀 + 역지오코딩
        kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
          const ll = mouseEvent.latLng
          markAndSelect(ll.getLat(), ll.getLng(), { name: '', address: '', roadAddress: '' }, true)
        })

        setStatus('ready')
        // 다이얼로그 애니메이션 후 타일 깨짐 방지
        setTimeout(() => map.relayout(), 80)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setStatus(err?.message === 'NO_KEY' ? 'no-key' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [markAndSelect])

  const doSearch = () => {
    const kakao = kakaoRef.current
    if (!placesRef.current || !kakao) return
    const q = query.trim()
    if (!q) {
      setSearchMsg('검색어를 입력하세요.')
      return
    }
    placesRef.current.keywordSearch(q, (data: any[], st: any) => {
      if (st === kakao.maps.services.Status.OK) {
        setResults(data)
        setSearchMsg('')
        if (data[0] && mapRef.current) {
          mapRef.current.panTo(new kakao.maps.LatLng(parseFloat(data[0].y), parseFloat(data[0].x)))
        }
      } else if (st === kakao.maps.services.Status.ZERO_RESULT) {
        setResults([])
        setSearchMsg('검색 결과가 없습니다. 다른 키워드로 시도해보세요.')
      } else {
        setResults([])
        setSearchMsg('검색 중 오류가 발생했습니다. (앱 키 / 도메인 등록을 확인하세요)')
      }
    })
  }

  const selectResult = (r: any) => {
    markAndSelect(
      parseFloat(r.y),
      parseFloat(r.x),
      { name: r.place_name, address: r.address_name || '', roadAddress: r.road_address_name || '' },
      false
    )
  }

  const submitMap = () => {
    if (!selected) return
    onInsert({ ...selected, name: displayName.trim() || selected.name })
  }

  const submitManual = () => {
    if (!manualName.trim()) {
      setManualError('장소 이름을 입력해주세요.')
      return
    }
    onInsert({ name: manualName.trim(), address: manualAddr.trim(), roadAddress: '', lat: null, lng: null })
  }

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  // 키 없음 → 기존 수동 입력 폴백
  if (status === 'no-key') {
    return (
      <Modal title="장소 추가" onClose={onClose} onSubmit={submitManual} submitLabel="추가">
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          카카오맵 검색을 사용하려면 관리자가 <code className="font-mono">NEXT_PUBLIC_KAKAO_MAP_KEY</code> 를 설정해야 합니다. 지금은 직접 입력할 수 있어요.
        </div>
        <div>
          <label className={labelCls}>장소 이름</label>
          <input className={inputCls} value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="예: 강변 테크노마트" autoFocus />
        </div>
        <div>
          <label className={labelCls}>주소 (선택)</label>
          <input className={inputCls} value={manualAddr} onChange={(e) => setManualAddr(e.target.value)} placeholder="예: 서울 광진구 광나루로56길 85" />
        </div>
        {manualError && <p className="text-xs text-red-500">{manualError}</p>}
      </Modal>
    )
  }

  // 카카오맵 지도 선택 UI
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#E5E8EC] bg-white shadow-xl dark:border-[#334155] dark:bg-[#151E2E]" onMouseDown={stop}>
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-[#E5E8EC] px-5 py-3 dark:border-[#334155]">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#1A1D24] dark:text-[#F1F5F9]">
            <MapPin className="h-4 w-4 text-[#2563EB]" />
            장소 추가
            <span className="text-[11px] font-semibold text-[#828B9C]">카카오맵에서 검색·선택</span>
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#5B6472] hover:bg-[#F7F8FA] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문: 좌(검색/결과) + 우(지도) */}
        <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
          {/* 좌측 검색 패널 */}
          <div className="flex w-full flex-col border-b border-[#E5E8EC] sm:w-[286px] sm:border-b-0 sm:border-r dark:border-[#334155]">
            <div className="flex gap-1.5 p-3">
              <input
                className={inputCls}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    doSearch()
                  }
                }}
                placeholder="장소·상호·주소 검색"
                autoFocus
              />
              <button
                type="button"
                onClick={doSearch}
                className="flex shrink-0 items-center justify-center rounded-lg bg-[#16305B] px-3 text-white hover:bg-[#1E4079] dark:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
                aria-label="검색"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[180px] flex-1 overflow-y-auto px-2 pb-2 sm:max-h-none">
              {searchMsg && <p className="px-2 py-3 text-center text-[11px] font-semibold text-[#828B9C]">{searchMsg}</p>}
              {results.length === 0 && !searchMsg && (
                <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-[#A8B0BC]">
                  키워드로 장소를 검색하거나
                  <br />
                  오른쪽 지도를 클릭해 위치를 지정하세요.
                </p>
              )}
              <ul className="space-y-1">
                {results.map((r) => {
                  const isSel = selected?.lat === parseFloat(r.y) && selected?.lng === parseFloat(r.x)
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => selectResult(r)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          isSel
                            ? 'border-[#2563EB] bg-[#EEF2FF] dark:border-[#3B82F6] dark:bg-[#1E3A8A]/30'
                            : 'border-transparent hover:bg-[#F1F3F6] dark:hover:bg-[#1E293B]'
                        }`}
                      >
                        <p className="truncate text-[12px] font-bold text-[#1A1D24] dark:text-[#F1F5F9]">{r.place_name}</p>
                        <p className="truncate text-[10px] text-[#828B9C]">{r.road_address_name || r.address_name}</p>
                        {r.category_name && <p className="truncate text-[9px] text-[#A8B0BC]">{r.category_name}</p>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* 우측 지도 */}
          <div className="relative min-h-[300px] flex-1 bg-[#EAEDF1] dark:bg-[#0B111E]">
            <div ref={mapElRef} className="absolute inset-0 h-full w-full" />
            {status === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#5B6472] dark:text-[#94A3B8]">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs font-semibold">지도를 불러오는 중…</span>
              </div>
            )}
            {status === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
                <p className="text-xs font-bold text-red-500">지도를 불러오지 못했습니다.</p>
                <p className="text-[11px] text-[#828B9C]">카카오 앱 키가 유효한지, 현재 도메인이 플랫폼에 등록되어 있는지 확인해주세요.</p>
              </div>
            )}
            {status === 'ready' && (
              <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold text-white">
                지도를 클릭하면 그 위치로 핀이 이동합니다
              </div>
            )}
          </div>
        </div>

        {/* 선택 결과 + 액션 */}
        <div className="border-t border-[#E5E8EC] px-5 py-3 dark:border-[#334155]">
          {selected ? (
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className={labelCls}>표시 이름</label>
                <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="게시글에 표시할 이름" />
              </div>
              <p className="flex-1 truncate pb-2 text-[11px] text-[#5B6472] dark:text-[#94A3B8]">
                📍 {selected.roadAddress || selected.address || '주소 정보 없음'}
              </p>
            </div>
          ) : (
            <p className="mb-3 text-[11px] font-semibold text-[#828B9C]">검색 결과를 선택하거나 지도를 클릭해 위치를 지정하세요.</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E5E8EC] px-4 py-1.5 text-xs font-bold text-[#5B6472] hover:bg-[#F7F8FA] dark:border-[#334155] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={submitMap}
              className="rounded-lg bg-[#16305B] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1E4079] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
            >
              이 위치 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 소스코드 ──────────────────────────────────────────
export function CodeDialog({
  onInsert,
  onClose,
}: {
  onInsert: (data: { lang: string; code: string }) => void
  onClose: () => void
}) {
  const [lang, setLang] = useState('text')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!code.trim()) {
      setError('코드를 입력해주세요.')
      return
    }
    onInsert({ lang, code })
  }

  return (
    <Modal title="소스코드 삽입" onClose={onClose} onSubmit={submit} submitLabel="삽입" wide>
      <div>
        <label className={labelCls}>언어</label>
        <select className={inputCls} value={lang} onChange={(e) => setLang(e.target.value)}>
          {CODE_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>코드</label>
        <textarea
          className={`${inputCls} min-h-[200px] font-mono text-xs leading-relaxed`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="코드를 붙여넣으세요"
          spellCheck={false}
          autoFocus
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </Modal>
  )
}
