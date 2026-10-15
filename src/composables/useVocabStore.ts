import { ref } from 'vue'
import type { VocabEntry, VocabItem, VocabListResponse } from '../types.ts'

/**
 * Lapisan API data kosakata.
 * - Halaman kelola (/kosakata) memakai useVocabPages.js → lazy + cache.
 * - Panel beranda memakai preview 10 baris pertama.
 * Sumber kebenaran: file data/vocab.json via server/index.js.
 */

const PREVIEW_LIMIT = 10

/** Preview untuk panel beranda. */
const previewItems = ref<VocabItem[]>([])
const previewTotal = ref(0)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)

/** Helper request JSON bersama — throw Error dengan pesan dari server. */
/** Opsi fetch tambahan selain header JSON default. */
interface VocabRequestOptions extends RequestInit {}

export async function vocabRequest<T = unknown>(path: string, options: VocabRequestOptions = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `Permintaan gagal (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { error?: string }
      if (body && body.error) message = body.error
    } catch {
      // Abaikan body non-JSON.
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

/**
 * Ambil sebagian data: GET /api/vocab?offset=&limit=
 * → { total, offset, items }.
 */
export function fetchVocabRange(offset: number, limit?: number): Promise<VocabListResponse> {
  const params = new URLSearchParams({ offset: String(offset) })
  if (limit != null) params.set('limit', String(limit))
  return vocabRequest(`/api/vocab?${params.toString()}`)
}

/** Pencarian: GET /api/vocab?q=… → { total, offset, items(+index) }. */
export function searchVocab(q: string): Promise<VocabListResponse> {
  const params = new URLSearchParams({ q })
  return vocabRequest(`/api/vocab?${params.toString()}`)
}

export function useVocabStore() {
  /** Muat preview 10 baris pertama untuk panel beranda. */
  async function loadPreview(): Promise<void> {
    previewLoading.value = true
    previewError.value = null
    try {
      const data = await fetchVocabRange(0, PREVIEW_LIMIT)
      previewItems.value = data.items
      previewTotal.value = data.total
    } catch (e) {
      previewError.value = (e as Error).message
    } finally {
      previewLoading.value = false
    }
  }

  /** Tambah → server membalas { item, total }. */
  function addVocab(entry: VocabEntry): Promise<{ item: VocabItem; total: number }> {
    return vocabRequest<{ item: VocabItem; total: number }>('/api/vocab', {
      method: 'POST',
      body: JSON.stringify(entry),
    })
  }

  /** Ubah → server membalas objek item terbaru. */
  function updateVocab(id: number, entry: VocabEntry): Promise<VocabItem> {
    return vocabRequest<VocabItem>(`/api/vocab/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    })
  }

  /** Hapus → server membalas { ok, total, index }. */
  function removeVocab(id: number): Promise<{ ok: boolean; total: number; index: number }> {
    return vocabRequest<{ ok: boolean; total: number; index: number }>(`/api/vocab/${id}`, { method: 'DELETE' })
  }

  return {
    previewItems,
    previewTotal,
    previewLoading,
    previewError,
    loadPreview,
    addVocab,
    updateVocab,
    removeVocab,
  }
}
