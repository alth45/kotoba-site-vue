/** Endpoint chat AI: GET /api/chat/status dan POST /api/chat (proxy TokenHarbor). */
import type { IncomingMessage, ServerResponse } from 'node:http'
import OpenAI from 'openai'
import { CHAT_API_KEY, CHAT_BASE_URL, CHAT_MODEL, CHAT_TIMEOUT_MS } from '../config'
import { sendJson } from '../lib/http'
import { readBody } from '../lib/body'

/**
 * Mode 'ai' memakai model eksternal TokenHarbor (kompatibel OpenAI SDK).
 * Penempatan kode: SDK `openai` hanya dipakai di modul ini (proxy server),
 * kunci API TIDAK PERNAH dikirim ke browser — frontend hanya memanggil
 * proxy POST /api/chat dan GET /api/chat/status.
 */
let chatClient: OpenAI | null = null
function getChatClient() {
  if (!CHAT_API_KEY) return null
  if (!chatClient) {
    chatClient = new OpenAI({
      apiKey: CHAT_API_KEY,
      baseURL: CHAT_BASE_URL,
    })
  }
  return chatClient
}

export async function handleChat(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  if (url.pathname === '/api/chat/status' && req.method === 'GET') {
    sendJson(res, 200, {
      ai: Boolean(CHAT_API_KEY),
      model: CHAT_MODEL,
      hint: CHAT_API_KEY
        ? ''
        : 'Set env TOKENHARBOR_API_KEY sebelum menjalankan server untuk mengaktifkan mode AI.',
    })
    return true
  }
  if (url.pathname !== '/api/chat') return false
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
    return true
  }
  if (!CHAT_API_KEY) {
    sendJson(res, 503, {
      error: 'Mode AI belum dikonfigurasi. Set env TOKENHARBOR_API_KEY lalu restart server.',
    })
    return true
  }
  let history: Array<{ role?: unknown; content?: unknown }> = []
  try {
    const body = await readBody(req)
    if (Array.isArray(body?.messages)) history = body.messages as typeof history
  } catch {
    sendJson(res, 400, { error: 'Body JSON tidak valid.' })
    return true
  }
  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-20)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: String(m.content ?? '').slice(0, 4000) }))
  if (messages.length === 0 || !messages.some((m) => m.role === 'user')) {
    sendJson(res, 400, { error: 'Kirim minimal satu pesan user.' })
    return true
  }
  messages.unshift({
    role: 'system',
    content:
      'Kamu Koto, asisten belajar bahasa Jepang yang ramah. Jawab ringkas dalam Bahasa Indonesia, ' +
      'sertakan contoh kalimat Jepang (kanji + romaji + arti) bila relevan.',
  })
  // Panggil model via SDK OpenAI (baseURL TokenHarbor).
  try {
    const client = getChatClient()!
    const completion = await client.chat.completions.create(
      {
        model: CHAT_MODEL,
        messages,
      },
      { timeout: CHAT_TIMEOUT_MS },
    )
    const reply = completion.choices?.[0]?.message?.content?.trim() ?? ''
    if (!reply) {
      sendJson(res, 502, { error: 'Model AI mengembalikan jawaban kosong.' })
      return true
    }
    sendJson(res, 200, { reply, model: completion.model ?? CHAT_MODEL })
    return true
  } catch (err) {
    const e = err as { name?: string; code?: string; message?: string }
    const timeout =
      e?.name === 'AbortError' || e?.code === 'ETIMEDOUT' || /timeout/i.test(e?.message ?? '')
    sendJson(res, timeout ? 504 : 502, {
      error: timeout
        ? 'Model AI tidak merespons dalam 30 detik. Coba lagi.'
        : `Gagal menghubungi model AI: ${(err as Error).message || err}`,
    })
    return true
  }
}
