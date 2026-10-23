import { NextResponse } from 'next/server'
import { requireLocalDemo } from '@/lib/demo/guard'
import { transaction,setting,setSetting,insertPost,insertComment,vote,scheduleDay,publishDue,execute,row } from '@/lib/demo/runtime.mjs'
import { generateContent } from '@/lib/demo/generator.mjs'
import { z } from 'zod'
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('post'),boardId:z.number().int().min(1).max(7),title:z.string().min(5).max(150),content:z.string().min(30).max(12000)}),
  z.object({action:z.literal('comment'),postId:z.string().uuid(),content:z.string().min(2).max(500),parentId:z.string().uuid().nullable()}),
  z.object({action:z.literal('vote'),postId:z.string().uuid(),value:z.union([z.literal(1),z.literal(-1)])}),
  z.object({action:z.literal('schedule'),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),count:z.number().int().min(1).max(200)}),
  z.object({action:z.literal('publish')}),
  z.object({action:z.literal('generate'),boardId:z.number().int().min(1).max(7),topic:z.string().min(2).max(300),sourceId:z.string().uuid().optional(),dueAt:z.string().optional()}),
  z.object({action:z.literal('source'),id:z.enum(['ppomppu','dcinside','ruliweb-politics','fmkorea-politics','ppomppu-anonymous','fmkorea-anonymous']),enabled:z.boolean(),interval:z.number().int().min(30).max(1440),maxItems:z.number().int().min(1).max(10)}),
  z.object({action:z.literal('windows'),windows:z.array(z.object({name:z.string().min(1).max(10),hour:z.number().int().min(0).max(23),duration:z.number().int().min(30).max(240),weight:z.number().int().min(0).max(100)})).length(4)}),
  z.object({action:z.literal('sync')}),
])
export async function POST(request:Request) {
  try {
    await requireLocalDemo()
    const text=await request.text();if(text.length>16000)return NextResponse.json({error:'요청이 너무 큽니다.'},{status:413})
    const result=schema.safeParse(JSON.parse(text));if(!result.success)return NextResponse.json({error:'입력 형식을 확인하세요.'},{status:400})
    const data=result.data,visitor=setting('visitor',null)
    if(data.action==='post')return NextResponse.json({id:transaction(()=>insertPost({...data,authorId:visitor,generator:'manual'})),slug:row('SELECT slug FROM boards WHERE id=?',[data.boardId])?.slug})
    if(data.action==='comment')transaction(()=>insertComment(data.postId,visitor,data.content,data.parentId))
    if(data.action==='vote')return NextResponse.json(vote(data.postId,visitor,data.value))
    if(data.action==='schedule')return NextResponse.json({message:`${scheduleDay(data.date,data.count)}건을 예약했습니다. 동일 날짜 재실행은 중복 예약하지 않습니다.`})
    if(data.action==='publish')return NextResponse.json({message:`예약 시각이 지난 작업 ${publishDue()}건을 처리했습니다.`})
    if(data.action==='generate')return NextResponse.json(await generateContent({...data,sourceId:data.sourceId,dueAt:data.dueAt}))
    if(data.action==='source')execute('UPDATE sources SET enabled=?,interval_minutes=?,max_items=? WHERE id=?',[Number(data.enabled),data.interval,data.maxItems,data.id])
    if(data.action==='windows'){if(data.windows.reduce((n,w)=>n+w.weight,0)!==100)throw new Error('시간대 비중의 합계는 100이어야 합니다.');setSetting('windows',data.windows)}
    if(data.action==='sync') {
      if(row("SELECT value FROM settings WHERE key='syncBusy'") && Date.now()-Number(setting('syncBusy',0))<120000)throw new Error('동기화가 진행 중입니다.')
      setSetting('syncBusy',Date.now())
      try {const { syncCollector }=await import('@/lib/demo/sync.mjs');return NextResponse.json(await syncCollector())}finally{setSetting('syncBusy',0)}
    }
    return NextResponse.json({message:'저장했습니다.'})
  }catch(e){return NextResponse.json({error:(e as Error).message},{status:400})}
}
