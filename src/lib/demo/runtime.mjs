import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { boardDefinitions, activityWindows } from './catalog.mjs'
import { scenario, normalize, similarity } from './scenarios.mjs'
import { hasContact } from './content-policy.mjs'
import { sourceDefinitions } from './sources.mjs'

export const isDemo = () => process.env.PHONE_DEMO === '1'
let connection
export function database() {
  if (!isDemo()) throw new Error('로컬 데모 모드에서만 사용할 수 있습니다.')
  if (!connection) {
    const path = resolve(/* turbopackIgnore: true */ process.env.PHONE_DEMO_DB || '.demo/community.sqlite')
    mkdirSync(dirname(path), { recursive: true })
    connection = new DatabaseSync(path)
    connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS boards (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, name TEXT, description TEXT, type TEXT DEFAULT 'general', allow_anonymous INTEGER DEFAULT 0, read_min_level INTEGER DEFAULT 0, write_min_level INTEGER DEFAULT 0, sort INTEGER);
      CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, username TEXT UNIQUE, display_name TEXT UNIQUE, avatar_url TEXT, role TEXT DEFAULT 'member', status TEXT DEFAULT 'active', level INTEGER, bio TEXT, created_at TEXT, is_test INTEGER NOT NULL DEFAULT 1 CHECK(is_test=1), activity_points INTEGER DEFAULT 0, adopted_count INTEGER DEFAULT 0, trust_score INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, board_id INTEGER REFERENCES boards(id), author_id TEXT REFERENCES profiles(id), title TEXT, content TEXT, region TEXT, carrier TEXT, device TEXT, view_count INTEGER DEFAULT 0, upvotes INTEGER DEFAULT 0, downvotes INTEGER DEFAULT 0, comment_count INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT, is_pinned INTEGER DEFAULT 0, is_anonymous INTEGER DEFAULT 0, status TEXT DEFAULT 'published', generator TEXT NOT NULL, fingerprint TEXT UNIQUE, source_id TEXT, is_test INTEGER NOT NULL DEFAULT 1 CHECK(is_test=1));
      CREATE INDEX IF NOT EXISTS posts_board_date ON posts(board_id,status,created_at DESC);
      CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, post_id TEXT REFERENCES posts(id), author_id TEXT REFERENCES profiles(id), parent_id TEXT REFERENCES comments(id), content TEXT, created_at TEXT, upvotes INTEGER DEFAULT 0, is_anonymous INTEGER DEFAULT 0, is_secret INTEGER DEFAULT 0, status TEXT DEFAULT 'published', generator TEXT DEFAULT 'scenario', is_test INTEGER DEFAULT 1 CHECK(is_test=1));
      CREATE INDEX IF NOT EXISTS comments_post ON comments(post_id,created_at);
      CREATE TABLE IF NOT EXISTS votes (post_id TEXT REFERENCES posts(id), author_id TEXT REFERENCES profiles(id), value INTEGER CHECK(value IN (-1,1)), created_at TEXT, PRIMARY KEY(post_id,author_id));
      CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, kind TEXT, payload TEXT, due_at TEXT, status TEXT DEFAULT 'pending', result_id TEXT, error TEXT, created_at TEXT, dedup_key TEXT UNIQUE);
      CREATE INDEX IF NOT EXISTS jobs_due ON jobs(status,due_at);
      CREATE INDEX IF NOT EXISTS posts_author ON posts(author_id);
      CREATE INDEX IF NOT EXISTS comments_author ON comments(author_id);
      CREATE INDEX IF NOT EXISTS votes_author ON votes(author_id);
      CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, name TEXT, url TEXT, permission TEXT, evidence TEXT, enabled INTEGER DEFAULT 1, interval_minutes INTEGER DEFAULT 60, max_items INTEGER DEFAULT 3, last_checked TEXT, last_error TEXT);
      CREATE TABLE IF NOT EXISTS collected (id TEXT PRIMARY KEY, source_id TEXT REFERENCES sources(id), external_id TEXT, url TEXT UNIQUE, title TEXT, content TEXT, authored_at TEXT, collected_at TEXT, fingerprint TEXT UNIQUE, state TEXT DEFAULT 'reference', published_post_id TEXT, analysis TEXT);
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, kind TEXT, started_at TEXT, finished_at TEXT, status TEXT, details TEXT);
      CREATE TABLE IF NOT EXISTS rewrites (source_id TEXT PRIMARY KEY REFERENCES collected(id), payload TEXT NOT NULL, model TEXT, created_at TEXT, status TEXT DEFAULT 'ready', error TEXT);
      CREATE TABLE IF NOT EXISTS collection_batches (id TEXT PRIMARY KEY,started_at TEXT NOT NULL,finished_at TEXT,status TEXT NOT NULL DEFAULT 'running');
      CREATE TABLE IF NOT EXISTS collection_batch_items (source_record_id TEXT PRIMARY KEY REFERENCES collected(id),batch_id TEXT NOT NULL REFERENCES collection_batches(id));
      CREATE INDEX IF NOT EXISTS collection_items_batch ON collection_batch_items(batch_id);
      CREATE TABLE IF NOT EXISTS source_comment_bindings (source_id TEXT NOT NULL REFERENCES collected(id),comment_key TEXT NOT NULL,comment_id TEXT NOT NULL REFERENCES comments(id),source_hash TEXT NOT NULL,PRIMARY KEY(source_id,comment_key));
      CREATE TABLE IF NOT EXISTS comment_refresh_queue (source_id TEXT NOT NULL REFERENCES collected(id),comment_key TEXT NOT NULL,content TEXT NOT NULL,parent_key TEXT,source_hash TEXT NOT NULL,refreshed_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',rewritten_content TEXT,error TEXT,PRIMARY KEY(source_id,comment_key));
    `)
    const columns=connection.prepare('PRAGMA table_info(collected)').all().map(c=>c.name)
    for(const [name,type] of [['comments_json',"TEXT DEFAULT '[]'"],['comment_count','INTEGER'],['comments_complete','INTEGER DEFAULT 0'],['target_board','INTEGER'],['source_family','TEXT'],['source_view_count','INTEGER'],['source_upvotes','INTEGER'],['source_downvotes','INTEGER'],['metrics_collected_at','TEXT']]) {
      if(!columns.includes(name)) connection.exec(`ALTER TABLE collected ADD COLUMN ${name} ${type}`)
    }
    if(!columns.includes('images_json'))connection.exec("ALTER TABLE collected ADD COLUMN images_json TEXT DEFAULT '[]'")
    for(const s of sourceDefinitions) connection.prepare('INSERT OR IGNORE INTO sources(id,name,url,permission,evidence) VALUES(?,?,?,?,?)').run(s.id,s.name,s.url,'rewrite_only','사용자 지정 공개 자료 · 윤문 및 재구성 후 로컬 시연')
  }
  return connection
}
export function rows(sql, args = []) { return database().prepare(sql).all(...args) }
export function row(sql, args = []) { return database().prepare(sql).get(...args) || null }
export function execute(sql, args = []) { return database().prepare(sql).run(...args) }
export function transaction(fn) {
  const db = database(); db.exec('BEGIN IMMEDIATE')
  try { const value = fn(); db.exec('COMMIT'); return value } catch (e) { db.exec('ROLLBACK'); throw e }
}
export const fingerprint = (s) => createHash('sha256').update(normalize(s)).digest('hex')
export const escapeHtml = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
export const textHtml = (s) => s.replace(/\r\n?/g,'\n').split('\n').map(p => `<p>${p?escapeHtml(p):'<br>'}</p>`).join('')
export function setting(key, fallback) { const v = row('SELECT value FROM settings WHERE key=?', [key]); return v ? JSON.parse(v.value) : fallback }
export function setSetting(key, value) { execute('INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, JSON.stringify(value)]) }

export function seed(now = new Date()) {
  if (row("SELECT value FROM settings WHERE key='seeded'")) return stats()
  transaction(() => {
    boardDefinitions.forEach(([slug, name, description], i) => execute('INSERT OR IGNORE INTO boards(id,slug,name,description,allow_anonymous,sort) VALUES(?,?,?,?,?,?)', [i + 1, slug, name, description, Number(slug === 'anonymous'), i]))
    const adjectives = ['차분한','느긋한','반가운','꼼꼼한','빛나는','든든한','산뜻한','푸른','작은','따뜻한','깊은','밝은','고요한','빠른','편안한','소박한','신중한','즐거운','맑은','새로운']
    const nouns = ['구름','나무','바람','별빛','산책','파도','달빛','하늘','숲길','노트','아침','저녁','햇살','여행','연필','마음','소리','물결','소풍','기록','우산','고래','토끼','다람쥐','참새']
    const users = []
    for (let i = 0; i < 5000; i++) {
      const id = randomUUID(); users.push(id)
      execute('INSERT INTO profiles(id,username,display_name,level,bio,created_at,activity_points) VALUES(?,?,?,?,?,?,?)', [id, `demo${String(i + 1).padStart(4,'0')}`, `${adjectives[i % 20]}${nouns[Math.floor(i / 20) % 25]}${Math.floor(i / 500) + 1}`, 1 + i % 12, `테스트 프로필 · ${['사진','게임','업무','가족 통신비','기기 관리'][i % 5]}에 관심이 있어요.`, new Date(now.getTime() - (35 + i % 720) * 86400000).toISOString(), 0])
    }
    setSetting('visitor', users[0])
    for (let i = 0; i < 5000; i++) {
      const board = 1 + i % 7, slug = boardDefinitions[board - 1][0]
      const item = scenario(i, slug)
      const band = activityWindows[i % 100 < 20 ? 0 : i % 100 < 45 ? 1 : i % 100 < 85 ? 2 : 3]
      const base = Date.parse(`${new Date(now.getTime() + 9 * 3600000).toISOString().slice(0,10)}T00:00:00+09:00`) - (1 + i % 30) * 86400000
      const created = new Date(base + band.hour * 3600000 + (i * 17 % band.duration) * 60000).toISOString()
      const id = insertPost({ ...item, boardId: board, authorId: users[i], createdAt: created, checkNear: false })
      for (let j = 0; j < item.comments.length; j++) {
        const c = item.comments[j]
        const parent = c.parentIndex === null ? null : row('SELECT id FROM comments WHERE post_id=? ORDER BY created_at LIMIT 1 OFFSET ?', [id, c.parentIndex])?.id
        insertComment(id, users[(i + j * 113 + 1) % 5000], c.content, parent, new Date(Date.parse(created) + (j + 1) * 180000).toISOString(), 'scenario')
      }
      const votes = 2 + i % 13
      for (let j = 0; j < votes; j++) execute('INSERT INTO votes VALUES(?,?,1,?)', [id, users[(i + 37 + j * 29) % 5000], new Date(Date.parse(created) + (j + 1) * 60000).toISOString()])
      execute('UPDATE posts SET upvotes=?,view_count=? WHERE id=?', [votes, 20 + i * 13 % 980, id])
    }
    execute("UPDATE profiles SET activity_points=(SELECT count(*)*10 FROM posts WHERE posts.author_id=profiles.id)+(SELECT count(*)*3 FROM comments WHERE comments.author_id=profiles.id)+(SELECT count(*) FROM votes WHERE votes.author_id=profiles.id)")
    const evidence = '2026-10-22 사용자 확인: 운영자로부터 수집 및 윤문·재구성 후 재게시 허가를 받음. 원문 그대로 게시 불가.'
    for (const s of [['ppomppu','뽐뿌 휴대폰포럼','https://www.ppomppu.co.kr/zboard/zboard.php?id=phone'],['dcinside','디시인사이드 휴대폰 갤러리','https://gall.dcinside.com/board/lists/?id=cellularphone']]) execute('INSERT OR IGNORE INTO sources(id,name,url,permission,evidence) VALUES(?,?,?,?,?)', [...s, 'rewrite_only', evidence])
    setSetting('windows', activityWindows)
    setSetting('seeded', now.toISOString())
  })
  return stats()
}

export function validateContent(item) {
  if (!item || typeof item.title !== 'string' || typeof item.content !== 'string' || item.title.trim().length < 2 || item.title.length > 150 || item.content.trim().length < 10 || item.content.length > 12000) throw new Error('제목 또는 본문 형식이 올바르지 않습니다.')
  if (hasContact(`${item.title} ${item.content} ${JSON.stringify((item.comments || []).map(c=>c.content))}`)) throw new Error('연락처를 포함할 수 없습니다.')
  if (/<[^>]+>|https?:\/\/|\b010[- .]?\d{4}/i.test(`${item.title} ${item.content}`)) throw new Error('생성 글에는 HTML·연락처·외부 링크를 넣지 않습니다.')
  if (item.comments && (!Array.isArray(item.comments) || item.comments.length > 300)) throw new Error('댓글 형식 오류')
  for (const [i, c] of (item.comments || []).entries()) {
    if (typeof c.content !== 'string' || c.content.length < 1 || c.content.length > 3000 || (c.parentIndex !== null && (!Number.isInteger(c.parentIndex) || c.parentIndex < 0 || c.parentIndex >= i))) throw new Error('댓글 연결 형식 오류')
  }
}
export function insertPost(item) {
  validateContent(item)
  const hash = fingerprint(item.title + item.content)
  if (row('SELECT id FROM posts WHERE fingerprint=?', [hash])) throw new Error('동일한 글이 이미 존재합니다.')
  if (item.checkNear !== false) {
    const candidates = rows('SELECT title,content FROM posts WHERE board_id=? ORDER BY created_at DESC LIMIT 300', [item.boardId])
    if (candidates.some(p => similarity(item.title + item.content, p.title + p.content.replace(/<[^>]+>/g,'')) > 0.88)) throw new Error('유사한 글이 이미 있습니다. 다른 주제로 생성하세요.')
  }
  const id = randomUUID(), at = item.createdAt || new Date().toISOString()
  execute('INSERT INTO posts(id,board_id,author_id,title,content,region,carrier,device,created_at,updated_at,is_anonymous,generator,fingerprint,source_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [id,item.boardId,item.authorId,item.title.trim(),textHtml(item.content),item.region || '',item.carrier || '',item.device || '',at,at,Number(item.boardId === 6),item.generator || 'manual',hash,item.sourceId || null])
  return id
}
/** @param {string|null} parentId */
export function insertComment(postId, authorId, content, parentId = null, at = new Date().toISOString(), generator = 'manual') {
  const post = row("SELECT * FROM posts WHERE id=? AND status='published'", [postId])
  if (!post || typeof content !== 'string' || content.trim().length < 1 || content.length > 3000 || hasContact(content)) throw new Error('댓글을 등록할 수 없습니다.')
  if (parentId && !row('SELECT id FROM comments WHERE id=? AND post_id=?', [parentId,postId])) throw new Error('대댓글의 원 댓글이 일치하지 않습니다.')
  const id = randomUUID()
  execute('INSERT INTO comments(id,post_id,author_id,parent_id,content,created_at,is_anonymous,generator) VALUES(?,?,?,?,?,?,?,?)', [id,postId,authorId,parentId,content.trim(),at,post.is_anonymous,generator])
  execute('UPDATE posts SET comment_count=comment_count+1 WHERE id=?', [postId])
  return id
}
export function vote(postId, authorId, value) {
  if (![1,-1].includes(value) || !row('SELECT id FROM posts WHERE id=?', [postId])) throw new Error('투표 대상 오류')
  return transaction(() => {
    const old = row('SELECT value FROM votes WHERE post_id=? AND author_id=?', [postId,authorId])
    const next = old?.value === value ? 0 : value
    if (!next) execute('DELETE FROM votes WHERE post_id=? AND author_id=?', [postId,authorId])
    else execute('INSERT INTO votes VALUES(?,?,?,?) ON CONFLICT(post_id,author_id) DO UPDATE SET value=excluded.value', [postId,authorId,next,new Date().toISOString()])
    execute('UPDATE posts SET upvotes=(SELECT count(*) FROM votes WHERE post_id=? AND value=1),downvotes=(SELECT count(*) FROM votes WHERE post_id=? AND value=-1) WHERE id=?', [postId,postId,postId])
    return { ...row('SELECT upvotes,downvotes FROM posts WHERE id=?', [postId]), myVote: next }
  })
}
export function stats() {
  return { users: row('SELECT count(*) n FROM profiles')?.n || 0, posts: row('SELECT count(*) n FROM posts')?.n || 0, comments: row('SELECT count(*) n FROM comments')?.n || 0, votes: row('SELECT count(*) n FROM votes')?.n || 0, scheduled: row("SELECT count(*) n FROM jobs WHERE status='pending'")?.n || 0, collected: row('SELECT count(*) n FROM collected')?.n || 0 }
}
export function enqueue(kind, payload, dueAt, dedupKey = randomUUID()) {
  const id = randomUUID()
  execute('INSERT OR IGNORE INTO jobs(id,kind,payload,due_at,created_at,dedup_key) VALUES(?,?,?,?,?,?)', [id,kind,JSON.stringify(payload),dueAt,new Date().toISOString(),dedupKey])
  return id
}
export function scheduleDay(date = new Date().toISOString().slice(0,10), count = 40) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(count) || count < 1 || count > 200) throw new Error('예약 날짜 또는 개수가 올바르지 않습니다.')
  const windows = setting('windows', activityWindows)
  const before = stats().scheduled
  transaction(() => {
    const start = Date.parse(`${date}T00:00:00+09:00`)
    for (let i = 0; i < count; i++) {
      let bucket = (i + 0.5) * 100 / count, band = windows[windows.length-1]
      for (const w of windows) { bucket -= w.weight; if (bucket < 0) { band = w; break } }
      const due = new Date(start + band.hour * 3600000 + (i * 29 % band.duration) * 60000).toISOString()
      const index = 5000 + Math.floor(start / 86400000) * 211 + i
      const boardId = 1 + i % 7
      const authorId = row('SELECT id FROM profiles ORDER BY username LIMIT 1 OFFSET ?', [(i * 113 + index) % 5000]).id
      enqueue('post', { ...scenario(index, boardDefinitions[boardId-1][0]), boardId, authorId }, due, `day:${date}:${i}`)
    }
  })
  return stats().scheduled - before
}
export function publishDue(now = new Date().toISOString()) {
  let published = 0
  transaction(() => {
    for (const job of rows("SELECT * FROM jobs WHERE status='pending' AND due_at<=? ORDER BY due_at LIMIT 300", [now])) {
      database().exec('SAVEPOINT job')
      try {
        const payload = JSON.parse(job.payload)
        let id
        if (job.kind === 'post') {
          if (payload.sourceId) {
            const source = row('SELECT s.permission FROM collected c JOIN sources s ON s.id=c.source_id WHERE c.id=?', [payload.sourceId])
            if (source?.permission !== 'rewrite_only' || payload.generator !== 'ai-rewrite') throw new Error('재구성 게시 권한이 없습니다.')
          }
          id = insertPost({ ...payload, createdAt: job.due_at })
          const commentJobs = []
          for (const [i,c] of (payload.comments || []).entries()) {
            const authorId = row('SELECT id FROM profiles ORDER BY username LIMIT 1 OFFSET ?', [(i * 131 + published * 7 + 12) % 5000]).id
            commentJobs.push(enqueue('comment',{ postId:id,authorId,content:c.content,parentJob:c.parentIndex === null ? null : commentJobs[c.parentIndex],generator:payload.generator },new Date(Date.parse(job.due_at)+(i+1)*180000).toISOString()))
          }
          for (let i=0;i<3;i++) enqueue('vote', {postId:id,authorId:row('SELECT id FROM profiles ORDER BY username LIMIT 1 OFFSET ?', [231+i*17]).id}, new Date(Date.parse(job.due_at)+(i+1)*240000).toISOString())
          if (payload.sourceId) execute("UPDATE collected SET state='published',published_post_id=? WHERE id=?",[id,payload.sourceId])
        } else if (job.kind === 'comment') {
          const parentId = payload.parentJob ? row('SELECT result_id FROM jobs WHERE id=?', [payload.parentJob])?.result_id : null
          if (payload.parentJob && !parentId) throw new Error('원 댓글 발행 실패')
          id = insertComment(payload.postId,payload.authorId,payload.content,parentId,job.due_at,payload.generator)
        } else if (job.kind === 'vote') {
          execute('INSERT OR IGNORE INTO votes VALUES(?,?,1,?)',[payload.postId,payload.authorId,job.due_at])
          execute('UPDATE posts SET upvotes=(SELECT count(*) FROM votes WHERE post_id=? AND value=1) WHERE id=?',[payload.postId,payload.postId]); id=payload.postId
        } else throw new Error('알 수 없는 작업 유형')
        execute("UPDATE jobs SET status='done',result_id=? WHERE id=?",[id,job.id]); published++
        database().exec('RELEASE job')
      } catch(e) {
        database().exec('ROLLBACK TO job'); database().exec('RELEASE job')
        execute("UPDATE jobs SET status='failed',error=? WHERE id=?",[e.message,job.id])
      }
    }
  })
  return published
}
