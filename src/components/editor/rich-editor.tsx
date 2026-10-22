'use client'

// 네이버 스마트에디터 스타일의 자체 구현 리치 텍스트 에디터.
// 외부 에디터 라이브러리 없이 contentEditable + Selection API 로 동작한다.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Image as ImageIcon,
  Film,
  Smile,
  Link as LinkIcon,
  Link2,
  CalendarDays,
  Code,
  Table as TableIcon,
  MapPin,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  TextAlignStart,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  List,
  ListOrdered,
  Rows3,
  Superscript,
  Subscript,
  ChevronDown,
  Type,
  Ellipsis,
} from 'lucide-react'
import {
  PARAGRAPH_STYLES,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_HEIGHTS,
  COLOR_PALETTE,
  SPECIAL_CHARS,
  STICKERS,
  escapeHtml,
} from './editor-constants'
import { LinkDialog, VideoDialog, ScheduleDialog, PlaceDialog, CodeDialog, type PlaceData } from './editor-dialogs'

type PanelId =
  | 'pstyle'
  | 'font'
  | 'size'
  | 'color'
  | 'bg'
  | 'align'
  | 'list'
  | 'lineheight'
  | 'special'
  | 'sticker'
  | 'table'
  | null

type DialogId = 'link' | 'video' | 'schedule' | 'place' | 'code' | null

interface RichEditorProps {
  initialValue?: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
}

const BLOCK_SELECTOR = 'p,div,h1,h2,h3,h4,li,pre,blockquote'

// 1열 삽입 도구 정의 (모듈 상수 — 렌더 중 재생성 방지)
type InsertAction = 'photo' | 'video' | 'sticker' | 'link' | 'schedule' | 'code' | 'table' | 'place'
const INSERT_ITEMS: { label: string; icon: React.ComponentType<{ className?: string }>; action: InsertAction; panelId?: 'sticker' | 'table' }[] = [
  { label: '사진', icon: ImageIcon, action: 'photo' },
  { label: '동영상', icon: Film, action: 'video' },
  { label: '스티커', icon: Smile, action: 'sticker', panelId: 'sticker' },
  { label: '링크', icon: LinkIcon, action: 'link' },
  { label: '일정', icon: CalendarDays, action: 'schedule' },
  { label: '소스코드', icon: Code, action: 'code' },
  { label: '표', icon: TableIcon, action: 'table', panelId: 'table' },
  { label: '장소', icon: MapPin, action: 'place' },
]

// 모바일 툴바에 항상 노출할 핵심 삽입 도구 (나머지는 '더보기(...)' 시트로 이동)
const MOBILE_PRIMARY_INSERTS = new Set<InsertAction>(['photo', 'table', 'sticker'])

// 날짜 'YYYY-MM-DD' → 'YYYY.MM.DD'
function fmtDate(d: string): string {
  return d ? d.replaceAll('-', '.') : ''
}

