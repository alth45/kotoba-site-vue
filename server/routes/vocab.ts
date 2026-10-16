/**
 * Endpoint kosakata: GET/POST /api/vocab dan PUT/DELETE /api/vocab/:id.
 * Data disimpan di data/vocab.json (array JSON sederhana).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { promises as fs } from 'node:fs'
import { DATA_FILE, SEARCH_MAX } from '../config'
import type { VocabItem, RawItem } from '../types'
import { sendJson } from '../lib/http'
import { readBody } from '../lib/body'
import { LOCK_VOCAB, withWriteLock, writeFileAtomic } from '../lib/writeLock'

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

function normalizeItem(raw: RawItem, index: number): VocabItem {
  return {
    // id tetap 1-based (untuk API), index posisi 0-based (untuk lompat halaman).
    id: Number.isFinite(Number(raw.id)) ? Number(raw.id) : index + 1,
    jp: String(raw.jp ?? ''),
    romaji: String(raw.romaji ?? ''),
    arti: String(raw.arti ?? ''),
    kategori: String(raw.kategori ?? 'Dasar'),
    index,
  }
}

async function saveVocab(list: VocabItem[]): Promise<void> {
  await writeFileAtomic(DATA_FILE, JSON.stringify(list, null, 2) + '\n')
}

/**
 * Baca seluruh daftar kosakata.
 *
 * Tidak pernah menulis: bila file belum ada, data awal (SEED) dikembalikan
 * hanya di memori dan file baru dibuat saat ada operasi tulis pertama. Ini
 * menghindari "write di dalam read" yang bisa membalap operasi tulis lain.
 */
export async function loadVocab(): Promise<VocabItem[]> {
  let raw: string
  try {
    raw = await fs.readFile(DATA_FILE, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return SEED.map((item, i) => normalizeItem({ ...item }, i))
    }
    throw err
  }
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('Struktur data/vocab.json harus berupa array.')
  }
  return (parsed as RawItem[]).map((item, i) => normalizeItem(item, i))
}

function nextId(list: VocabItem[]): number {
  return list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

/**
 * Siklus baca → ubah → tulis untuk data/vocab.json, seluruhnya di dalam kunci
 * tulis. `index` dinormalkan ulang sebelum & sesudah mutator agar tetap
 * konsisten walau file JSON pernah diedit manual.
 *
 * `nextId()` dipanggil di dalam mutator — yaitu di dalam critical section —
 * sehingga dua POST paralel tidak mungkin mendapat id yang sama.
 */
function mutateVocab<T>(mutator: (list: VocabItem[]) => T): Promise<T> {
  return withWriteLock(LOCK_VOCAB, async () => {
    const list = await loadVocab()
    list.forEach((item, i) => {
      item.index = i
    })
    const result = mutator(list)
    list.forEach((item, i) => {
      item.index = i
    })
    await saveVocab(list)
    return result
  })
}

interface ValidatedEntry {
  jp: string
  romaji: string
  arti: string
  kategori: string
}

function validateEntry(body: Record<string, unknown>): { entry?: ValidatedEntry; error?: string } {
  const jp = String(body.jp ?? '').trim()
  const romaji = String(body.romaji ?? '').trim()
  const arti = String(body.arti ?? '').trim()
  const kategori = String(body.kategori ?? '').trim() || 'Dasar'
  if (!jp || !romaji || !arti) {
    return { error: 'Field jp, romaji, dan arti wajib diisi.' }
  }
  return { entry: { jp, romaji, arti, kategori } }
}

export async function handleVocab(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
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
      // `index` sudah dibawa setiap item sejak loadVocab — kirim apa adanya.
      sendJson(res, 200, { total: list.length, offset, items })
      return
    }

    if (req.method === 'POST') {
      const body = await readBody(req)
      const { entry, error } = validateEntry(body)
      if (error || !entry) {
        sendJson(res, 400, { error: error ?? 'Data tidak valid.' })
        return
      }
      // Baca → tentukan id → push → tulis, semuanya di dalam satu kunci tulis.
      const { item, total } = await mutateVocab((list) => {
        const created: VocabItem = { id: nextId(list), index: list.length, ...entry }
        list.push(created)
        return { item: created, total: list.length }
      })
      sendJson(res, 201, { item, total })
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
      if (error || !entry) {
        sendJson(res, 400, { error: error ?? 'Data tidak valid.' })
        return
      }
      const updated = await mutateVocab((list) => {
        const index = list.findIndex((item) => item.id === id)
        if (index === -1) return null
        const next: VocabItem = { id, index, ...entry }
        list[index] = next
        return next
      })
      if (!updated) {
        sendJson(res, 404, { error: `Kosakata dengan id ${id} tidak ditemukan.` })
        return
      }
      sendJson(res, 200, updated)
      return
    }

    if (req.method === 'DELETE') {
      const removed = await mutateVocab((list) => {
        const index = list.findIndex((item) => item.id === id)
        if (index === -1) return null
        list.splice(index, 1)
        // Index pergeser setelah penghapusan — mutateVocab menormalkan ulang
        // sebelum menyimpan, jadi di sini cukup kembalikan posisi lama.
        return { index, total: list.length }
      })
      if (!removed) {
        sendJson(res, 404, { error: `Kosakata dengan id ${id} tidak ditemukan.` })
        return
      }
      sendJson(res, 200, { ok: true, total: removed.total, index: removed.index })
      return
    }
  }

  sendJson(res, 404, { error: 'Endpoint tidak ditemukan.' })
}
