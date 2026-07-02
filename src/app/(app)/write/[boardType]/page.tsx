import { notFound } from 'next/navigation'
import { getBoardBySlug } from '@/lib/queries/board'
import WriteForm from './write-form'

interface PageProps {
  params: Promise<{ boardType: string }>
}

export default async function WritePage({ params }: PageProps) {
  const { boardType } = await params
  const board = await getBoardBySlug(boardType)

  if (!board) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <WriteForm board={board} />
    </div>
  )
}
