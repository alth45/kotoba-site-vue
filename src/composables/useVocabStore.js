import { ref } from 'vue'

/**
 * Lapisan API data kosakata.
 * - Halaman kelola (/kosakata) memakai useVocabPages.js → lazy + cache.
 * - Panel beranda memakai preview 10 baris pertama.
 * Sumber kebenaran: file data/vocab.json via server/index.js.
 */

const PREVIEW_LIMIT = 10

/** Preview untuk panel beranda. */
const previewItems = ref([])
const previewTotal = ref(0)
const previewLoading = ref(false)
const previewError = ref(null)

/** Helper request JSON bersama — throw Error dengan pesan dari server. */
export async function vocabRequest(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `Permintaan gagal (HTTP ${res.status}).`
    try {
      const body = await res.json()
      if (body && body.error) message = body.error
    } catch {
      // Abaikan body non-JSON.
    }
    throw new Error(message)
  }
  return res.json()
}

/**
 * Ambil sebagian data: GET /api/vocab?offset=&limit=
 * → { total, offset, items }.
 */
export function fetchVocabRange(offset, limit) {
  const params = new URLSearchParams({ offset: String(offset) })
  if (limit != null) params.set('limit', String(limit))
  return vocabRequest(`/api/vocab?${params.toString()}`)
}

/** Pencarian: GET /api/vocab?q=… → { total, offset, items(+index) }. */
export function searchVocab(q) {
  const params = new URLSearchParams({ q })
  return vocabRequest(`/api/vocab?${params.toString()}`)
}

export function useVocabStore() {
  /** Muat preview 10 baris pertama untuk panel beranda. */
  async function loadPreview() {
    previewLoading.value = true
    previewError.value = null
    try {
      const data = await fetchVocabRange(0, PREVIEW_LIMIT)
      previewItems.value = data.items
      previewTotal.value = data.total
    } catch (e) {
      previewError.value = e.message
    } finally {
      previewLoading.value = false
    }
  }

  /** Tambah → server membalas { item, total }. */
  function addVocab(entry) {
    return vocabRequest('/api/vocab', {
      method: 'POST',
      body: JSON.stringify(entry),
    })
  }

  /** Ubah → server membalas objek item terbaru. */
  function updateVocab(id, entry) {
    return vocabRequest(`/api/vocab/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    })
  }

  /** Hapus → server membalas { ok, total, index }. */
  function removeVocab(id) {
    return vocabRequest(`/api/vocab/${id}`, { method: 'DELETE' })
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
