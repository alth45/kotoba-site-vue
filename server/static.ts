/** Penyajian file statis: hasil build (dist/) dan gambar hasil upload catatan. */
import type { ServerResponse } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DIST_DIR, UPLOAD_DIR } from './config'
import { sendJson } from './lib/http'

/** Peta ekstensi file → Content-Type untuk penyajian statis. */
const MIME: Record<string, string> = {
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
export async function serveUpload(res: ServerResponse, url: URL, method: string | undefined): Promise<void> {
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

export async function serveStatic(res: ServerResponse, url: URL): Promise<void> {
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
