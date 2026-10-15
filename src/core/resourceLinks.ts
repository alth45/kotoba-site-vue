/**
 * core/resourceLinks.ts
 * Data & util murni untuk halaman Sumber Belajar (ResourcePage):
 * preset tautan, penyimpanan localStorage, dan helper tampilan kartu.
 */

/* ================================================================
   PRESET LINKS — situs domain Jepang
   ================================================================ */
export const PRESETS = [
  { id: 'p1',  name: 'NHK Web Easy',         url: 'https://www3.nhk.or.jp/news/easy/',            category: 'Berita',     pinned: true  },
  { id: 'p2',  name: 'Jisho — Kamus Jepang', url: 'https://jisho.org/',                           category: 'Kamus',      pinned: true  },
  { id: 'p3',  name: 'Takoboto',             url: 'https://takoboto.jp/',                         category: 'Kamus',      pinned: false },
  { id: 'p4',  name: 'Wanikani',             url: 'https://www.wanikani.com/',                    category: 'Belajar',    pinned: false },
  { id: 'p5',  name: 'Bunpro',               url: 'https://bunpro.jp/',                           category: 'Belajar',    pinned: false },
  { id: 'p6',  name: 'JLPT Sensei',          url: 'https://jlptsensei.com/',                      category: 'JLPT',       pinned: false },
  { id: 'p7',  name: 'JEES — Soal JLPT',     url: 'https://www.jees.or.jp/jlpt/sample.htm',       category: 'JLPT',       pinned: false },
  { id: 'p8',  name: 'Tofugu',               url: 'https://www.tofugu.com/',                      category: 'Belajar',    pinned: false },
  { id: 'p9',  name: 'Animelon',             url: 'https://animelon.com/',                        category: 'Hiburan',    pinned: false },
  { id: 'p10', name: 'Satori Reader',        url: 'https://www.satorireader.com/',                category: 'Baca',       pinned: false },
  { id: 'p11', name: 'Jpdb.io',              url: 'https://jpdb.io/',                             category: 'Kamus',      pinned: false },
  { id: 'p12', name: 'NHK Japan',            url: 'https://www.nhk.or.jp/',                       category: 'Berita',     pinned: false },
  { id: 'p13', name: 'Asahi Shimbun',        url: 'https://www.asahi.com/',                       category: 'Berita',     pinned: false },
  { id: 'p14', name: 'Yomiuri Online',       url: 'https://www.yomiuri.co.jp/',                   category: 'Berita',     pinned: false },
  { id: 'p15', name: 'Mainichi Shimbun',     url: 'https://mainichi.jp/',                         category: 'Berita',     pinned: false },
  { id: 'p16', name: 'Nihongo-Pro',          url: 'https://www.nihongo-pro.com/',                 category: 'Belajar',    pinned: false },
  { id: 'p17', name: 'JapanesePod101',       url: 'https://www.japanesepod101.com/',              category: 'Belajar',    pinned: false },
  { id: 'p18', name: 'OJAD — Prosodi',       url: 'https://www.gavo.t.u-tokyo.ac.jp/ojad/',       category: 'Kamus',      pinned: false },
  { id: 'p19', name: 'Hiragana/Katakana',    url: 'https://www.learn-japanese-adventure.com/',    category: 'Belajar',    pinned: false },
  { id: 'p20', name: 'Erin\'s Challenge',    url: 'https://www.erin.ne.jp/en/',                   category: 'Hiburan',    pinned: false },
]

export const CATEGORIES = ['Kamus', 'Belajar', 'Berita', 'JLPT', 'Baca', 'Hiburan', 'Lainnya']

/* ================================================================
   STORAGE
   ================================================================ */
const STORAGE_KEY = 'kotoba-resources'

export interface ResourceLink {
  id: string
  name: string
  url: string
  category: string
  pinned: boolean
}

export function loadLinks(): ResourceLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLinks(list: ResourceLink[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/* ================================================================
   HELPER TAMPILAN
   ================================================================ */
export function normalizeUrl(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  return /^https?:\/\//i.test(s) ? s : 'https://' + s
}

export function getDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

export function getFavicon(url: string): string {
  try {
    const origin = new URL(url).origin
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`
  } catch {
    return ''
  }
}

export function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    Kamus:   '#8ba3c7',
    Belajar: '#8fae9d',
    Berita:  '#c79a8b',
    JLPT:    '#c9b478',
    Baca:    '#a396c0',
    Hiburan: '#7fa8ae',
    Lainnya: '#9aa1ab',
  }
  return map[cat] ?? '#9aa1ab'
}

/** Buat entri tautan baru dari isian form (id unik berbasis waktu). */
export function makeUserLink(input: { name: string; url: string; category: string }): ResourceLink {
  return {
    id: 'u' + Date.now(),
    name: input.name.trim(),
    url: input.url,
    category: input.category || 'Lainnya',
    pinned: false,
  }
}
