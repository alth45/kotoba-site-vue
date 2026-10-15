/**
 * core/useNoteChat.ts
 * Composable chat cepat mengambang pada NotePage (FAB geser + kotak chat).
 * Logika menjawab TIDAK diduplikasi di sini: semuanya memakai useChatAgent
 * (composable yang sama dengan halaman /chat), sehingga riwayat & mode
 * (lokal/AI) tetap tersinkron.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useChatAgent } from '../composables/useChatAgent.ts'
import type { ChatMode } from '../types.ts'

const CHAT_UI_KEY = 'kotoba-note-chat-ui'

export function useNoteChat() {
  const {
    messages: chatMsgs,
    typing: chatTyping,
    mode: chatMode,
    aiReady,
    setMode: chatSetMode,
    init: chatInit,
    send: chatSend,
  } = useChatAgent()

  function onChatModeChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value
    if (v === 'ai' || v === 'local') chatSetMode(v as ChatMode)
  }

  const chatOpen = ref(false)
  const chatDraft = ref('')
  const chatBoxEl = ref<HTMLDivElement | null>(null)

  function chatScrollBottom(smooth = true): void {
    nextTick(() => {
      chatBoxEl.value?.scrollTo({
        top: chatBoxEl.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    })
  }

  async function onChatSend(text: string): Promise<void> {
    const t = text.trim()
    if (!t || chatTyping.value) return
    chatDraft.value = ''
    await chatSend(t) // navigasi ('/…') sengaja diabaikan — tetap menulis di Catatan
    chatScrollBottom()
  }

  watch([chatMsgs, chatTyping], () => { if (chatOpen.value) chatScrollBottom() }, { deep: true })

  function toggleChat(): void {
    chatOpen.value = !chatOpen.value
    persistChatUi()
    if (chatOpen.value) {
      chatInit()
      chatScrollBottom(false)
    }
  }

  /* ---- Tombol chat yang bisa digeser ke sembarang tempat ---- */
  interface FabPos { x: number; y: number }
  const fabPos = ref<FabPos | null>(null) // null → posisi default (kanan-bawah)
  const fabDragging = ref(false)
  const fabEl = ref<HTMLButtonElement | null>(null)
  let dragMoved = false
  let dragOffX = 0
  let dragOffY = 0

  function clampFab(p: FabPos): FabPos {
    const el = fabEl.value
    const w = el?.offsetWidth ?? 64
    const h = el?.offsetHeight ?? 64
    const maxX = Math.max(8, window.innerWidth - w - 8)
    const maxY = Math.max(8, window.innerHeight - h - 8)
    return { x: Math.min(Math.max(8, p.x), maxX), y: Math.min(Math.max(8, p.y), maxY) }
  }

  function persistChatUi(): void {
    try {
      localStorage.setItem(CHAT_UI_KEY, JSON.stringify({ open: chatOpen.value, pos: fabPos.value }))
    } catch { /* abaikan */ }
  }

  function onFabPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    const el = fabEl.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragOffX = e.clientX - rect.left
    dragOffY = e.clientY - rect.top
    dragMoved = false
    fabDragging.value = true
    el.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function onFabPointerMove(e: PointerEvent) {
    if (!fabDragging.value) return
    const next = clampFab({ x: e.clientX - dragOffX, y: e.clientY - dragOffY })
    // Anggap "geseran" bila bergerak > 5px dari titik awal klik
    const cur = fabPos.value
    if (cur && (Math.abs(cur.x - (e.clientX - dragOffX)) > 5 || Math.abs(cur.y - (e.clientY - dragOffY)) > 5)) {
      dragMoved = true
    } else if (!cur) {
      dragMoved = true
    }
    fabPos.value = next
  }

  function onFabPointerUp(e: PointerEvent) {
    const el = fabEl.value
    if (!fabDragging.value) return
    fabDragging.value = false
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    persistChatUi()
    // Klik (bukan geser) → buka/tutup kotak chat
    if (!dragMoved) toggleChat()
  }

  function resetFabPos(): void {
    fabPos.value = null
    persistChatUi()
  }

  function onWinResize() {
    if (fabPos.value) fabPos.value = clampFab(fabPos.value)
  }

  /** Muat preferensi posisi & status tombol chat */
  onMounted(() => {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(CHAT_UI_KEY) || 'null')
      if (raw && typeof raw === 'object') {
        const o = raw as { open?: unknown; pos?: unknown }
        if (o.pos && typeof o.pos === 'object') {
          const p = o.pos as { x?: unknown; y?: unknown }
          if (typeof p.x === 'number' && typeof p.y === 'number') fabPos.value = { x: p.x, y: p.y }
        }
        if (o.open === true) {
          chatOpen.value = true
          chatInit()
          nextTick(() => chatScrollBottom(false))
        }
      }
    } catch { /* abaikan */ }
    window.addEventListener('resize', onWinResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onWinResize)
  })

  return {
    chatMsgs,
    chatTyping,
    chatMode,
    aiReady,
    chatOpen,
    chatDraft,
    chatBoxEl,
    fabPos,
    fabDragging,
    fabEl,
    onChatModeChange,
    onChatSend,
    toggleChat,
    onFabPointerDown,
    onFabPointerMove,
    onFabPointerUp,
    resetFabPos,
  }
}
