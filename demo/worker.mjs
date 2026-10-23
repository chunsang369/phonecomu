import { publishDue, setSetting, isDemo } from '../src/lib/demo/runtime.mjs'
if (!isDemo()) throw new Error('PHONE_DEMO=1 필요')
const local = process.argv.includes('--local')
async function tick() {
  try {
    if (!local) { const { collectDue } = await import('../src/lib/demo/collector.mjs'); await collectDue() }
    const count = publishDue()
    setSetting(local ? 'localHeartbeat' : 'collectorHeartbeat',new Date().toISOString())
    if (count) console.log(`로컬 발행 ${count}건`)
  } catch(e) { console.error('작업 실패:',e.message) }
}
await tick()
if (!process.argv.includes('--once')) setInterval(tick,60_000)
else {const {closeReaders}=await import('../src/lib/demo/collector.mjs');closeReaders()}
