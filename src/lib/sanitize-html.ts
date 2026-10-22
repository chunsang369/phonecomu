// 서버/클라이언트 공용 허용목록(allowlist) 기반 HTML 새니타이저.
// 리치 에디터로 작성된 본문을 저장/렌더링할 때 XSS를 차단한다.
// 허용되지 않은 태그는 제거되고, 태그 사이 텍스트는 이스케이프되어 그대로 남는다.

// 태그별 허용 속성 (style, class 는 전역 허용 후 별도 필터링)
const ALLOWED_TAGS: Record<string, string[]> = {
  p: [],
  div: ['contenteditable'],
  br: [],
  span: ['contenteditable'],
  b: [],
  strong: [],
  i: [],
  em: [],
  u: [],
  s: [],
  strike: [],
  sup: [],
  sub: [],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  ul: [],
  ol: [],
  li: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  blockquote: [],
  pre: ['data-lang'],
  code: [],
  table: [],
  thead: [],
  tbody: [],
  tr: [],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  colgroup: [],
  col: ['span'],
  video: ['src', 'controls', 'width', 'height'],
  iframe: ['src'],
  font: ['color', 'face'],
}

const VOID_TAGS = new Set(['br', 'img', 'col'])

const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-align',
  'line-height',
  'text-decoration',
  'text-decoration-line',
  'vertical-align',
])

