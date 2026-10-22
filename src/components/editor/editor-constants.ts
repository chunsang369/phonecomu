// 리치 에디터 툴바에서 사용하는 상수 모음

export const PARAGRAPH_STYLES = [
  { label: '본문', tag: 'P', size: '15px', weight: 400 },
  { label: '제목1', tag: 'H1', size: '28px', weight: 700 },
  { label: '제목2', tag: 'H2', size: '24px', weight: 700 },
  { label: '제목3', tag: 'H3', size: '19px', weight: 700 },
] as const

export const FONT_FAMILIES = [
  { label: '기본서체', value: '' },
  { label: '나눔고딕', value: '"Nanum Gothic", "나눔고딕", "Malgun Gothic", sans-serif' },
  { label: '맑은 고딕', value: '"Malgun Gothic", "맑은 고딕", sans-serif' },
  { label: '돋움', value: 'Dotum, "돋움", sans-serif' },
  { label: '굴림', value: 'Gulim, "굴림", sans-serif' },
  { label: '바탕', value: 'Batang, "바탕", serif' },
  { label: '궁서', value: 'Gungsuh, "궁서", serif' },
  { label: '명조(Serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: '고정폭(Mono)', value: 'Consolas, "Courier New", monospace' },
] as const

export const FONT_SIZES = [11, 13, 15, 16, 19, 24, 28, 30, 34, 38] as const

export const LINE_HEIGHTS = [
  { label: '100%', value: '1.0' },
  { label: '115%', value: '1.15' },
  { label: '150%', value: '1.5' },
  { label: '160%', value: '1.6' },
  { label: '180%', value: '1.8' },
  { label: '200%', value: '2.0' },
  { label: '250%', value: '2.5' },
  { label: '300%', value: '3.0' },
] as const

// 네이버 에디터풍 컬러 팔레트 (8 x 4)
export const COLOR_PALETTE = [
  '#000000', '#424242', '#757575', '#9E9E9E', '#BDBDBD', '#E0E0E0', '#F5F5F5', '#FFFFFF',
  '#FF0010', '#FF5757', '#FF8C00', '#FFB800', '#FFE400', '#ABF200', '#22C55E', '#00A651',
  '#00B0F0', '#0078D7', '#2563EB', '#16305B', '#6B21A8', '#7C3AED', '#C026D3', '#FF00DD',
  '#7F0000', '#8B4513', '#D2691E', '#F4A460', '#FFDAB9', '#FDE68A', '#D1FAE5', '#DBEAFE',
] as const

export const SPECIAL_CHARS = [
  '※', '☆', '★', '○', '●', '◎', '◇', '◆', '□', '■', '△', '▲', '▽', '▼',
  '→', '←', '↑', '↓', '↔', '↕', '〓', '◁', '◀', '▷', '▶', '♤', '♠', '♡',
  '♥', '♧', '♣', '⊙', '◈', '▣', '◐', '◑', '☏', '☎', '☜', '☞', '¶', '†',
  '‡', '↕', '↗', '↙', '↖', '↘', '♭', '♩', '♪', '♬', '㉿', '㈜', '№', '㏇',
  '™', '㏂', '㏘', '℡', '®', '±', '×', '÷', '≠', '≤', '≥', '∞', '∴', '°',
  '′', '″', '℃', 'Å', '¢', '£', '¥', '¤', '℉', '‰', '€', '㎕', '㎖', '㎗',
  'ℓ', '㎘', '㏄', '㎣', '㎤', '㎥', '㎦', '§', '¿', '¡',
] as const

// 스티커(이모지) 세트
export const STICKERS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😇',
  '🤔', '🙄', '😅', '😆', '😉', '😋', '😜', '🤗', '😴', '😱', '😢', '😭',
  '😡', '🤬', '🤯', '🥶', '🥵', '🤒', '🤕', '🤢', '👍', '👎', '👏', '🙏',
  '💪', '🤙', '✌️', '🤞', '❤️', '💔', '💯', '✅', '❌', '⚡', '🔥', '✨',
  '🎉', '🎊', '🎁', '🌟', '🍀', '🌸', '💐', '🚀', '📱', '📞', '💰', '💸',
  '🔋', '📶', '💾', '🖥️', '⌚', '🎧', '📷', '🛒', '🏷️', '📦', '🚚', '🏪',
] as const

export const CODE_LANGUAGES = [
  { label: 'Text', value: 'text' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'Java', value: 'java' },
  { label: 'Python', value: 'python' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'Swift', value: 'swift' },
  { label: 'SQL', value: 'sql' },
  { label: 'JSON', value: 'json' },
  { label: 'Bash', value: 'bash' },
  { label: 'PHP', value: 'php' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
] as const

// HTML 문자열 생성 시 사용할 이스케이프
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
