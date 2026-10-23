import {notFound} from 'next/navigation'
import SiteHeader from '@/components/layout/site-header'
import DemoWriteForm from '@/components/demo/write-form'
import {isDemo} from '@/lib/demo/runtime.mjs'
import {requireLocalDemo} from '@/lib/demo/guard'
export default async function DemoWrite({searchParams}:{searchParams:Promise<{board?:string}>}) {
  if(!isDemo())notFound();await requireLocalDemo()
  const {board}=await searchParams
  return <><SiteHeader/><main className="mx-auto w-full max-w-4xl px-4 py-5"><DemoWriteForm board={board||'free'}/></main></>
}
