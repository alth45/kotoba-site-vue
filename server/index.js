/**
 * Server backend Kotoba — sumber kebenaran data kosakata ada di
 * data/vocab.json (array JSON sederhana).
 *
 * Endpoint API:
 * - GET    /api/vocab       → seluruh daftar kosakata
 * - POST   /api/vocab       → tambah kosakata (id otomatis)
 * - PUT    /api/vocab/:id   → ubah kosakata
 * - DELETE /api/vocab/:id   → hapus kosakata
 *
 * Bila folder dist/ sudah ada (hasil `npm run build`), server ini juga
 * menyajikan halaman statis + fallback SPA. Jalankan: npm start
 */
import http from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..')
const DATA_FILE = path.join(ROOT_DIR, 'data', 'vocab.json')
const DIST_DIR = path.join(ROOT_DIR, 'dist')
const PORT = Number(process.env.PORT) || 3000

/** Batas hasil pencarian yang dikirim sekaligus. */
const SEARCH_MAX = 50

/** Chat AI eksternal (TokenHarbor, kompatibel OpenAI). Kunci API hanya di server. */
const CHAT_API_KEY = process.env.TOKENHARBOR_API_KEY || ''
const CHAT_BASE_URL = process.env.TOKENHARBOR_BASE_URL || 'https://tokenharbor.ai/v1'
const CHAT_MODEL = process.env.TOKENHARBOR_MODEL || 'deepseek-v4.1-flash:free'
const CHAT_TIMEOUT_MS = 30000

/** File dokumen peta kalimat. */
const MAP_FILE = path.join(ROOT_DIR, 'data', 'map.json')
const EMPTY_MAP = { nodes: [], edges: [] }

/** File catatan (notepad kaya format). */
const NOTE_FILE = path.join(ROOT_DIR, 'data', 'notes.json')
const NOTE_MAX_BYTES = 400_000

/** Folder & batas upload gambar catatan. */
const UPLOAD_DIR = path.join(ROOT_DIR, 'data', 'uploads')
const IMG_MAX_BYTES = 3 * 1024 * 1024
const IMG_TYPES = {
  png: { mime: 'image/png', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  jpg: { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
  gif: { mime: 'image/gif', magic: [[0x47, 0x49, 0x46, 0x38]] },
  webp: { mime: 'image/webp', magic: null }, // dicek via header RIFF....WEBP
}

/** Data awal dipakai hanya bila file JSON belum pernah dibuat. */
const SEED = [
  { id: 1, jp: 'こんにちは', romaji: 'konnichiwa', arti: 'Halo, selamat siang', kategori: 'Salam' },
  { id: 2, jp: 'おはよう', romaji: 'ohayou', arti: 'Selamat pagi', kategori: 'Salam' },
  { id: 3, jp: 'ありがとう', romaji: 'arigatou', arti: 'Terima kasih', kategori: 'Sopan' },
  { id: 4, jp: 'すみません', romaji: 'sumimasen', arti: 'Permisi, maaf', kategori: 'Sopan' },
  { id: 5, jp: 'はい', romaji: 'hai', arti: 'Ya', kategori: 'Dasar' },
  { id: 6, jp: 'いいえ', romaji: 'iie', arti: 'Tidak', kategori: 'Dasar' },
  { id: 7, jp: 'お願いします', romaji: 'onegaishimasu', arti: 'Tolong, mohon bantu', kategori: 'Sopan' },
  { id: 8, jp: 'さようなら', romaji: 'sayounara', arti: 'Selamat tinggal', kategori: 'Salam' },
]

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function normalizeItem(raw, fallbackId) {
  return {
    id: Number.isFinite(Number(raw.id)) ? Number(raw.id) : fallbackId,
    jp: String(raw.jp ?? ''),
    romaji: String(raw.romaji ?? ''),
    arti: String(raw.arti ?? ''),
    kategori: String(raw.kategori ?? 'Dasar'),
  }
}

async function saveVocab(list) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  const payload = JSON.stringify(list, null, 2) + '\n'
  await fs.writeFile(DATA_FILE, payload, 'utf8')
}

async function loadVocab() {
  let raw
  try {
    raw = await fs.readFile(DATA_FILE, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File belum ada → buat dari data awal.
      const seed = SEED.map((item) => ({ ...item }))
      await saveVocab(seed)
      return seed
    }
    throw err
  }
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('Struktur data/vocab.json harus berupa array.')
  }
  return parsed.map((item, i) => normalizeItem(item, i + 1))
}

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('Ukuran file melebihi batas 3 MB.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/**
 * Parser multipart/form-data minimal (satu file saja) tanpa dependensi.
 * Mengembalikan { filename, mime, data } atau null bila bukan multipart valid.
 */
function parseMultipartImage(body, contentType) {
  const m = /boundary=([^;]+)/i.exec(contentType || '')
  if (!m) return null
  const boundary = m[1].trim().replace(/^"|"$/g, '')
  if (!boundary) return null
  const sep = Buffer.from(`--${boundary}`)
  const end = Buffer.from(`--${boundary}--`)
  const startIdx = body.indexOf(sep)
  const endIdx = body.indexOf(end)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null
  const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), startIdx)
  if (headerEnd === -1 || headerEnd > endIdx) return null
  const header = body.slice(startIdx, headerEnd).toString('latin1')
  if (!/name="file"/i.test(header)) return null
  const fn = /filename="([^"]*)"/i.exec(header)?.[1] ?? ''
  const mime = /Content-Type:\s*([^\r\n;]+)/i.exec(header)?.[1]?.trim().toLowerCase() ?? ''
  const dataStart = headerEnd + 4
  let dataEnd = endIdx
  if (body[dataEnd - 2] === 0x0d && body[dataEnd - 1] === 0x0a) dataEnd -= 2
  return { filename: fn, mime, data: body.slice(dataStart, dataEnd) }
}

