/**
 * core/useChatDraft.ts
 * State draf & auto-scroll kotak percakapan pada ChatPage.
 * Jawaban agen tetap milik useChatAgent (composables utama) — modul ini hanya
 * membungkus UI: kirim pesan, bersihkan draf, dan gulir ke bawah otomatis.
 */
import { nextTick, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { ChatMessage, ChatMode } from '../types.ts'

/** Bentuk hasil useChatAgent (composables utama) yang dibutuhkan modul ini. */
export interface ChatAgentApi {
  messages: Ref<ChatMessage[]>
  typing: Ref<boolean>
  mode: Ref<ChatMode>
  aiReady: Ref<boolean>
  aiModel: Ref<string>
  setMode: (m: ChatMode) => void
  init: () => void
  send: (text: string) => Promise<string | null>
  clear: () => void
  suggestionChips: () => string[]
}

export function useChatDraft(agent: ChatAgentApi) {
  const draft = ref('')
  const boxEl = ref<HTMLDivElement | null>(null)

  /** Gulir riwayat chat ke pesan paling baru. */
  function scrollBottom(smooth = true) {
    nextTick(() => {
      boxEl.value?.scrollTo({ top: boxEl.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    })
  }

  /** Kirim teks ke agen; kembalikan rute navigasi (bila ada) untuk dipakai caller. */
  async function onSend(text: string): Promise<string | null> {
    const route = await agent.send(text)
    draft.value = ''
    scrollBottom()
    return route
  }

  // Gulir otomatis setiap ada pesan / indikator mengetik baru.
  watch([agent.messages, agent.typing], () => scrollBottom(), { deep: true })

  return { draft, boxEl, scrollBottom, onSend }
}
