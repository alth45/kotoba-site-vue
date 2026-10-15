import { computed, reactive, ref } from 'vue'
import { fetchVocabRange } from './useVocabStore.ts'
import type { VocabItem } from '../types.ts'

/**
 * Lazy loading + cache untuk halaman kelola (/kosakata).
 *
 * Skema cache (sesuai rancangan):
 * - Muat awal HANYA 20 item pertama → cache halaman 1 & 2.
 * - Klik halaman yang belum ada di cache → fetch halaman itu saja.
 * - Cache maksimum 3 halaman; menambah halaman baru membuang
 *   halaman paling lama (LRU). Contoh:
 *     [1,2] → buka 3 → [1,2,3] → buka 4 → [2,3,4] → buka 5 → [3,4,5]
 * - Klik halaman yang tersimpan di cache → tampil instan, lalu cache
 *   dipangkas ke jendela {p-1, p, p+1}. Contoh:
 *     dari [3,4,5] kembali ke 3 → [3,4] (halaman 5 dibuang).
 */

export const PER_PAGE = 10
const FIRST_BATCH = 20 // muat awal: halaman 1 + 2
const MAX_CACHED_PAGES = 3

const currentPage = ref(1)
const total = ref(0)
const cache = reactive(new Map<number, VocabItem[]>()) // nomor halaman → item[]
const pendingPages = reactive(new Set<number>())
const loadError = ref<string | null>(null)
const initializing = ref(false)
let initialized = false

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PER_PAGE)))
const effectivePage = computed(() => Math.min(Math.max(currentPage.value, 1), pageCount.value))
const currentItems = computed(() => cache.get(effectivePage.value) ?? [])
const rangeStart = computed(() =>
  total.value === 0 ? 0 : (effectivePage.value - 1) * PER_PAGE + 1,
)
const rangeEnd = computed(() => Math.min(effectivePage.value * PER_PAGE, total.value))
const cachedPages = computed(() => [...cache.keys()].sort((a, b) => a - b))
const isLoading = computed(() => pendingPages.has(effectivePage.value))

/** Refresh urutan LRU: halaman disentuh jadi yang paling baru. */
function touchPage(p: number): void {
  const arr = cache.get(p)
  if (arr) {
    cache.delete(p)
    cache.set(p, arr)
  }
}

/** Setelah hit: buang halaman di luar jendela {p-1, p, p+1}. */
function pruneWindow(p: number): void {
  for (const key of [...cache.keys()]) {
    if (key < p - 1 || key > p + 1) cache.delete(key)
  }
}

/** Lewati kapasitas: buang halaman paling lama (bukan halaman tujuan). */
function evictOverflow(keep: number): void {
  while (cache.size > MAX_CACHED_PAGES) {
    for (const key of cache.keys()) {
      if (key !== keep) {
        cache.delete(key)
        break
      }
    }
  }
}

async function loadPage(target: number): Promise<void> {
  pendingPages.add(target)
  loadError.value = null
  try {
    const data = await fetchVocabRange((target - 1) * PER_PAGE, PER_PAGE)
    total.value = data.total
    cache.set(target, data.items)
    evictOverflow(target)
  } catch (e) {
    loadError.value = (e as Error).message
  } finally {
    pendingPages.delete(target)
  }
}

export function useVocabPages() {
  /** Muat 20 item pertama (halaman 1 & 2) — idempoten. */
  async function init(): Promise<void> {
    if (initialized) return
    initializing.value = true
    loadError.value = null
    try {
      const data = await fetchVocabRange(0, FIRST_BATCH)
      total.value = data.total
      cache.set(1, data.items.slice(0, PER_PAGE))
      const second = data.items.slice(PER_PAGE, FIRST_BATCH)
      if (second.length > 0) cache.set(2, second)
      initialized = true
    } catch (e) {
      loadError.value = (e as Error).message
    } finally {
      initializing.value = false
    }
  }

  /** Ke halaman p: instan bila ada di cache, fetch bila tidak. */
  async function goToPage(p: number): Promise<void> {
    const target = Math.min(Math.max(p, 1), pageCount.value)
    currentPage.value = target
    if (cache.has(target)) {
      pruneWindow(target)
      touchPage(target)
      loadError.value = null
      return
    }
    await loadPage(target)
  }

  function prevPage(): Promise<void> {
    return goToPage(effectivePage.value - 1)
  }

  function nextPage(): Promise<void> {
    return goToPage(effectivePage.value + 1)
  }

  /** Setelah tambah: total baru + buang cache halaman terakhir (berisi item baru). */
  function applyAdded(newTotal: number): void {
    total.value = newTotal
    cache.delete(Math.max(1, Math.ceil(newTotal / PER_PAGE)))
  }

  /** Setelah hapus: total baru + buang cache halaman posisi terhapus ke bawah (offset geser). */
  function applyRemoved(newTotal: number, removedIndex: number): void {
    total.value = newTotal
    const firstDirty = Math.floor(removedIndex / PER_PAGE) + 1
    for (const key of [...cache.keys()]) {
      if (key >= firstDirty) cache.delete(key)
    }
  }

  /** Setelah ubah: patch item di semua halaman cache (posisi tidak bergeser). */
  function patchCached(item: VocabItem): void {
    for (const arr of cache.values()) {
      const i = arr.findIndex((x) => x.id === item.id)
      if (i !== -1) arr[i] = item
    }
  }

  return {
    PER_PAGE,
    currentPage: effectivePage,
    total,
    pageCount,
    currentItems,
    rangeStart,
    rangeEnd,
    cachedPages,
    initializing,
    isLoading,
    loadError,
    init,
    goToPage,
    prevPage,
    nextPage,
    applyAdded,
    applyRemoved,
    patchCached,
  }
}
