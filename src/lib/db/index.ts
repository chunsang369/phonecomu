/**
 * Contabo PostgreSQL 연결 (PgBouncer 6432, TLS 인증서 검증)
 * 서버 전용 모듈 — 클라이언트 컴포넌트에서 import 금지.
 */
import { Pool, types, type PoolClient } from 'pg'

// timestamptz/timestamp → ISO 문자열 (서버→클라이언트 직렬화와 기존 new Date(str) 코드 호환)
types.setTypeParser(1184, (v) => new Date(v).toISOString())
types.setTypeParser(1114, (v) => new Date(v + 'Z').toISOString())
// date → 'YYYY-MM-DD' 문자열 그대로
types.setTypeParser(1082, (v) => v)
// numeric → number
types.setTypeParser(1700, (v) => parseFloat(v))

const g = globalThis as unknown as { __pcPool?: Pool }

function getPool() {
  if (!g.__pcPool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 미설정 (.env.local)')
    g.__pcPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    })
  }
  return g.__pcPool
}

type Queryable = Pick<PoolClient, 'query'>

/** 여러 행 */
export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = [], c?: Queryable): Promise<T[]> {
  const res = await (c ?? getPool()).query(sql, params)
  return res.rows as T[]
}

/** 첫 행 또는 null */
export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = [], c?: Queryable): Promise<T | null> {
  const rows = await q<T>(sql, params, c)
  return rows[0] ?? null
}

/** 트랜잭션 (PgBouncer 트랜잭션 풀링과 호환: 같은 커넥션에서 BEGIN~COMMIT) */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (e) {
    await client.query('rollback').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}
