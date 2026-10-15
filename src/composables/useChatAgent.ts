// ============================================================
// useChatAgent.js — "agen" chat lokal khusus halaman Chat.
//
// Bukan pemanggil LLM eksternal: mesin jawab berbasis aturan yang
// memanfaatkan data situs sendiri:
//  - Sapaan / bantuan / navigasi (aturan lokal, tanpa jaringan).
//  - Pencarian kosakata lewat API /api/vocab?q= (data/vocab.json).
// Riwayat percakapan disimpan di localStorage agar tidak hilang
// saat halaman dimuat ulang.
// ============================================================
import { nextTick, ref } from 'vue'
import type {
  ChatMessage,
  ChatMode,
  ChatStatusResponse,
  VocabItem,
  VocabListResponse,
} from '../types.ts'

const CHAT_KEY = 'kotoba-chat-history-v1'
const CHAT_MODE_KEY = 'kotoba-chat-mode-v1'
const VOCAB_API = '/api/vocab'
const CHAT_API = '/api/chat'
const CHAT_STATUS_API = '/api/chat/status'

let seq = 0
function makeId(): string {
  seq += 1
  return `m${Date.now().toString(36)}-${seq}`
}

function nowTime(): string {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function greeting(): string {
  return (
    'Halo! Saya **Koto**, asisten belajar bahasa Jepang. ' +
    'Tanya arti kata, mis. `apa arti arigatou?`, atau ketik `bantuan` ' +
    'untuk melihat yang bisa saya lakukan.'
  )
}

function helpText(): string {
  return (
    'Saya bisa membantu:\n' +
    '• Cari kosakata — contoh: `cari konnichiwa`, `apa arti terima kasih?`\n' +
    '• Info jumlah kata — coba: `ada berapa kosakata?`\n' +
    '• Sapaan — `halo`, `selamat pagi`\n' +
    '• Navigasi — `buka kosakata`, `buka catatan`, `buka peta`'
  )
}

/** Ambil kata kunci pencarian dari pesan bebas. */
function extractQuery(text: string): string {
  const t = text.trim()
  const patterns = [
    /^(?:apa\s+arti(?:nya)?|arti(?:nya)?)\s+(.+?)\??$/i,
    /^(?:cari|carikan|terjemahkan?)\s+(.+?)\??$/i,
    /^["“](.+)["”]$/,
  ]
  for (const p of patterns) {
    const m = t.match(p)
    if (m) return m[1].trim()
  }
  return t
}

function suggestionChips(): string[] {
  return ['apa arti arigatou?', 'cari konnichiwa', 'ada berapa kosakata?', 'bantuan']
}


export function useChatAgent() {
  const messages = ref<ChatMessage[]>([])
  const typing = ref(false)
  const booted = ref(false)
  /** 'local' = agen aturan tanpa jaringan · 'ai' = model TokenHarbor via proxy /api/chat. */
  const mode = ref<ChatMode>('local')
  /** true bila server punya TOKENHARBOR_API_KEY (dicek via /api/chat/status). */
  const aiReady = ref(false)
  const aiModel = ref('')

  function persist(): void {
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(messages.value.slice(-60)))
    } catch { /* abaikan: mode privat dsb */ }
  }

  function push(role: ChatMessage['role'], text: string, extra: Partial<ChatMessage> = {}): ChatMessage {
    const msg: ChatMessage = { id: makeId(), role, text, time: nowTime(), ...extra }
    messages.value.push(msg)
    persist()
    return msg
  }

  function pushAgent(text: string, extra: Partial<ChatMessage> = {}): ChatMessage {
    return push('agent', text, extra)
  }

  function init(): void {
    if (booted.value) return
    booted.value = true
    try {
      const savedMode = localStorage.getItem(CHAT_MODE_KEY)
      if (savedMode === 'ai' || savedMode === 'local') mode.value = savedMode
    } catch { /* abaikan, pakai mode lokal */ }
    // Cek ketersediaan mode AI di server (tanpa kunci API ke browser).
    fetch(CHAT_STATUS_API)
      .then((r) => (r.ok ? (r.json() as Promise<ChatStatusResponse>) : null))
      .then((data) => {
        if (!data) return
        aiReady.value = Boolean(data.ai)
        aiModel.value = String(data.model ?? '')
        if (!aiReady.value && mode.value === 'ai') {
          mode.value = 'local'
          persistMode()
        }
      })
      .catch(() => { /* server mati → tetap mode lokal */ })
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]')
      if (Array.isArray(raw) && raw.length > 0) {
        messages.value = raw.filter(
          (m): m is ChatMessage => Boolean(m && (m as ChatMessage).role && (m as ChatMessage).text),
        )
        return
      }
    } catch { /* abaikan, pakai sapaan awal */ }
    pushAgent(greeting())
  }

  function persistMode(): void {
    try {
      localStorage.setItem(CHAT_MODE_KEY, mode.value)
    } catch { /* abaikan: mode privat dsb */ }
  }

  /** Ganti mode; mode 'ai' butuh server terkonfigurasi, kalau tidak ditolak. */
  function setMode(next: ChatMode): void {
    if (next !== 'ai' && next !== 'local') return
    if (next === 'ai' && !aiReady.value) {
      pushAgent(
        'Mode AI belum aktif — server belum punya kunci API. ' +
          'Set env `TOKENHARBOR_API_KEY` lalu restart server, atau tetap pakai mode Lokal.',
      )
      return
    }
    mode.value = next
    persistMode()
    pushAgent(
      next === 'ai'
        ? `Mode AI aktif${aiModel.value ? ` (${aiModel.value})` : ''} — saya menjawab memakai model online.`
        : 'Mode Lokal aktif — saya menjawab dari aturan + daftar kosakatamu, tanpa jaringan AI.',
    )
  }

  function clear(): void {
    messages.value = []
    try {
      localStorage.removeItem(CHAT_KEY)
    } catch { /* abaikan */ }
    pushAgent(greeting())
  }

  /** Aturan lokal tanpa jaringan. Kembalikan string jawaban atau null. */
  function localAnswer(text: string): string | null {
    const t = text.trim().toLowerCase()
    if (!t) return null
    if (/^(halo|hai|hei|hi|hello|konnichiwa|konbanwa|ohayo)/.test(t)) {
      return 'Halo juga! Mau cari kosakata apa hari ini? Coba mis. `apa arti ohayou?`'
    }
    if (/selamat (pagi|siang|sore|malam)|^(pagi|siang|sore|malam)\b/.test(t)) {
      return 'Selamat belajar! Mau cari kosakata apa hari ini?'
    }
    if (/\b(bantuan|help|tolong|bisa apa|menu|perintah)\b/.test(t)) return helpText()
    if (/terima kasih|makasih|arigatou|thanks|thank/.test(t)) {
      return 'Sama-sama! Senang bisa membantu. Ada kata lain yang ingin dicari?'
    }
    if (/^(bye|dadah|selamat tinggal|sayonara|sayounara)\b/.test(t)) {
      return 'Sampai jumpa! Jangan lupa latihan 5 menit besok ya.'
    }
    return null
  }

  function navRoute(text: string): string | null {
    const m = text.trim().toLowerCase().match(
      /^buka\s+(kosakata|catatan|peta|chat|beranda|home|faq|kontak|dasar)/,
    )
    if (!m) return null
    const map: Record<string, string> = {
      kosakata: '/kosakata',
      catatan: '/catatan',
      peta: '/peta',
      chat: '/chat',
      beranda: '/',
      home: '/',
      faq: '/?panel=3',
      kontak: '/?panel=4',
      dasar: '/?panel=1',
    }
    return map[m[1]] ?? null
  }

  async function askVocab(query: string, signal: AbortSignal): Promise<{ total: number; items: VocabItem[] }> {
    const res = await fetch(`${VOCAB_API}?q=${encodeURIComponent(query)}`, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as Partial<VocabListResponse>
    return { total: data.total ?? 0, items: Array.isArray(data.items) ? data.items : [] }
  }

  /** Tanya model AI via proxy backend (kunci API tetap di server). */
  async function askAi(): Promise<string> {
    const history = messages.value
      .filter((m) => m && (m.role === 'user' || m.role === 'agent') && m.text)
      .slice(-20)
      .map((m) => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.text }))
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 40000)
    try {
      const res = await fetch(CHAT_API, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; reply?: unknown }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      return String(data.reply ?? '').trim()
    } finally {
      clearTimeout(timer)
    }
  }

  async function send(rawText: string): Promise<string | null> {
    const text = String(rawText ?? '').trim()
    if (!text || typing.value) return null
    push('user', text)
    await nextTick()

    // 1) Navigasi halaman (berlaku di semua mode).
    const route = navRoute(text)
    if (route) {
      pushAgent(`Membuka halaman ${route} — klik tautan di bawah untuk berpindah.`, { link: route })
      return route
    }

    // 2) Mode AI: teruskan seluruh riwayat ke model online.
    if (mode.value === 'ai') {
      typing.value = true
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 40000)
      try {
        const reply = await askAi()
        if (!reply) {
          pushAgent('Model AI mengembalikan jawaban kosong. Coba kirim ulang pertanyaanmu.')
        } else {
          pushAgent(reply, { via: 'ai' })
        }
      } catch (err) {
        const timeout = (err as Error)?.name === 'AbortError'
        pushAgent(
          timeout
            ? 'Model AI tidak merespons dalam 40 detik. Coba lagi, atau pindah ke mode Lokal.'
            : `Mode AI gagal: ${(err as Error).message || err}. Coba lagi, atau pindah ke mode Lokal.`,
        )
      } finally {
        clearTimeout(timer)
        typing.value = false
      }
      return null
    }

    // 3) Aturan lokal tanpa jaringan.
    const local = localAnswer(text)
    if (local) {
      typing.value = true
      await new Promise((r) => setTimeout(r, 350))
      typing.value = false
      pushAgent(local)
      return null
    }

    // 4) Jumlah kosakata.
    if (/berapa.*kosakata|jumlah.*(kata|kosakata)|total.*(kata|kosakata)/i.test(text)) {
      typing.value = true
      try {
        const res = await fetch(`${VOCAB_API}?limit=1`)
        const data = (await res.json()) as Partial<VocabListResponse>
        pushAgent(`Saat ini ada **${data.total ?? 0} kosakata** tersimpan. Mau saya carikan salah satunya?`)
      } catch {
        pushAgent('Maaf, saya tidak bisa menghitung kosakata sekarang — server tidak merespons.')
      } finally {
        typing.value = false
      }
      return null
    }

    // 5) Pencarian kosakata via API.
    const query = extractQuery(text)
    typing.value = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      const { total, items } = await askVocab(query, controller.signal)
      if (total === 0) {
        pushAgent('Saya tidak menemukan kata tersebut di daftar kosakata. Coba kata lain, mis. konnichiwa atau terima kasih.')
      } else {
        const top = items.slice(0, 5)
        const lines = top.map((it) => `• **${it.jp}** (${it.romaji}) — ${it.arti}`)
        const more = total > top.length ? `\n…dan ${total - top.length} hasil lain.` : ''
        pushAgent(`Menemukan **${total} hasil** untuk kata tersebut:\n${lines.join('\n')}${more}`, {
          results: top,
          total,
        })
      }
    } catch {
      pushAgent('Maaf, pencarian gagal — server tidak merespons. Coba lagi sebentar lagi ya.')
    } finally {
      clearTimeout(timer)
      typing.value = false
    }
    return null
  }

  return { messages, typing, mode, aiReady, aiModel, setMode, init, send, clear, suggestionChips }
}