// 엔티티를 이중 인코딩하지 않도록 & 는 엔티티 형태가 아닐 때만 이스케이프
function escapeText(text: string): string {
  return text
    .replace(/&(?![a-zA-Z]{1,10};|#\d{1,6};|#x[0-9a-fA-F]{1,6};)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
  return value
    .replace(/&(?![a-zA-Z]{1,10};|#\d{1,6};|#x[0-9a-fA-F]{1,6};)/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function safeStyleValue(value: string): boolean {
  const v = value.trim()
  if (v.length === 0 || v.length > 120) return false
  if (/^[#\w\s.,%'"-]+$/.test(v)) return true
  if (/^rgba?\([\d\s.,%]+\)$/i.test(v)) return true
  return false
}

function sanitizeStyle(style: string): string {
  const out: string[] = []
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':')
    if (idx < 0) continue
    const prop = decl.slice(0, idx).trim().toLowerCase()
    const value = decl.slice(idx + 1).trim()
    if (ALLOWED_STYLE_PROPS.has(prop) && safeStyleValue(value)) {
      out.push(`${prop}: ${value}`)
    }
  }
  return out.join('; ')
}

function sanitizeClass(cls: string): string {
  return cls
    .split(/\s+/)
    .filter((c) => /^pc-[\w-]+$/.test(c))
    .join(' ')
}

function safeHref(url: string): string | null {
  const u = url.trim()
  if (/^https?:\/\//i.test(u)) return u
  if (/^mailto:/i.test(u)) return u
  if (/^\/(?!\/)/.test(u)) return u
  return null
}

function safeImgSrc(url: string): string | null {
  const u = url.trim()
  if (/^https?:\/\//i.test(u)) return u
  if (/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(u)) return u
  return null
}

function safeIframeSrc(url: string): string | null {
  const u = url.trim()
  if (/^https:\/\/www\.youtube(-nocookie)?\.com\/embed\/[A-Za-z0-9_-]+(\?[\w=&.-]*)?$/.test(u)) return u
  return null
}

function safeVideoSrc(url: string): string | null {
  const u = url.trim()
  if (/^https?:\/\//i.test(u)) return u
  return null
}

const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

function parseAttrs(attrPart: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  let m: RegExpExecArray | null
  ATTR_RE.lastIndex = 0
  while ((m = ATTR_RE.exec(attrPart))) {
    const name = m[1].toLowerCase()
    const value = m[2] ?? m[3] ?? m[4] ?? ''
    if (!(name in attrs)) attrs[name] = value
  }
  return attrs
}

function buildTag(tag: string, attrs: Record<string, string>, selfClose: boolean): string {
  let out = `<${tag}`
  for (const [name, value] of Object.entries(attrs)) {
    if (value === '') {
      out += ` ${name}`
    } else {
      out += ` ${name}="${escapeAttr(value)}"`
    }
  }
  out += selfClose ? ' />' : '>'
  return out
}

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  // script/style 요소는 본문까지 통째로 제거
  html = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  let out = ''
  let last = 0
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g
  let m: RegExpExecArray | null

  while ((m = tagRe.exec(html))) {
    out += escapeText(html.slice(last, m.index))
    last = tagRe.lastIndex

    const closing = m[1] === '/'
    const tag = m[2].toLowerCase()
    const attrPart = m[3] || ''

    if (!(tag in ALLOWED_TAGS)) continue // 허용 외 태그는 통째로 제거

    if (closing) {
      // iframe 은 여는 태그 처리 시 완성된 요소로 재구성하므로 닫는 태그는 건너뜀
      if (!VOID_TAGS.has(tag) && tag !== 'iframe') out += `</${tag}>`
      continue
    }

    const raw = parseAttrs(attrPart)
    const kept: Record<string, string> = {}

    // 전역 속성: style / class
    if (raw['style']) {
      const st = sanitizeStyle(raw['style'])
      if (st) kept['style'] = st
    }
    if (raw['class']) {
      const cls = sanitizeClass(raw['class'])
      if (cls) kept['class'] = cls
    }

    // 태그별 속성
    if (tag === 'a') {
      const href = raw['href'] ? safeHref(raw['href']) : null
      if (href) {
        kept['href'] = href
        if (/^https?:\/\//i.test(href)) {
          kept['target'] = '_blank'
          kept['rel'] = 'noopener noreferrer'
        }
      }
    } else if (tag === 'img') {
      const src = raw['src'] ? safeImgSrc(raw['src']) : null
      if (!src) continue // src 가 안전하지 않으면 태그 자체 제거
      kept['src'] = src
      if (raw['alt'] !== undefined) kept['alt'] = raw['alt']
      if (raw['width'] && /^\d+$/.test(raw['width'])) kept['width'] = raw['width']
      if (raw['height'] && /^\d+$/.test(raw['height'])) kept['height'] = raw['height']
    } else if (tag === 'iframe') {
      const src = raw['src'] ? safeIframeSrc(raw['src']) : null
      if (!src) continue
      // 유튜브 임베드만 고정된 형태로 재구성
      out += `<iframe src="${escapeAttr(src)}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"${kept['class'] ? ` class="${escapeAttr(kept['class'])}"` : ''}></iframe>`
      continue
    } else if (tag === 'video') {
      const src = raw['src'] ? safeVideoSrc(raw['src']) : null
      if (!src) continue
      kept['src'] = src
      kept['controls'] = ''
      kept['preload'] = 'metadata'
    } else if (tag === 'font') {
      if (raw['color'] && /^[#\w(),.\s]+$/.test(raw['color'])) kept['color'] = raw['color']
      if (raw['face'] && /^[\w\s,'"-]+$/.test(raw['face'])) kept['face'] = raw['face']
    } else if (tag === 'td' || tag === 'th') {
      for (const a of ['colspan', 'rowspan']) {
        if (raw[a] && /^\d{1,2}$/.test(raw[a])) kept[a] = raw[a]
      }
    } else if (tag === 'col') {
      if (raw['span'] && /^\d{1,2}$/.test(raw['span'])) kept['span'] = raw['span']
    } else if (tag === 'pre') {
      if (raw['data-lang'] && /^[\w+#-]{1,20}$/.test(raw['data-lang'])) kept['data-lang'] = raw['data-lang']
    } else if (tag === 'div' || tag === 'span') {
      if (raw['contenteditable'] === 'false') kept['contenteditable'] = 'false'
    }

    out += buildTag(tag, kept, VOID_TAGS.has(tag))
  }

  out += escapeText(html.slice(last))
  return out
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/gi, '&')
}

// HTML 본문을 검색/메타/미리보기용 일반 텍스트로 변환
export function htmlToText(html: string): string {
  if (!html) return ''
  return decodeEntities(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li|tr|pre|blockquote)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// 리치 에디터(HTML) 본문인지, 레거시 일반 텍스트 본문인지 판별
export function looksLikeHtml(content: string): boolean {
  return /<([a-z][a-z0-9]*)(\s[^>]*)?\/?>/i.test(content)
}
