/**
 * Tipe bersama untuk seluruh aplikasi Kotoba (frontend).
 */

/** Entri kosakata — struktur data/vocab.json & API /api/vocab. */
export interface VocabItem {
  id: number
  jp: string
  romaji: string
  arti: string
  kategori: string
  /** Indeks posisi di daftar penuh (0-based) — selalu disertakan server. */
  index: number
}

/** Respons GET /api/vocab (dengan atau tanpa `q`). */
export interface VocabListResponse {
  total: number
  offset: number
  items: VocabItem[]
}

/** Body POST/PUT /api/vocab — `id` tidak wajib (dibuat server). */
export type VocabEntry = Omit<VocabItem, 'id' | 'index'> & { id?: number }

/** Peran tata bahasa node peta kalimat. */
export interface MapRole {
  id: string
  jp: string
  idn: string
  color: string
}

/** Bentuk geometri node pada palet peta. */
export interface ShapeDef {
  id: string
  label: string
  w: number
  h: number
  radius: string
}

/** Node pada kanvas peta pola kalimat. */
export interface MapNode {
  id: string
  role: string
  shape: string
  text: string
  x: number
  y: number
  w: number
  h: number
}

/** Sisi (panah) penghubung antar-node. */
export interface MapEdge {
  id: string
  from: string
  to: string
  label: string
}

/** Input pembuatan node: sebagian properti boleh belum diisi. */
export type MapNodeInput = Partial<MapNode> & { shape?: string }

/** Template pola kalimat siap pakai. */
export interface MapTemplate {
  id: string
  label: string
  sample: string
  nodes: Array<Partial<MapNode> & { key: string }>
  edges: Array<[from: string, to: string, label?: string]>
}

/** Pesan pada halaman Chat. */
export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  text: string
  time: string
  /** Rute halaman yang ditawarkan agen navigasi. */
  link?: string
  /** Penanda jawaban berasal dari model AI. */
  via?: 'ai'
  /** Hasil kosakata teratas untuk ditampilkan sebagai kartu. */
  results?: VocabItem[]
  total?: number
}

/** Mode agen chat: aturan lokal tanpa jaringan, atau model AI via proxy. */
export type ChatMode = 'local' | 'ai'

/** Opsi dialog konfirmasi global. */
export interface ConfirmOptions {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

/** Opsi konfirmasi setelah nilai default diterapkan (dipakai store & dialog). */
export type ResolvedConfirmOptions = Required<ConfirmOptions>

/** Status ketersediaan mode AI (respons GET /api/chat/status). */
export interface ChatStatusResponse {
  ai: boolean
  model?: string
  hint?: string
}
