/**
 * core/situsGroup.ts
 * Data & util murni untuk halaman SitusGroup:
 * preset situs domain Jepang (.jp / .co.jp / .or.jp / .go.jp / .ne.jp dll),
 * platform anime gratis, penyimpanan localStorage, dan helper tampilan kartu.
 */

/* ================================================================
   PRESET LINKS — situs domain .jp & platform anime gratis
   ================================================================ */
export const SG_PRESETS = [
  /* ---- Berita (domain .jp / .co.jp) ---- */
  { id: 'sg1',  name: 'NHK Japan — Berita Nasional', url: 'https://www3.nhk.or.jp/',               category: 'Berita',    pinned: true  },
  { id: 'sg2',  name: 'NHK Web Easy — Berita Belajar', url: 'https://www3.nhk.or.jp/news/easy/',   category: 'Berita',    pinned: false },
  { id: 'sg3',  name: 'The Japan Times',             url: 'https://www.japantimes.co.jp/',          category: 'Berita',    pinned: false },
  { id: 'sg4',  name: 'Asahi Shimbun (朝日新聞)',     url: 'https://www.asahi.com/',                 category: 'Berita',    pinned: false },
  { id: 'sg5',  name: 'Yomiuri Shimbun (読売新聞)',   url: 'https://www.yomiuri.co.jp/',             category: 'Berita',    pinned: false },
  { id: 'sg6',  name: 'Mainichi Shimbun (毎日新聞)',  url: 'https://mainichi.jp/',                   category: 'Berita',    pinned: false },
  { id: 'sg7',  name: 'Nikkei (日本経済新聞)',        url: 'https://www.nikkei.com/',                category: 'Berita',    pinned: false },
  { id: 'sg8',  name: 'Kyodo News (共同通信)',        url: 'https://www.kyodonews.net/',             category: 'Berita',    pinned: false },

  /* ---- Pemerintah & Ensiklopedia (.go.jp / .or.jp) ---- */
  { id: 'sg9',  name: 'Digital Agency (デジタル庁)',  url: 'https://www.digital.go.jp/',             category: 'Pemerintah', pinned: false },
  { id: 'sg10', name: 'MOFA — Kementerian Luar Negeri', url: 'https://www.mofa.go.jp/',              category: 'Pemerintah', pinned: false },
  { id: 'sg11', name: 'JFT Foundation (国際交流基金)', url: 'https://www.jpf.go.jp/',                category: 'Pemerintah', pinned: false },
  { id: 'sg12', name: 'Wikipedia Bahasa Jepang',      url: 'https://ja.wikipedia.org/',              category: 'Referensi',  pinned: false },

  /* ---- Hiburan & Streaming ---- */
  { id: 'sg13', name: 'YouTube Japan',                url: 'https://www.youtube.com/',               category: 'Hiburan',   pinned: false },
  { id: 'sg14', name: 'TVer — TV Gratis Jepang',      url: 'https://tver.jp/',                       category: 'Streaming', pinned: true  },
  { id: 'sg15', name: 'ABEMA — TV Online Gratis',     url: 'https://abema.tv/',                      category: 'Streaming', pinned: false },
  { id: 'sg16', name: 'Niconic Douga (ニコニコ)',     url: 'https://www.nicovideo.jp/',              category: 'Hiburan',   pinned: false },
  { id: 'sg17', name: 'Music Japan TV',               url: 'https://musicjapan.tv/',                 category: 'Musik',     pinned: false },

  /* ---- Platform Anime Gratis ---- */
  { id: 'sg18', name: 'Crunchyroll — Anime Legal',    url: 'https://www.crunchyroll.com/',           category: 'Anime',     pinned: true  },
  { id: 'sg19', name: 'Muse Asia (YouTube)',          url: 'https://www.youtube.com/@MuseAsia',      category: 'Anime',     pinned: false },
  { id: 'sg20', name: 'Ani-One Asia (YouTube)',       url: 'https://www.youtube.com/@AniOneAsia',    category: 'Anime',     pinned: false },
  { id: 'sg21', name: 'Prime Video — Anime Channel',  url: 'https://www.primevideo.com/',            category: 'Anime',     pinned: false },
  { id: 'sg22', name: 'Netflix — Anime',              url: 'https://www.netflix.com/',               category: 'Anime',     pinned: false },
  { id: 'sg23', name: 'Bilibili TV (B-site)',         url: 'https://www.bilibili.co.jp/',            category: 'Anime',     pinned: false },
  { id: 'sg24', name: 'Animelon — Nonton + Sub JP',   url: 'https://animelon.com/',                  category: 'Anime',     pinned: false },

  /* ---- Komik / Manga ---- */
  { id: 'sg25', name: 'Manga Plus (Shonen Jump)',     url: 'https://mangaplus.shueisha.co.jp/',      category: 'Komik',     pinned: false },
  { id: 'sg26', name: 'Comic Walker (KADOKAWA)',      url: 'https://comic-walker.com/',              category: 'Komik',     pinned: false },
  { id: 'sg27', name: 'MangaDex',                     url: 'https://mangadex.org/',                  category: 'Komik',     pinned: false },

  /* ---- Game & App ---- */
  { id: 'sg28', name: 'Steam Store',                  url: 'https://store.steampowered.com/',        category: 'Game',      pinned: false },
  { id: 'sg29', name: 'JP Gate — Game Jepang',        url: 'https://www.jpgate.jp/',                 category: 'Game',      pinned: false },

  /* ---- Marketplace ---- */
  { id: 'sg30', name: 'Rakuten (楽天市場)',           url: 'https://www.rakuten.co.jp/',             category: 'Marketplace', pinned: false },
  { id: 'sg31', name: 'Amazon Japan',                 url: 'https://www.amazon.co.jp/',              category: 'Marketplace', pinned: false },
  { id: 'sg32', name: 'Yahoo! Shopping Japan',        url: 'https://shopping.yahoo.co.jp/',          category: 'Marketplace', pinned: false },
  { id: 'sg33', name: 'Mercari (メルカリ)',           url: 'https://mercari.com/',                   category: 'Marketplace', pinned: false },

  /* ---- Transportasi & Perjalanan ---- */
  { id: 'sg34', name: 'JR East (東日本旅客鉄道)',     url: 'https://www.jreast.co.jp/',              category: 'Transportasi', pinned: false },
  { id: 'sg35', name: 'NAVITIME — Rute & Peta',       url: 'https://navitime.co.jp/',                category: 'Transportasi', pinned: false },
  { id: 'sg36', name: 'Japan Official Travel',        url: 'https://www.japan.travel/id/',           category: 'Transportasi', pinned: false },

  /* ---- Referensi & Kamus ---- */
  { id: 'sg37', name: 'Jisho.org — Kamus Jepang',     url: 'https://jisho.org/',                     category: 'Referensi', pinned: true  },
  { id: 'sg38', name: 'Weblio Dictionary',            url: 'https://www.weblio.jp/',                 category: 'Referensi', pinned: false },
  { id: 'sg39', name: 'Goo Dictionary',               url: 'https://dictionary.goo.ne.jp/',          category: 'Referensi', pinned: false },
  { id: 'sg40', name: 'Jpdb.io — Bank Kosakata',      url: 'https://jpdb.io/',                       category: 'Referensi', pinned: false },

  /* ---- Lainnya ---- */
  { id: 'sg41', name: 'Erin\'s Challenge',            url: 'https://www.erin.ne.jp/en/',             category: 'Lainnya',   pinned: false },
]