/** Tebak ekstensi dari magic-byte (bukan dari nama file). */
function detectImageExt(buf, mime) {
  const starts = (bytes) => bytes.every((b, i) => buf[i] === b)
  if (starts([0x89, 0x50, 0x4e, 0x47])) return 'png'
  if (starts([0xff, 0xd8, 0xff])) return 'jpg'
  if (starts([0x47, 0x49, 0x46, 0x38])) return 'gif'
  // WebP: RIFF....WEBP
  if (
    buf.length > 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'webp'
  if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/gif' || mime === 'image/webp') {
    return mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]
  }
  return null
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 1_000_000) {
        req.destroy()
        reject(new Error('Body terlalu besar (maks 1 MB).'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('Body bukan JSON yang valid.'))
      }
    })
    req.on('error', reject)
  })
}

function validateEntry(body) {
  const jp = String(body.jp ?? '').trim()
  const romaji = String(body.romaji ?? '').trim()
  const arti = String(body.arti ?? '').trim()
  const kategori = String(body.kategori ?? '').trim() || 'Dasar'
  if (!jp || !romaji || !arti) {
    return { error: 'Field jp, romaji, dan arti wajib diisi.' }
  }
  return { entry: { jp, romaji, arti, kategori } }
}

async function handleApi(req, res, url) {
  // GET/POST /api/vocab
  if (url.pathname === '/api/vocab') {
    if (req.method === 'GET') {
      const list = await loadVocab()
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()

      // Pencarian: seluruh data difilter, maksimal SEARCH_MAX hasil dikirim
      // lengkap dengan index asli (untuk lompat ke halaman tabel).
      if (q) {
        const matched = list
          .map((item, index) => ({ item, index }))
          .filter(({ item }) =>
            [item.jp, item.romaji, item.arti, item.kategori].some((field) =>
              field.toLowerCase().includes(q),
            ),
          )
          .map(({ item, index }) => ({ ...item, index }))
        sendJson(res, 200, {
          total: matched.length,
          offset: 0,
          items: matched.slice(0, SEARCH_MAX),
        })
        return
      }

      const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0)
      const limitRaw = url.searchParams.get('limit')
      const limit = limitRaw === null ? null : Math.max(1, Number.parseInt(limitRaw, 10) || 1)
      const items = limit === null ? list.slice(offset) : list.slice(offset, offset + limit)
      sendJson(res, 200, { total: list.length, offset, items })
      return
    }
    if (req.method === 'POST') {
      const body = await readBody(req)
      const { entry, error } = validateEntry(body)
      if (error) {
        sendJson(res, 400, { error })
        return
      }
      const list = await loadVocab()
      const item = { id: nextId(list), ...entry }
      list.push(item)
      await saveVocab(list)
      sendJson(res, 201, { item, total: list.length })
      return
    }
  }

  // PUT/DELETE /api/vocab/:id
  const idMatch = url.pathname.match(/^\/api\/vocab\/(\d+)$/)
  if (idMatch) {
    const id = Number(idMatch[1])

    if (req.method === 'PUT') {
      const body = await readBody(req)
      const { entry, error } = validateEntry(body)
      if (error) {
        sendJson(res, 400, { error })
        return
      }
      const list = await loadVocab()
      const index = list.findIndex((item) => item.id === id)
      if (index === -1) {
        sendJson(res, 404, { error: `Kosakata dengan id ${id} tidak ditemukan.` })
        return
      }
      list[index] = { id, ...entry }
      await saveVocab(list)
      sendJson(res, 200, list[index])
      return
    }

    if (req.method === 'DELETE') {
      const list = await loadVocab()
      const index = list.findIndex((item) => item.id === id)
      if (index === -1) {
        sendJson(res, 404, { error: `Kosakata dengan id ${id} tidak ditemukan.` })
        return
      }
      const next = list.filter((item) => item.id !== id)
      await saveVocab(next)
      sendJson(res, 200, { ok: true, total: next.length, index })
      return
    }
  }

  sendJson(res, 404, { error: 'Endpoint tidak ditemukan.' })
}

