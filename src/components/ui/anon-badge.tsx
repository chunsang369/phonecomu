import { User } from 'lucide-react'

interface AnonBadgeProps {
  tag: string
}

export default function AnonBadge({ tag }: AnonBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-semibold text-[#475569] border border-[#E2E8F0] dark:bg-[#1E293B] dark:text-[#94A3B8] dark:border-[#334155]">
      <User className="h-3 w-3 text-[#64748B] dark:text-[#94A3B8]" />
      <span>{tag}</span>
    </span>
  )
}
