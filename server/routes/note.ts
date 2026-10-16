/** Endpoint catatan: GET/PUT /api/note dan upload gambar POST /api/note/image. */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NOTE_FILE, NOTE_MAX_BYTES, UPLOAD_DIR, IMG_MAX_BYTES } from '../config'
import type { ParsedImage } from '../types'
import { HttpError, sendJson } from '../lib/http'
import { readBody, readRawBody, parseMultipartImage, detectImageExt } from '../lib/body'
import { LOCK_NOTE, withWriteLock, writeFileAtomic } from '../lib/writeLock'

/**
 * Sanitasi HTML catatan tanpa dependensi:
 * buang tag berbahaya (script/style/iframe/dll), atribut event handler
 * (on*), dan URL javascript:. Atribut style inline diperbolehkan
 * (dipakai warna/font hasil editor).
 */
function sanitizeNoteHtml(raw: unknown): string {
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

export async function handleNoteImage(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  if (url.pathname !== '/api/note/image') return false
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
    return true
  }
  let file: ParsedImage | null = null
  try {
    const raw = await readRawBody(req, IMG_MAX_BYTES + 64 * 1024)
    file = parseMultipartImage(raw, req.headers['content-type'])
  } catch (err) {
    sendJson(res, err instanceof HttpError ? err.status : 413, {
      error: (err as Error).message || 'File terlalu besar.',
    })
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
  // Nama file unik per upload → tidak ada dua request yang menulis path sama.
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  await writeFileAtomic(path.join(UPLOAD_DIR, name), file.data)
  sendJson(res, 200, { url: `/uploads/${name}` })
  return true
}

export async function handleNote(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  if (url.pathname !== '/api/note') return false

  if (req.method === 'GET') {
    let content = ''
    try {
      const raw = JSON.parse(await fs.readFile(NOTE_FILE, 'utf8')) as { content?: unknown }
      content = sanitizeNoteHtml(raw?.content)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
    sendJson(res, 200, { content })
    return true
  }

  if (req.method === 'PUT') {
    const body = await readBody(req)
    const content = sanitizeNoteHtml(body?.content)
    await withWriteLock(LOCK_NOTE, () =>
      writeFileAtomic(NOTE_FILE, JSON.stringify({ content }, null, 2) + '\n'),
    )
    sendJson(res, 200, { ok: true, bytes: Buffer.byteLength(content) })
    return true
  }

  sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
  return true
}
