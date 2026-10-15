/**
 * core/noteOptions.ts
 * Konstanta & opsi statis untuk halaman Catatan (NotePage).
 * Diletakkan di luar file .vue agar template & logika tetap bersih.
 */

/* ---------- Opsi toolbar format ---------- */
export const FONT_OPTIONS = [
  { label: 'Standar', value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' },
  { label: 'Sans Jepang', value: '"Noto Sans JP", "Yu Gothic", "Meiryo", "Hiragino Sans", sans-serif' },
  { label: 'UD Digi Kyokasho', value: '"UD Digi Kyokasho N-R", "UD Digi Kyokasho NK-R", "BIZ UDGothic", "Yu Gothic", "Meiryo", sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Serif Jepang', value: '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif' },
  { label: 'Monospace', value: 'Consolas, "Courier New", monospace' },
  { label: 'Casual', value: '"Segoe Print", "Comic Sans MS", cursive' },
]

export const SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48]

export const TEXT_COLORS = [
  '#3c4046', '#828892', '#2c3e50', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#c0392b',
  '#d35400', '#f1c40f', '#7f9a8c', '#8494ac', '#c79a8b', '#c9b478', '#a396c0', '#a0434d',
]

export const MARK_COLORS = [
  '#ffe9a8', '#ffd6d6', '#d7f0dd', '#d6e4ff', '#e8dcf7', '#ffd9ec', '#dff3f2', '#e6e6e6',
  '#f8c9a0', '#b8e0c8', '#cfe0f7', '#eadcf0',
]

/** Preset lebar gambar (px) — disesuaikan dengan lebar kertas 860px. */
export const IMG_PRESETS = [
  { label: 'S', width: 200 },
  { label: 'M', width: 360 },
  { label: 'L', width: 560 },
  { label: 'Penuh', width: 760 },
]

export const IMG_DEFAULT_WIDTH = 360
export const IMG_API = '/api/note/image'

/* ---------- Sidebar referensi situs ---------- */
export interface SitusJp {
  id: string
  name: string
  url: string
  category: string
}

/** Daftar situs yang disediakan (sumber: data ResourcePage). */
export const SITES_JP: SitusJp[] = [
  { id: 'nhk-easy', name: 'NHK Web Easy', url: 'https://www3.nhk.or.jp/news/easy/', category: 'Berita' },
  { id: 'jisho', name: 'Jisho Dictionary', url: 'https://jisho.org/', category: 'Kamus' },
  { id: 'takoboto', name: 'Takoboto', url: 'https://takoboto.jp/', category: 'Kamus' },
  { id: 'wanikani', name: 'Wanikani', url: 'https://www.wanikani.com/', category: 'Belajar' },
  { id: 'bunpro', name: 'Bunpro', url: 'https://bunpro.jp/', category: 'Belajar' },
  { id: 'jlptsensei', name: 'JLPT Sensei', url: 'https://jlptsensei.com/', category: 'JLPT' },
  { id: 'jees', name: 'JEES — Soal JLPT', url: 'https://www.jees.or.jp/jlpt/sample.htm', category: 'JLPT' },
  { id: 'tofu', name: 'Tofugu', url: 'https://www.tofugu.com/', category: 'Belajar' },
  { id: 'animelon', name: 'Animelon', url: 'https://animelon.com/', category: 'Hiburan' },
  { id: 'satori', name: 'Satori Reader', url: 'https://www.satorireader.com/', category: 'Baca' },
  { id: 'jpdb', name: 'Jpdb.io', url: 'https://jpdb.io/', category: 'Kamus' },
  { id: 'nhk-japan', name: 'NHK Japan', url: 'https://www.nhk.or.jp/', category: 'Berita' },
  { id: 'asahi', name: 'Asahi Shimbun', url: 'https://www.asahi.com/', category: 'Berita' },
  { id: 'yomiuri', name: 'Yomiuri Online', url: 'https://www.yomiuri.co.jp/', category: 'Berita' },
  { id: 'mainichi', name: 'Mainichi Shimbun', url: 'https://mainichi.jp/', category: 'Berita' },
  { id: 'nihongo-pro', name: 'Nihongo-Pro', url: 'https://www.nihongo-pro.com/', category: 'Belajar' },
  { id: 'pod101', name: 'JapanesePod101', url: 'https://www.japanesepod101.com/', category: 'Belajar' },
  { id: 'ojad', name: 'OJAD — Prosodi', url: 'https://www.gavo.t.u-tokyo.ac.jp/ojad/', category: 'Kamus' },
  { id: 'kana', name: 'Hiragana/Katakana', url: 'https://www.learn-japanese-adventure.com/', category: 'Belajar' },
  { id: 'erin', name: "Erin's Challenge", url: 'https://www.erin.ne.jp/en/', category: 'Hiburan' },
]
