import { row,rows,execute,transaction } from '../src/lib/demo/runtime.mjs'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
let text='';for await(const chunk of process.stdin)text+=chunk
const names=JSON.parse(text)
if(!Array.isArray(names)||names.length!==5000||new Set(names).size!==5000||names.some(n=>typeof n!=='string'||!n.trim()||n!==n.trim()||n.length>50))throw new Error('고유 닉네임 5,000개 필요')
const users=rows('SELECT id,username,display_name FROM profiles WHERE is_test=1 ORDER BY username')
if(users.length!==5000)throw new Error('테스트 계정 수 불일치')
const path=resolve(process.env.PHONE_DEMO_DB||'.demo/community.sqlite')+'.nicknames-before-'+Date.now()+'.json'
writeFileSync(path,JSON.stringify(users),{mode:0o600})
transaction(()=>{
 users.forEach((u,i)=>execute('UPDATE profiles SET display_name=? WHERE id=?',[`nickname-migration-${u.id}`,u.id]))
 users.forEach((u,i)=>execute('UPDATE profiles SET display_name=? WHERE id=?',[names[i],u.id]))
})
console.log(JSON.stringify({updated:5000,unique:row('SELECT count(DISTINCT display_name) n FROM profiles').n,backup:path}))
