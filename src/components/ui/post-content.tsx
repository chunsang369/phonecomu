import { sanitizeHtml, looksLikeHtml } from '@/lib/sanitize-html'

// 게시글 본문 렌더러.
// - 리치 에디터로 작성된 HTML 본문: 허용목록 새니타이즈 후 렌더링
// - 레거시 일반 텍스트 본문: 기존처럼 줄바꿈 보존 텍스트로 렌더링
export default function PostContent({ content }: { content: string }) {
  if (looksLikeHtml(content)) {
    return (
      <div
        className="pc-content max-w-none text-[15px] leading-[1.6] text-slate-800 dark:text-slate-200"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    )
  }

  return (
    <div className="prose max-w-none text-[15px] leading-[1.6] text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium">
      {content}
    </div>
  )
}
