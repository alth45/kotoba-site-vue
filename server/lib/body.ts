/** Pembacaan & parsing body request mentah, JSON, dan multipart gambar. */
import type { IncomingMessage } from 'node:http'
import { HttpError } from '../lib/http'
import type { ParsedImage } from '../types'

export function readRawBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        req.destroy()
        reject(new HttpError(413, 'Ukuran file melebihi batas 3 MB.'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 1_000_000) {
        req.destroy()
        reject(new HttpError(413, 'Body terlalu besar (maks 1 MB).'))
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
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>)
      } catch {
        reject(new HttpError(400, 'Body bukan JSON yang valid.'))
      }
    })
    req.on('error', reject)
  })
}

/**
 * Parser multipart/form-data minimal (satu file saja) tanpa dependensi.
 * Mengembalikan { filename, mime, data } atau null bila bukan multipart valid.
 */
export function parseMultipartImage(body: Buffer, contentType: string | undefined): ParsedImage | null {
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
export function detectImageExt(buf: Buffer, mime: string): string | null {
  const starts = (bytes: number[]): boolean => bytes.every((b, i) => buf[i] === b)
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
