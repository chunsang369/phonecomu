import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { rows,execute,setSetting } from './runtime.mjs'
import { ingest } from './collector.mjs'
export async function syncCollector() {
  const key=process.env.PHONE_COLLECTOR_SSH_KEY || resolve(/* turbopackIgnore: true */ homedir(),'.ssh/contabo_ed25519')
  const data=await new Promise((res,rej)=>{
    const child=spawn('ssh',['-i',key,'-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','ConnectTimeout=12','root@5.104.80.117','cd /opt/phone-community-demo && PHONE_DEMO=1 PHONE_DEMO_DB=/var/lib/phone-community-demo/community.sqlite node demo/exchange.mjs'],{stdio:['pipe','pipe','pipe'],windowsHide:true})
    let output='';const timer=setTimeout(()=>child.kill(),30000)
    child.stdout.on('data',c=>{output+=c;if(output.length>5000000)child.kill()});child.stderr.resume();child.on('error',rej)
    child.on('close',code=>{clearTimeout(timer);if(code)return rej(new Error('Contabo 동기화 실패. 서버 설치와 SSH 키 접속을 확인하세요.'));try{res(JSON.parse(output))}catch{rej(new Error('서버 동기화 데이터 형식 오류'))}})
    child.stdin.end(JSON.stringify({sources:rows('SELECT id,enabled,interval_minutes,max_items FROM sources')}))
  })
  if(!data || !Array.isArray(data.items) || !Array.isArray(data.sources))throw new Error('서버 자료 형식 오류')
  let added=0
  for(const item of data.items) {
    const source=rows('SELECT * FROM sources').find(s=>s.id===item.source_id)
    if(source && ingest(source,item)==='new')added++
  }
  for(const source of data.sources)execute('UPDATE sources SET last_checked=?,last_error=? WHERE id=?',[source.last_checked,source.last_error,source.id])
  setSetting('remoteHeartbeat',data.heartbeat);setSetting('remoteHost',data.hostname)
  return {message:`Contabo 자료 ${added}건 추가 · 기존 자료는 중복 없이 유지했습니다.`}
}
