/**
 * Entry point server backend Kotoba.
 *
 * File ini HANYA bertugas merangkai modul: membuat server HTTP dan
 * meneruskan request ke handler sesuai fungsinya masing-masing.
 * Seluruh logika bisnis berada di modul terpisah:
 *
 * - config.ts          → path direktori, port, dan parameter API (env)
 * - types.ts           → tipe data bersama (VocabItem, DTO peta, dll.)
 * - lib/http.ts        → HttpError & sendJson
 * - lib/body.ts        → pembacaan body (JSON mentah & multipart gambar)
 * - lib/writeLock.ts   → kunci tulis per-berkas + penulisan atomik
 * - routes/vocab.ts    → GET/POST/PUT/DELETE /api/vocab
 * - routes/map.ts      → GET/PUT /api/map
 * - routes/note.ts     → GET/PUT /api/note & POST /api/note/image
 * - routes/chat.ts     → GET /api/chat/status & POST /api/chat
 * - static.ts          → penyajian dist/ (SPA) & /uploads/
 *
 * Endpoint API:
 * - GET    /api/vocab       → seluruh daftar kosakata
 * - POST   /api/vocab       → tambah kosakata (id otomatis)
 * - PUT    /api/vocab/:id   → ubah kosakata
 * - DELETE /api/vocab/:id   → hapus kosakata
 *
 * Bila folder dist/ sudah ada (hasil `npm run build`), server ini juga
 * menyajikan halaman statis + fallback SPA. Jalankan: npm start
 *
 * Konkurensi:
 * - Semua operasi tulis file JSON (vocab, map, note) diserialisasi lewat
 *   `withWriteLock()` (lib/writeLock.ts) sehingga tidak ada read-modify-write
 *   yang saling menimpa.
 * - Penulisan file bersifat atomik (tulis ke file temporer → fsync → rename),
 *   jadi pembaca tidak pernah melihat file setengah jadi dan crash di tengah
 *   proses tidak merusak data lama.
 */
import http from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { PORT, ROOT_DIR, DATA_FILE } from './config'
import { HttpError, sendJson } from './lib/http'
import { handleVocab } from './routes/vocab'
import { handleMap } from './routes/map'
import { handleNote, handleNoteImage } from './routes/note'
import { handleChat } from './routes/chat'
import { serveStatic, serveUpload } from './static'

const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  try {
    if (url.pathname.startsWith('/api/')) {
      if (await handleMap(req, res, url)) return
      if (await handleNoteImage(req, res, url)) return
      if (await handleNote(req, res, url)) return
      if (await handleChat(req, res, url)) return
      await handleVocab(req, res, url)
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
    sendJson(res, err instanceof HttpError ? err.status : 500, {
      error: (err as Error).message || 'Kesalahan server.',
    })
  }
})

server.listen(PORT, () => {
  console.log(`[kotoba] Server berjalan di http://localhost:${PORT}`)
  console.log(`[kotoba] Data kosakata: ${path.relative(ROOT_DIR, DATA_FILE)}`)
})