export default function RichEditor({ initialValue = '', onChange, disabled, placeholder }: RichEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savedRangeRef = useRef<Range | null>(null)

  const [panel, setPanel] = useState<PanelId>(null)
  const [dialog, setDialog] = useState<DialogId>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [selectedText, setSelectedText] = useState('')
  const [tableHover, setTableHover] = useState<{ r: number; c: number }>({ r: 0, c: 0 })
  // 모바일 전용: 서식 시트 / 더보기 시트 열림 상태
  const [mobileSheet, setMobileSheet] = useState<'format' | 'more' | null>(null)

  const [active, setActive] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    sup: false,
    sub: false,
    align: 'left' as 'left' | 'center' | 'right' | 'justify',
    blockLabel: '본문',
    fontLabel: '기본서체',
    sizeLabel: 15,
  })

  const checkEmpty = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const hasMedia = !!el.querySelector('img,table,iframe,video,.pc-card,.pc-sticker')
    setIsEmpty(!hasMedia && (el.textContent || '').trim().length === 0)
  }, [])

  // ── 초기화 (마운트 시 1회) ────────────────────────────
  const didInitRef = useRef(false)
  useEffect(() => {
    const el = editorRef.current
    if (!el || didInitRef.current) return
    didInitRef.current = true
    el.innerHTML = initialValue || '<p><br></p>'
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p')
    } catch {
      /* 미지원 브라우저 무시 */
    }
    checkEmpty()
  }, [initialValue, checkEmpty])

  const emit = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    onChange(el.innerHTML)
    checkEmpty()
  }, [onChange, checkEmpty])

  // ── 선택 영역 관리 ────────────────────────────────────
  const updateToolbarState = useCallback(() => {
    try {
      const sel = window.getSelection()
      const el = editorRef.current
      if (!sel || !el || sel.rangeCount === 0) return
      const anchor = sel.anchorNode
      if (!anchor || !el.contains(anchor)) return

      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
      setSelectedText(sel.toString())

      const align = document.queryCommandState('justifyCenter')
        ? 'center'
        : document.queryCommandState('justifyRight')
          ? 'right'
          : document.queryCommandState('justifyFull')
            ? 'justify'
            : 'left'

      // 현재 블록 스타일 탐색
      let blockLabel = '본문'
      let node: Node | null = anchor
      while (node && node !== el) {
        if (node.nodeType === 1) {
          const tag = (node as HTMLElement).tagName
          const found = PARAGRAPH_STYLES.find((s) => s.tag === tag)
          if (found) {
            blockLabel = found.label
            break
          }
        }
        node = node.parentNode
      }

      // 현재 글꼴/크기 (computed style 기준)
      const elem = (anchor.nodeType === 1 ? anchor : anchor.parentNode) as HTMLElement | null
      let fontLabel = '기본서체'
      let sizeLabel = 15
      if (elem) {
        const cs = window.getComputedStyle(elem)
        sizeLabel = Math.round(parseFloat(cs.fontSize)) || 15
        const famLower = cs.fontFamily.toLowerCase()
        for (const f of FONT_FAMILIES) {
          if (!f.value) continue
          const first = f.value.split(',')[0].replace(/["']/g, '').trim().toLowerCase()
          if (famLower.includes(first)) {
            fontLabel = f.label
            break
          }
        }
      }

      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        sup: document.queryCommandState('superscript'),
        sub: document.queryCommandState('subscript'),
        align,
        blockLabel,
        fontLabel,
        sizeLabel,
      })
    } catch {
      /* queryCommandState 미지원 상황 무시 */
    }
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbarState)
    return () => document.removeEventListener('selectionchange', updateToolbarState)
  }, [updateToolbarState])

  // 패널 바깥 또는 주변 클릭 시 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target) return

      // 1. 에디터 바깥을 클릭한 경우
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setPanel(null)
        setMobileSheet(null)
        return
      }

      // 2. 에디터 안쪽이더라도 본문 편집 영역(editorRef)을 클릭한 경우 (타이핑 시작 → 시트 접기)
      if (editorRef.current && editorRef.current.contains(target)) {
        setPanel(null)
        setMobileSheet(null)
        return
      }

      // 3. 패널 내부(z-50 클래스)가 아니면서 버튼(button)이나 셀렉터도 아닌 빈 공간을 클릭한 경우
      const isInsidePanel = target.closest('.z-50')
      const isButton = target.closest('button')
      if (!isInsidePanel && !isButton) {
        setPanel(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const restoreSelection = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel) return
    if (savedRangeRef.current && el.contains(savedRangeRef.current.commonAncestorContainer)) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    } else {
      // 저장된 선택이 없으면 맨 끝에 커서
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }, [])

  // ── 명령 실행 헬퍼 ────────────────────────────────────
  const exec = useCallback(
    (command: string, value?: string, useCss = true) => {
      restoreSelection()
      try {
        document.execCommand('styleWithCSS', false, useCss ? 'true' : 'false')
      } catch {
        /* 무시 */
      }
      document.execCommand(command, false, value)
      emit()
      updateToolbarState()
    },
    [restoreSelection, emit, updateToolbarState]
  )

  const insertHtml = useCallback(
    (html: string) => {
      restoreSelection()
      document.execCommand('insertHTML', false, html)
      emit()
    },
    [restoreSelection, emit]
  )

  // 글자 크기: fontSize 7 적용 후 font 태그를 span 으로 치환하는 표준 기법
  const applyFontSize = useCallback(
    (px: number) => {
      restoreSelection()
      try {
        document.execCommand('styleWithCSS', false, 'false')
      } catch {
        /* 무시 */
      }
      document.execCommand('fontSize', false, '7')
      const el = editorRef.current
      if (el) {
        el.querySelectorAll('font[size="7"]').forEach((f) => {
          const span = document.createElement('span')
          span.style.fontSize = `${px}px`
          while (f.firstChild) span.appendChild(f.firstChild)
          f.replaceWith(span)
        })
        el.querySelectorAll('span[style*="xxx-large"]').forEach((s) => {
          ;(s as HTMLElement).style.fontSize = `${px}px`
        })
      }
      emit()
      updateToolbarState()
    },
    [restoreSelection, emit, updateToolbarState]
  )

  // 줄간격: 선택 범위와 교차하는 블록들에 line-height 적용
  const applyLineHeight = useCallback(
    (lh: string) => {
      restoreSelection()
      const el = editorRef.current
      const sel = window.getSelection()
      if (!el || !sel || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      el.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach((block) => {
        if (block.closest('[contenteditable="false"]')) return
        if (range.intersectsNode(block)) {
          block.style.lineHeight = lh
        }
      })
      emit()
    },
    [restoreSelection, emit]
  )

  // ── 사진 업로드 (클라이언트 리사이즈 후 data URL 삽입) ─────
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      // GIF 는 애니메이션 보존을 위해 원본 유지 (4MB 제한)
      if (file.type === 'image/gif') {
        if (file.size > 4 * 1024 * 1024) {
          reject(new Error('GIF는 4MB 이하만 첨부할 수 있습니다.'))
          return
        }
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
        reader.readAsDataURL(file)
        return
      }

      const url = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1400
        let { width, height } = img
        if (width > MAX) {
          height = Math.round((height * MAX) / width)
          width = MAX
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('이미지 처리에 실패했습니다.'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const keepPng = file.type === 'image/png' && file.size < 2 * 1024 * 1024
        resolve(keepPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('이미지를 불러오지 못했습니다.'))
      }
      img.src = url
    })

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const dataUrl = await compressImage(file)
        insertHtml(`<img class="pc-img" src="${dataUrl}" alt="${escapeHtml(file.name)}"><p><br></p>`)
      } catch (err) {
        alert(err instanceof Error ? err.message : '이미지 첨부에 실패했습니다.')
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── 블록 삽입 빌더 ────────────────────────────────────
  const insertTable = (rows: number, cols: number) => {
    const row = `<tr>${'<td><br></td>'.repeat(cols)}</tr>`
    insertHtml(`<table class="pc-table"><tbody>${row.repeat(rows)}</tbody></table><p><br></p>`)
    setPanel(null)
  }

  const insertSchedule = (d: { title: string; start: string; end: string; place: string; memo: string }) => {
    const period = d.end && d.end !== d.start ? `${fmtDate(d.start)} ~ ${fmtDate(d.end)}` : fmtDate(d.start)
    const html =
      `<div class="pc-card pc-schedule" contenteditable="false">` +
      `<span class="pc-card-ico">📅</span>` +
      `<span class="pc-card-body">` +
      `<strong class="pc-card-title">${escapeHtml(d.title)}</strong>` +
      `<span class="pc-card-line">🗓 ${escapeHtml(period)}</span>` +
      (d.place ? `<span class="pc-card-line">📍 ${escapeHtml(d.place)}</span>` : '') +
      (d.memo ? `<span class="pc-card-line pc-card-memo">${escapeHtml(d.memo)}</span>` : '') +
      `</span></div><p><br></p>`
    insertHtml(html)
    setDialog(null)
  }

  const insertPlace = (d: PlaceData) => {
    const addr = d.roadAddress || d.address
    // 좌표가 있으면 map/link 로 정확한 지점을, 없으면 이름 검색 링크로 대체
    const hasCoord = d.lat != null && d.lng != null
    const mapUrl = hasCoord
      ? `https://map.kakao.com/link/map/${encodeURIComponent(d.name)},${d.lat},${d.lng}`
      : `https://map.kakao.com/link/search/${encodeURIComponent(d.name)}`
    const html =
      `<div class="pc-card pc-place" contenteditable="false">` +
      `<span class="pc-card-ico">📍</span>` +
      `<span class="pc-card-body">` +
      `<strong class="pc-card-title">${escapeHtml(d.name)}</strong>` +
      (addr ? `<span class="pc-card-line">${escapeHtml(addr)}</span>` : '') +
      `<a class="pc-card-maplink" href="${mapUrl}" target="_blank" rel="noopener noreferrer">카카오맵에서 보기 →</a>` +
      `</span></div><p><br></p>`
    insertHtml(html)
    setDialog(null)
  }

  const insertCode = (d: { lang: string; code: string }) => {
    insertHtml(`<pre class="pc-code" data-lang="${escapeHtml(d.lang)}"><code>${escapeHtml(d.code)}</code></pre><p><br></p>`)
    setDialog(null)
  }

  const insertLink = (url: string, text: string) => {
    insertHtml(`<a class="pc-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`)
    setDialog(null)
  }

  const insertSticker = (emoji: string) => {
    // Chrome 의 insertHTML 정규화가 클래스만 있는 span 을 제거하므로 인라인 스타일을 함께 부여
    insertHtml(`<span class="pc-sticker" style="font-size: 44px; line-height: 1.2;">${emoji}</span>`)
    setPanel(null)
  }

  // ── 툴바 UI 헬퍼 ─────────────────────────────────────
  const pd = (e: React.MouseEvent) => e.preventDefault()

  const togglePanel = (id: Exclude<PanelId, null>) => {
    setPanel((cur) => (cur === id ? null : id))
  }

  // 모바일 서식/더보기 시트 토글 (열 때 다른 팝업은 닫음)
  const toggleMobileSheet = (s: 'format' | 'more') => {
    setPanel(null)
    setMobileSheet((cur) => (cur === s ? null : s))
  }

  const openDialog = (id: Exclude<DialogId, null>) => {
    setPanel(null)
    setDialog(id)
  }

  const handleInsertAction = useCallback(
    (action: InsertAction) => {
      setMobileSheet(null)
      switch (action) {
        case 'photo':
          fileInputRef.current?.click()
          break
        case 'sticker':
          setPanel((cur) => (cur === 'sticker' ? null : 'sticker'))
          break
        case 'table':
          setPanel((cur) => (cur === 'table' ? null : 'table'))
          break
        default:
          setPanel(null)
          setDialog(action)
      }
    },
    []
  )

  const iconBtnCls = (isActive = false) =>
    `flex h-8 w-8 items-center justify-center rounded transition ${
      isActive
        ? 'bg-[#EEF2FF] text-[#2563EB] dark:bg-[#1E3A8A]/40 dark:text-[#93C5FD]'
        : 'text-[#5B6472] hover:bg-[#F1F3F6] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]'
    }`

  // pc-fmt-panel: 모바일에서 서식 툴바 팝업을 fixed 바텀시트로 띄우기 위한 마커 클래스 (globals.css 참조)
  const panelCls =
    'pc-fmt-panel absolute left-0 top-full z-50 mt-1 rounded-lg border border-[#E5E8EC] bg-white p-2 shadow-lg dark:border-[#334155] dark:bg-[#151E2E]'

  const panelItemCls =
    'flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[#1A1D24] hover:bg-[#F1F3F6] dark:text-[#F1F5F9] dark:hover:bg-[#1E293B]'

  return (
    <div ref={wrapperRef} className="bg-white md:rounded-lg md:border md:border-[#E5E8EC] dark:bg-[#0F1626] dark:md:border-[#334155]">
      {/* ── 1열 툴바: 삽입 도구 ── */}
      {/* 모바일 화면에서는 최하단 고정 바(sticky/fixed), PC에서는 평범하게 상단에 노출 */}
      <div className="pc-mobile-insert-toolbar fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around border-t border-[#E5E8EC] bg-white px-2 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:border-[#334155] dark:bg-[#0F1626] md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:flex-wrap md:justify-start md:border-b md:border-t-0 md:py-1.5 md:shadow-none">
        {INSERT_ITEMS.map((item) => (
          <div
            key={item.label}
            className={`relative ${!MOBILE_PRIMARY_INSERTS.has(item.action) ? 'hidden md:block' : ''}`}
          >
            <button
              type="button"
              disabled={disabled}
              onMouseDown={pd}
              onClick={() => handleInsertAction(item.action)}
              className={`flex min-w-[40px] md:min-w-[52px] flex-col items-center gap-0.5 rounded px-1 py-1 md:px-2 md:py-1.5 transition disabled:opacity-40 ${
                item.panelId && panel === item.panelId
                  ? 'bg-[#EEF2FF] text-[#2563EB] dark:bg-[#1E3A8A]/40 dark:text-[#93C5FD]'
                  : 'text-[#5B6472] hover:bg-[#F1F3F6] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]'
              }`}
            >
              <item.icon className="h-5 w-5 md:h-5 md:w-5" />
              {/* 모바일에서는 버튼명을 숨겨 밴드/디시처럼 깔끔하고 작게 보여줌 */}
              <span className="hidden md:block text-[10px] font-bold">{item.label}</span>
            </button>

            {/* 스티커 패널 (모바일에서는 버튼 위쪽 Dropup 형태로 팝업) */}
            {item.panelId === 'sticker' && panel === 'sticker' && (
              <div className={`${panelCls} pc-insert-panel w-[264px] absolute left-0 bottom-full md:bottom-auto mb-2 md:mb-0 md:mt-1`}>
                <div className="grid grid-cols-8 gap-0.5">
                  {STICKERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={pd}
                      onClick={() => insertSticker(s)}
                      className="flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-[#F1F3F6] dark:hover:bg-[#1E293B]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 표 크기 선택 패널 (모바일에서는 fixed 바텀시트, PC에서는 위쪽 Dropup) */}
            {item.panelId === 'table' && panel === 'table' && (
              <div className="pc-fmt-panel pc-insert-panel absolute right-[-40px] md:right-0 bottom-full md:bottom-auto mb-2 md:mb-0 md:mt-1 z-50 rounded-xl border border-[#E5E8EC] bg-white p-3 shadow-xl dark:border-[#334155] dark:bg-[#151E2E]">
                <p className="mb-2 px-0.5 text-center text-[13px] font-black text-[#1A1D24] dark:text-[#F1F5F9]">
                  {tableHover.r > 0 ? (
                    <>
                      {tableHover.c} <span className="text-[#828B9C]">×</span> {tableHover.r}{' '}
                      <span className="text-[11px] font-bold text-[#828B9C]">표</span>
                    </>
                  ) : (
                    <span className="text-[#828B9C]">표 크기를 선택하세요</span>
                  )}
                </p>
                <div
                  className="grid justify-center gap-1"
                  style={{ gridTemplateColumns: 'repeat(10, 24px)' }}
                  onMouseLeave={() => setTableHover({ r: 0, c: 0 })}
                >
                  {Array.from({ length: 100 }).map((_, i) => {
                    const r = Math.floor(i / 10) + 1
                    const c = (i % 10) + 1
                    const on = r <= tableHover.r && c <= tableHover.c
                    return (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={pd}
                        onMouseEnter={() => setTableHover({ r, c })}
                        onClick={() => insertTable(r, c)}
                        className={`h-6 w-6 rounded-[3px] border transition-colors ${
                          on
                            ? 'border-[#2563EB] bg-[#DBEAFE] dark:border-[#3B82F6] dark:bg-[#1E3A8A]'
                            : 'border-[#E5E8EC] bg-[#F7F8FA] hover:border-[#93C5FD] dark:border-[#334155] dark:bg-[#1E293B]'
                        }`}
                        aria-label={`${c} x ${r} 표`}
                      />
                    )
                  })}
                </div>
                <p className="mt-2 px-0.5 text-center text-[10px] font-semibold text-[#A8B0BC] dark:text-[#64748B]">
                  최대 10 × 10 · 칸을 눌러 삽입
                </p>
              </div>
            )}
          </div>
        ))}

        {/* 모바일 전용: 서식(글꼴·크기·색·정렬 등) 시트 토글 */}
        <div className="relative md:hidden">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => toggleMobileSheet('format')}
            className={`flex min-w-[40px] flex-col items-center gap-0.5 rounded px-1 py-1 transition disabled:opacity-40 ${
              mobileSheet === 'format'
                ? 'bg-[#EEF2FF] text-[#2563EB] dark:bg-[#1E3A8A]/40 dark:text-[#93C5FD]'
                : 'text-[#5B6472] hover:bg-[#F1F3F6] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]'
            }`}
            aria-label="글자 서식"
          >
            <Type className="h-5 w-5" />
          </button>
        </div>

        {/* 모바일 전용: 더보기(...) — 나머지 삽입 도구를 시트로 노출 */}
        <div className="relative md:hidden">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => toggleMobileSheet('more')}
            className={`flex min-w-[40px] flex-col items-center gap-0.5 rounded px-1 py-1 transition disabled:opacity-40 ${
              mobileSheet === 'more'
                ? 'bg-[#EEF2FF] text-[#2563EB] dark:bg-[#1E3A8A]/40 dark:text-[#93C5FD]'
                : 'text-[#5B6472] hover:bg-[#F1F3F6] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]'
            }`}
            aria-label="더보기"
          >
            <Ellipsis className="h-5 w-5" />
          </button>

          {mobileSheet === 'more' && (
            <div className="pc-fmt-panel pc-insert-panel z-50 grid grid-cols-3 gap-1 rounded-xl border border-[#E5E8EC] bg-white p-2 shadow-xl dark:border-[#334155] dark:bg-[#151E2E]">
              {INSERT_ITEMS.filter((it) => !MOBILE_PRIMARY_INSERTS.has(it.action)).map((it) => (
                <button
                  key={it.action}
                  type="button"
                  onMouseDown={pd}
                  onClick={() => handleInsertAction(it.action)}
                  className="flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-[#5B6472] hover:bg-[#F1F3F6] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
                >
                  <it.icon className="h-6 w-6" />
                  <span className="text-[11px] font-bold">{it.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* ── 2열 툴바: 서식 도구 ── */}
      {/* 모바일: 기본 숨김, '서식(T)' 버튼을 눌렀을 때만 하단에 한 줄 가로 스크롤로 노출. PC: 항상 표시 */}
      <div className={`pc-mobile-format-toolbar ${mobileSheet === 'format' ? 'flex' : 'hidden'} md:flex flex-nowrap items-center gap-0.5 overflow-x-auto border-b border-[#E5E8EC] px-2 py-1.5 dark:border-[#334155] md:flex-wrap md:overflow-visible`}>
        {/* 문단 스타일 */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => togglePanel('pstyle')}
            className="flex h-8 min-w-[64px] items-center justify-between gap-1 rounded px-2 text-sm font-bold text-[#1A1D24] hover:bg-[#F1F3F6] disabled:opacity-40 dark:text-[#F1F5F9] dark:hover:bg-[#1E293B]"
          >
            <span>{active.blockLabel}</span>
            <ChevronDown className="h-3 w-3 text-[#828B9C]" />
          </button>
          {panel === 'pstyle' && (
            <div className={`${panelCls} w-40`}>
              {PARAGRAPH_STYLES.map((s) => (
                <button
                  key={s.tag}
                  type="button"
                  onMouseDown={pd}
                  onClick={() => {
                    exec('formatBlock', s.tag.toLowerCase(), false)
                    setPanel(null)
                  }}
                  className={panelItemCls}
                  style={{ fontSize: s.size, fontWeight: s.weight }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 글꼴 */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => togglePanel('font')}
            className="flex h-8 min-w-[88px] items-center justify-between gap-1 rounded px-2 text-sm text-[#1A1D24] hover:bg-[#F1F3F6] disabled:opacity-40 dark:text-[#F1F5F9] dark:hover:bg-[#1E293B]"
          >
            <span className="truncate text-[13px]">{active.fontLabel}</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-[#828B9C]" />
          </button>
          {panel === 'font' && (
            <div className={`${panelCls} max-h-64 w-44 overflow-y-auto`}>
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onMouseDown={pd}
                  onClick={() => {
                    exec('fontName', f.value || 'inherit')
                    setPanel(null)
                  }}
                  className={panelItemCls}
                  style={f.value ? { fontFamily: f.value } : undefined}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 글자 크기 */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => togglePanel('size')}
            className="flex h-8 min-w-[52px] items-center justify-between gap-1 rounded px-2 text-sm text-[#1A1D24] hover:bg-[#F1F3F6] disabled:opacity-40 dark:text-[#F1F5F9] dark:hover:bg-[#1E293B]"
          >
            <span>{active.sizeLabel}</span>
            <ChevronDown className="h-3 w-3 text-[#828B9C]" />
          </button>
          {panel === 'size' && (
            <div className={`${panelCls} max-h-64 w-24 overflow-y-auto`}>
              {FONT_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={pd}
                  onClick={() => {
                    applyFontSize(s)
                    setPanel(null)
                  }}
                  className={panelItemCls}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="mx-1 h-5 w-px bg-[#E5E8EC] dark:bg-[#334155]" />

        {/* B / I / U / S */}
        <button type="button" disabled={disabled} onMouseDown={pd} onClick={() => exec('bold')} className={iconBtnCls(active.bold)} title="굵게 (Ctrl+B)">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" disabled={disabled} onMouseDown={pd} onClick={() => exec('italic')} className={iconBtnCls(active.italic)} title="기울임 (Ctrl+I)">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" disabled={disabled} onMouseDown={pd} onClick={() => exec('underline')} className={iconBtnCls(active.underline)} title="밑줄 (Ctrl+U)">
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" disabled={disabled} onMouseDown={pd} onClick={() => exec('strikeThrough')} className={iconBtnCls(active.strike)} title="취소선">
          <Strikethrough className="h-4 w-4" />
        </button>

        {/* 글자색 */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => togglePanel('color')}
            className={iconBtnCls(panel === 'color')}
            title="글자색"
          >
            <span className="flex flex-col items-center leading-none">
              <span className="text-[13px] font-black">T</span>
              <span className="mt-[1px] h-[3px] w-4 rounded-sm bg-gradient-to-r from-[#FF0010] via-[#FFB800] to-[#2563EB]" />
            </span>
          </button>
          {panel === 'color' && (
            <div className={`${panelCls} w-[216px]`}>
              <div className="grid grid-cols-8 gap-1">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={pd}
                    onClick={() => {
                      exec('foreColor', c)
                      setPanel(null)
                    }}
                    className="h-5 w-5 rounded border border-black/10 transition hover:scale-110 dark:border-white/20"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 배경색(형광펜) */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => togglePanel('bg')}
            className={iconBtnCls(panel === 'bg')}
            title="글자 배경색"
          >
            <span className="flex flex-col items-center leading-none">
              <span className="rounded-[2px] bg-[#FFE400] px-[3px] text-[12px] font-black text-[#1A1D24]">T</span>
            </span>
          </button>
          {panel === 'bg' && (
            <div className={`${panelCls} w-[216px]`}>
              <div className="grid grid-cols-8 gap-1">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={pd}
                    onClick={() => {
                      exec('hiliteColor', c)
                      setPanel(null)
                    }}
                    className="h-5 w-5 rounded border border-black/10 transition hover:scale-110 dark:border-white/20"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <button
                type="button"
                onMouseDown={pd}
                onClick={() => {
                  exec('hiliteColor', 'transparent')
                  setPanel(null)
                }}
                className="mt-2 w-full rounded border border-[#E5E8EC] px-2 py-1 text-[11px] font-bold text-[#5B6472] hover:bg-[#F1F3F6] dark:border-[#334155] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
              >
                배경색 없음
              </button>
            </div>
          )}
        </div>

        <span className="mx-1 h-5 w-px bg-[#E5E8EC] dark:bg-[#334155]" />

        {/* 정렬 */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => togglePanel('align')}
            className={iconBtnCls(panel === 'align')}
            title="정렬"
          >
            {active.align === 'center' ? (
              <TextAlignCenter className="h-4 w-4" />
            ) : active.align === 'right' ? (
              <TextAlignEnd className="h-4 w-4" />
            ) : active.align === 'justify' ? (
              <TextAlignJustify className="h-4 w-4" />
            ) : (
              <TextAlignStart className="h-4 w-4" />
            )}
          </button>
          {panel === 'align' && (
            <div className={`${panelCls} flex w-max gap-0.5`}>
              {(
                [
                  { cmd: 'justifyLeft', icon: TextAlignStart, label: '왼쪽 정렬' },
                  { cmd: 'justifyCenter', icon: TextAlignCenter, label: '가운데 정렬' },
                  { cmd: 'justifyRight', icon: TextAlignEnd, label: '오른쪽 정렬' },
                  { cmd: 'justifyFull', icon: TextAlignJustify, label: '양쪽 정렬' },
                ] as const
              ).map((a) => (
                <button
                  key={a.cmd}
                  type="button"
                  onMouseDown={pd}
                  onClick={() => {
                    exec(a.cmd)
                    setPanel(null)
                  }}
                  className={iconBtnCls()}
                  title={a.label}
                >
                  <a.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 목록 */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => togglePanel('list')}
            className={iconBtnCls(panel === 'list')}
            title="목록"
          >
            <List className="h-4 w-4" />
          </button>
          {panel === 'list' && (
            <div className={`${panelCls} flex w-max gap-0.5`}>
              <button
                type="button"
                onMouseDown={pd}
                onClick={() => {
                  exec('insertUnorderedList')
                  setPanel(null)
                }}
                className={iconBtnCls()}
                title="글머리 기호 목록"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={pd}
                onClick={() => {
                  exec('insertOrderedList')
                  setPanel(null)
                }}
                className={iconBtnCls()}
                title="번호 매기기 목록"
              >
                <ListOrdered className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* 줄간격 */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => togglePanel('lineheight')}
            className={iconBtnCls(panel === 'lineheight')}
            title="줄간격"
          >
            <Rows3 className="h-4 w-4" />
          </button>
          {panel === 'lineheight' && (
            <div className={`${panelCls} w-24`}>
              {LINE_HEIGHTS.map((lh) => (
                <button
                  key={lh.value}
                  type="button"
                  onMouseDown={pd}
                  onClick={() => {
                    applyLineHeight(lh.value)
                    setPanel(null)
                  }}
                  className={panelItemCls}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="mx-1 h-5 w-px bg-[#E5E8EC] dark:bg-[#334155]" />

        {/* 위첨자 / 아래첨자 (styleWithCSS 를 끄고 실제 sup/sub 태그 생성) */}
        <button type="button" disabled={disabled} onMouseDown={pd} onClick={() => exec('superscript', undefined, false)} className={iconBtnCls(active.sup)} title="위첨자">
          <Superscript className="h-4 w-4" />
        </button>
        <button type="button" disabled={disabled} onMouseDown={pd} onClick={() => exec('subscript', undefined, false)} className={iconBtnCls(active.sub)} title="아래첨자">
          <Subscript className="h-4 w-4" />
        </button>

        {/* 특수문자 */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={pd}
            onClick={() => togglePanel('special')}
            className={iconBtnCls(panel === 'special')}
            title="특수문자"
          >
            <span className="text-[14px] font-bold leading-none">※</span>
          </button>
          {panel === 'special' && (
            <div className={`${panelCls} w-[296px]`}>
              <div className="grid max-h-48 grid-cols-10 gap-0.5 overflow-y-auto">
                {SPECIAL_CHARS.map((ch, i) => (
                  <button
                    key={`${ch}-${i}`}
                    type="button"
                    onMouseDown={pd}
                    onClick={() => {
                      exec('insertText', ch)
                      setPanel(null)
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded text-sm text-[#1A1D24] hover:bg-[#F1F3F6] dark:text-[#F1F5F9] dark:hover:bg-[#1E293B]"
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── 본문 편집 영역 ── */}
      <div className="relative">
        {isEmpty && (
          <div className="pointer-events-none absolute left-3 top-4 md:left-5 md:top-5 text-[15px] text-[#A8B0BC] dark:text-[#64748B]">
            {placeholder || '내용을 입력하세요.'}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          className="pc-content min-h-[55vh] md:min-h-[400px] md:max-h-[460px] md:overflow-y-auto px-3 pt-4 pb-20 md:px-5 md:pt-5 md:pb-5 text-[15px] leading-[1.6] text-[#1A1D24] outline-none dark:text-[#F1F5F9]"
          onInput={emit}
          onBlur={emit}
        />
      </div>

      {/* ── 다이얼로그 ── */}
      {dialog === 'link' && <LinkDialog initialText={selectedText} onInsert={insertLink} onClose={() => setDialog(null)} />}
      {dialog === 'video' && (
        <VideoDialog
          onInsert={(html) => {
            insertHtml(html)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'schedule' && <ScheduleDialog onInsert={insertSchedule} onClose={() => setDialog(null)} />}
      {dialog === 'place' && <PlaceDialog onInsert={insertPlace} onClose={() => setDialog(null)} />}
      {dialog === 'code' && <CodeDialog onInsert={insertCode} onClose={() => setDialog(null)} />}
    </div>
  )
}