export const SG_CATEGORIES = [
  'Berita', 'Pemerintah', 'Referensi', 'Hiburan', 'Streaming',
  'Musik', 'Anime', 'Komik', 'Game', 'Marketplace', 'Transportasi', 'Lainnya',
]

/* ================================================================
   STORAGE
   ================================================================ */
const SG_STORAGE_KEY = 'kotoba-situsgroup'

export interface SitusGroupLink {
  id: string
  name: string
  url: string
  category: string
  pinned: boolean
}

export function loadSitusLinks(): SitusGroupLink[] {
  try {
    const raw = localStorage.getItem(SG_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveSitusLinks(list: SitusGroupLink[]): void {
  localStorage.setItem(SG_STORAGE_KEY, JSON.stringify(list))
}

/* ================================================================
   HELPER TAMPILAN
   ================================================================ */
export function sgNormalizeUrl(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  return /^https?:\/\//i.test(s) ? s : 'https://' + s
}

export function sgGetDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

export function sgGetFavicon(url: string): string {
  try {
    const origin = new URL(url).origin
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`
  } catch {
    return ''
  }
}

export function sgGetCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    Berita:       '#c79a8b',
    Pemerintah:   '#8ba3c7',
    Referensi:    '#a396c0',
    Hiburan:      '#7fa8ae',
    Streaming:    '#6fa3d8',
    Musik:        '#c9a778',
    Anime:        '#d88ca0',
    Komik:        '#8fae9d',
    Game:         '#78b3a0',
    Marketplace:  '#c9b478',
    Transportasi: '#88a8b8',
    Lainnya:      '#9aa1ab',
  }
  return map[cat] ?? '#9aa1ab'
}

/** Buat entri tautan baru dari isian form (id unik berbasis waktu). */
export function makeSitusUserLink(input: { name: string; url: string; category: string }): SitusGroupLink {
  return {
    id: 'su' + Date.now(),
    name: input.name.trim(),
    url: input.url,
    category: input.category || 'Lainnya',
    pinned: false,
  }
}
