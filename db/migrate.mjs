// db/schema.sql 을 Contabo PostgreSQL(DATABASE_URL)에 적용한다. 여러 번 실행해도 안전.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ path: '.env.local', quiet: true })
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL 이 .env.local 에 없습니다.')
  process.exit(1)
}

const dir = path.dirname(fileURLToPath(import.meta.url))
const sql = fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8')

// 스키마 변경은 세션 풀(phonecommunity_session)로 실행
const url = process.env.DATABASE_URL.replace(/\/phonecommunity(\?|$)/, '/phonecommunity_session$1')
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } })
await client.connect()
try {
  await client.query(sql)
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by 1",
  )
  console.log('적용 완료:', rows.map((r) => r.table_name).join(', '))
} finally {
  await client.end()
}