/* ---------- Peta kalimat (GET/PUT /api/map) ---------- */

function clampNum(v, min, max, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function clampStr(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : ''
}

function sanitizeMap(raw) {
  const nodes = Array.isArray(raw?.nodes)
    ? raw.nodes.slice(0, 500).map((n) => ({
        id: clampStr(n.id, 64) || 'n',
        role: clampStr(n.role, 32),
        shape: clampStr(n.shape, 16),
        text: clampStr(n.text, 500),
        x: clampNum(n.x, -2000, 4000, 0),
        y: clampNum(n.y, -2000, 4000, 0),
        w: clampNum(n.w, 40, 600, 150),
        h: clampNum(n.h, 30, 600, 64),
      }))
    : []
  const edges = Array.isArray(raw?.edges)
    ? raw.edges
        .slice(0, 1000)
        .map((e) => ({
          id: clampStr(e.id, 64) || 'e',
          from: clampStr(e.from, 64),
          to: clampStr(e.to, 64),
          label: clampStr(e.label, 100),
        }))
        .filter((e) => e.from && e.to)
    : []
  return { nodes, edges }
}

async function handleMap(req, res, url) {
  if (url.pathname !== '/api/map') return false

  if (req.method === 'GET') {
    let raw = EMPTY_MAP
    try {
      raw = JSON.parse(await fs.readFile(MAP_FILE, 'utf8'))
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    sendJson(res, 200, sanitizeMap(raw))
    return true
  }

  if (req.method === 'PUT') {
    const body = await readBody(req)
    const map = sanitizeMap(body)
    await fs.mkdir(path.dirname(MAP_FILE), { recursive: true })
    await fs.writeFile(MAP_FILE, JSON.stringify(map, null, 2) + '\n', 'utf8')
    sendJson(res, 200, { ok: true, nodes: map.nodes.length, edges: map.edges.length })
    return true
  }

  sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
  return true
}

/* ---------- Catatan (GET/PUT /api/note) ---------- */

/**
 * Sanitasi HTML catatan tanpa dependensi:
 * buang tag berbahaya (script/style/iframe/dll), atribut event handler
 * (on*), dan URL javascript:. Atribut style inline diperbolehkan
 * (dipakai warna/font hasil editor).
 */
function sanitizeNoteHtml(raw) {
  let html = typeof raw === 'string' ? raw : ''
  html = html.slice(0, NOTE_MAX_BYTES)
  html = html.replace(/<\/?(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi, '')
  html = html.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  html = html.replace(
    /\s(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|\s*javascript:[^\s>]+)/gi,
    '',
  )
  // Gambar inline: hanya izinkan hasil upload lokal (/uploads/...).
  // URL luar, data:, blob:, dan atribut width liar dibuang demi keamanan & kerapian.
  html = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const m = /\ssrc\s*=\s*("[^"]*"|'[^']*')/i.exec(tag)
    if (!m) return ''
    const inner = m[1].slice(1, -1)
    if (!/^\/uploads\/[A-Za-z0-9_-]+\.(png|jpg|jpeg|gif|webp)$/i.test(inner)) return ''
    const wRaw = /\swidth\s*=\s*("?\d{1,4}")/i.exec(tag)?.[1] ?? ''
    const w = Math.round(Number(String(wRaw).replace(/"/g, '')))
    const safeW = Number.isFinite(w) ? ` width="${Math.min(1200, Math.max(24, w))}"` : ''
    return `<img src="${inner}"${safeW}>`
  })
  return html
}

async function handleNoteImage(req, res, url) {
  if (url.pathname !== '/api/note/image') return false
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
    return true
  }
  let file = null
  try {
    const raw = await readRawBody(req, IMG_MAX_BYTES + 64 * 1024)
    file = parseMultipartImage(raw, req.headers['content-type'])
  } catch (err) {
    sendJson(res, 413, { error: err.message || 'File terlalu besar.' })
    return true
  }
  if (!file || !file.data.length) {
    sendJson(res, 400, { error: 'Tidak ada file gambar. Kirim form-data dengan field "file".' })
    return true
  }
  const ext = detectImageExt(file.data, file.mime)
  if (!ext) {
    sendJson(res, 415, { error: 'Format tidak didukung. Gunakan PNG, JPG, GIF, atau WebP.' })
    return true
  }
  if (file.data.length > IMG_MAX_BYTES) {
    sendJson(res, 413, { error: 'Ukuran file melebihi batas 3 MB.' })
    return true
  }
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.writeFile(path.join(UPLOAD_DIR, name), file.data)
  sendJson(res, 200, { url: `/uploads/${name}` })
  return true
}

async function handleNote(req, res, url) {
  if (url.pathname !== '/api/note') return false

  if (req.method === 'GET') {
    let content = ''
    try {
      const raw = JSON.parse(await fs.readFile(NOTE_FILE, 'utf8'))
      content = sanitizeNoteHtml(raw?.content)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    sendJson(res, 200, { content })
    return true
  }

  if (req.method === 'PUT') {
    const body = await readBody(req)
    const content = sanitizeNoteHtml(body?.content)
    await fs.mkdir(path.dirname(NOTE_FILE), { recursive: true })
    await fs.writeFile(NOTE_FILE, JSON.stringify({ content }, null, 2) + '\n', 'utf8')
    sendJson(res, 200, { ok: true, bytes: Buffer.byteLength(content) })
    return true
  }

  sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
  return true
}

/* ---------- Chat (GET /api/chat/status, POST /api/chat) ---------- */

/**
 * Mode 'ai' memakai model eksternal TokenHarbor (kompatibel OpenAI SDK).
 * Penempatan kode: SDK `openai` hanya dipakai di server ini (proxy),
 * kunci API TIDAK PERNAH dikirim ke browser — frontend hanya memanggil
 * proxy POST /api/chat dan GET /api/chat/status.
 */
let chatClient = null
function getChatClient() {
  if (!CHAT_API_KEY) return null
  if (!chatClient) {
    chatClient = new OpenAI({
      apiKey: CHAT_API_KEY,
      baseURL: CHAT_BASE_URL,
    })
  }
  return chatClient
}
async function handleChat(req, res, url) {
  if (url.pathname === '/api/chat/status' && req.method === 'GET') {
    sendJson(res, 200, {
      ai: Boolean(CHAT_API_KEY),
      model: CHAT_MODEL,
      hint: CHAT_API_KEY
        ? ''
        : 'Set env TOKENHARBOR_API_KEY sebelum menjalankan server untuk mengaktifkan mode AI.',
    })
    return true
  }
  if (url.pathname !== '/api/chat') return false
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
    return true
  }
  if (!CHAT_API_KEY) {
    sendJson(res, 503, {
      error: 'Mode AI belum dikonfigurasi. Set env TOKENHARBOR_API_KEY lalu restart server.',
    })
    return true
  }
  let history = []
  try {
    const body = await readBody(req)
    if (Array.isArray(body?.messages)) history = body.messages
  } catch {
    sendJson(res, 400, { error: 'Body JSON tidak valid.' })
    return true
  }
  const messages = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-20)
    .map((m) => ({ role: m.role, content: String(m.content ?? '').slice(0, 4000) }))
  if (messages.length === 0 || !messages.some((m) => m.role === 'user')) {
    sendJson(res, 400, { error: 'Kirim minimal satu pesan user.' })
    return true
  }
  messages.unshift({
    role: 'system',
    content:
      'Kamu Koto, asisten belajar bahasa Jepang yang ramah. Jawab ringkas dalam Bahasa Indonesia, ' +
      'sertakan contoh kalimat Jepang (kanji + romaji + arti) bila relevan.',
  })
  // Panggil model via SDK OpenAI (baseURL TokenHarbor).
  try {
    const client = getChatClient()
    const completion = await client.chat.completions.create(
      {
        model: CHAT_MODEL,
        messages,
      },
      { timeout: CHAT_TIMEOUT_MS },
    )
    const reply = completion.choices?.[0]?.message?.content?.trim() ?? ''
    if (!reply) {
      sendJson(res, 502, { error: 'Model AI mengembalikan jawaban kosong.' })
      return true
    }
    sendJson(res, 200, { reply, model: completion.model ?? CHAT_MODEL })
    return true
  } catch (err) {
    const timeout =
      err?.name === 'AbortError' || err?.code === 'ETIMEDOUT' || /timeout/i.test(err?.message ?? '')
    sendJson(res, timeout ? 504 : 502, {
      error: timeout
        ? 'Model AI tidak merespons dalam 30 detik. Coba lagi.'
        : `Gagal menghubungi model AI: ${err.message || err}`,
    })
    return true
  }
}

/* ---------- Penyajian statis (hasil build) ---------- */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

/** Sajikan file gambar hasil upload catatan (GET/HEAD /uploads/<nama>). */
async function serveUpload(res, url, method) {
  const name = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  if (!/^[A-Za-z0-9_-]+\.(png|jpg|jpeg|gif|webp)$/i.test(name.slice('uploads/'.length))) {
    sendJson(res, 404, { error: 'File tidak ditemukan.' })
    return
  }
  const filePath = path.join(UPLOAD_DIR, name.slice('uploads/'.length))
  try {
    const stat = await fs.stat(filePath)
    if (!stat.isFile()) throw new Error('bukan file')
    const data = method === 'HEAD' ? null : await fs.readFile(filePath)
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
    res.end(data)
  } catch {
    sendJson(res, 404, { error: 'File tidak ditemukan.' })
  }
}

async function serveStatic(res, url) {
  try {
    await fs.access(DIST_DIR)
  } catch {
    sendJson(res, 200, {
      message:
        'API Kotoba berjalan. Build frontend dengan `npm run build`, lalu muat ulang untuk menyajikan halaman dari folder dist.',
    })
    return
  }

  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
  const filePath = path.resolve(DIST_DIR, rel || 'index.html')
  if (!filePath.startsWith(DIST_DIR + path.sep) && filePath !== DIST_DIR) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  try {
    const stat = await fs.stat(filePath)
    if (!stat.isFile()) throw new Error('bukan file')
    const data = await fs.readFile(filePath)
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    })
    res.end(data)
  } catch {
    // Fallback SPA: sajikan index.html untuk route non-file.
    try {
      const html = await fs.readFile(path.join(DIST_DIR, 'index.html'))
      res.writeHead(200, { 'Content-Type': MIME['.html'] })
      res.end(html)
    } catch {
      sendJson(res, 404, { error: 'File tidak ditemukan.' })
    }
  }
}

/* ---------- Server ---------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  try {
    if (url.pathname.startsWith('/api/')) {
      if (await handleMap(req, res, url)) return
      if (await handleNoteImage(req, res, url)) return
      if (await handleNote(req, res, url)) return
      if (await handleChat(req, res, url)) return
      await handleApi(req, res, url)
      return
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (url.pathname === '/uploads' || url.pathname.startsWith('/uploads/')) {
        await serveUpload(res, url, req.method)
        return
      }
      await serveStatic(res, url)
      return
    }
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Kesalahan server.' })
  }
})

server.listen(PORT, () => {
  console.log(`[kotoba] Server berjalan di http://localhost:${PORT}`)
  console.log(`[kotoba] Data kosakata: ${path.relative(ROOT_DIR, DATA_FILE)}`)
})
