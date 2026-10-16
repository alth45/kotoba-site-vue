/**
 * Konfigurasi terpusat server: path direktori, port, dan parameter API.
 * Nilai bisa dialihkan lewat environment variable (untuk test/dev).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** Akar proyek (folder di atas server/). */
export const ROOT_DIR = path.join(dirname, '..')

/** Folder data bisa dialihkan lewat env — dipakai test agar tidak menyentuh data asli. */
export const DATA_DIR = process.env.KOTOBA_DATA_DIR
  ? path.resolve(process.env.KOTOBA_DATA_DIR)
  : path.join(ROOT_DIR, 'data')

export const DATA_FILE = path.join(DATA_DIR, 'vocab.json')
export const DIST_DIR = path.join(ROOT_DIR, 'dist')
export const PORT = Number(process.env.PORT) || 3000

/** Batas hasil pencarian yang dikirim sekaligus. */
export const SEARCH_MAX = 50

/** Chat AI eksternal (TokenHarbor, kompatibel OpenAI). Kunci API hanya di server. */
export const CHAT_API_KEY = process.env.TOKENHARBOR_API_KEY || ''
export const CHAT_BASE_URL = process.env.TOKENHARBOR_BASE_URL || 'https://tokenharbor.ai/v1'
export const CHAT_MODEL = process.env.TOKENHARBOR_MODEL || 'deepseek-v4.1-flash:free'
export const CHAT_TIMEOUT_MS = 30000

/** File dokumen peta kalimat. */
export const MAP_FILE = path.join(DATA_DIR, 'map.json')
export const EMPTY_MAP = { nodes: [], edges: [] }

/** File catatan (notepad kaya format). */
export const NOTE_FILE = path.join(DATA_DIR, 'notes.json')
export const NOTE_MAX_BYTES = 400_000

/** Folder & batas upload gambar catatan. */
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
export const IMG_MAX_BYTES = 3 * 1024 * 1024
