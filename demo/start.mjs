import {spawn} from 'node:child_process'
// The local preview uses the same Contabo PostgreSQL as Vercel.
// Collection, review staging and timed publication run on Contabo separately.
const env={...process.env,PHONE_DEMO:'0',NEXT_PUBLIC_PHONE_DEMO:'0',PHONE_BUILD_DIR:process.env.PHONE_BUILD_DIR||'.next-shared-preview'}
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',process.env.PORT||'3005'],{stdio:'inherit',env})
process.on('SIGINT',()=>app.kill());process.on('SIGTERM',()=>app.kill())
app.on('exit',code=>{process.exitCode=code||0})
