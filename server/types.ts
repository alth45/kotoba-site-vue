/** Tipe bersama untuk seluruh modul server. */

/** Butir kosakata di file JSON bisa saja tidak rapi — dinormalisasi saat dibaca. */
export interface VocabItem {
  id: number
  jp: string
  romaji: string
  arti: string
  kategori: string
  /** Posisi 0-based di daftar penuh — selalu disertakan agar sesuai tipe frontend. */
  index: number
}

export type RawItem = Record<string, unknown>

/** Hasil parsing multipart satu file gambar. */
export interface ParsedImage {
  filename: string
  mime: string
  data: Buffer
}

/** DTO node peta kalimat (sudah disanitasi). */
export interface MapNodeDto {
  id: string
  role: string
  shape: string
  text: string
  x: number
  y: number
  w: number
  h: number
}

/** DTO edge peta kalimat (sudah disanitasi). */
export interface MapEdgeDto {
  id: string
  from: string
  to: string
  label: string
}
