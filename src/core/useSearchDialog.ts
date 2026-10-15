/**
 * core/useSearchDialog.ts
 * Logika popup pencarian kosakata (SearchDialog): debounce, anti-race,
 * navigasi keyboard, dan highlight bagian yang cocok.
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { VocabItem } from '../types.ts'
import { searchVocab } from '../composables/useVocabStore.ts'

export function useSearchDialog(
  open: { value: boolean },
  emitSelect: (item: VocabItem) => void,
) {
  const query = ref('')
  const results = ref<VocabItem[]>([])
  const totalMatches = ref(0)
  const searching = ref(false)
  const activeIndex = ref(0)
  const inputEl = ref<HTMLInputElement | null>(null)

  const DEBOUNCE_MS = 250
  let debounceTimer: number | undefined
  let seq = 0

  async function runSearch() {
    const q = query.value.trim()
    if (!q) {
      results.value = []
      totalMatches.value = 0
      activeIndex.value = 0
      return
    }
    searching.value = true
    const mySeq = ++seq
    try {
      const data = await searchVocab(q)
      if (mySeq !== seq) return // jawaban basi — abaikan
      results.value = data.items
      totalMatches.value = data.total
      activeIndex.value = 0
    } catch {
      if (mySeq !== seq) return
      results.value = []
      totalMatches.value = 0
    } finally {
      if (mySeq === seq) searching.value = false
    }
  }

  watch(query, () => {
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(runSearch, DEBOUNCE_MS)
  })

  watch(open, (visible) => {
    if (visible) {
      nextTick(() => inputEl.value?.focus())
      if (query.value.trim()) runSearch() // segarkan hasil lama saat dibuka lagi
    }
  })

  function choose(item: VocabItem) {
    emitSelect(item)
    open.value = false
  }

  function close() {
    open.value = false
  }

  function move(dir: number) {
    if (results.value.length === 0) return
    activeIndex.value =
      (activeIndex.value + dir + results.value.length) % results.value.length
    document
      .getElementById(`sd-row-${activeIndex.value}`)
      ?.scrollIntoView({ block: 'nearest' })
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results.value[activeIndex.value]
      if (item) choose(item)
    }
  }

  onBeforeUnmount(() => window.clearTimeout(debounceTimer))

  return {
    query,
    results,
    totalMatches,
    searching,
    activeIndex,
    inputEl,
    runSearch,
    choose,
    close,
    move,
    onKeydown,
  }
}

/** Pecah teks menjadi segmen (cocok/tidak) — highlight aman tanpa v-html. */
export function segments(text: string, q: string): Array<{ text: string; hit: boolean }> {
  const source = String(text ?? '')
  const needle = q.trim().toLowerCase()
  if (!needle) return [{ text: source, hit: false }]
  const lower = source.toLowerCase()
  const parts: Array<{ text: string; hit: boolean }> = []
  let i = 0
  while (i < source.length) {
    const j = lower.indexOf(needle, i)
    if (j === -1) {
      parts.push({ text: source.slice(i), hit: false })
      break
    }
    if (j > i) parts.push({ text: source.slice(i, j), hit: false })
    parts.push({ text: source.slice(j, j + needle.length), hit: true })
    i = j + needle.length
  }
  return parts
}
