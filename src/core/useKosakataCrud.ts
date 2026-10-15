/**
 * core/useKosakataCrud.ts
 * Composable CRUD kosakata untuk halaman KosakataPage.
 * Panggilan API tetap memakai useVocabStore & useVocabPages (composables utama),
 * sehingga NotePage/KosakataPage cukup memanggil fungsi utamanya saja.
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { VocabItem } from '../types.ts'
import { useVocabStore } from '../composables/useVocabStore.ts'
import { useVocabPages } from '../composables/useVocabPages.ts'
import { useConfirm } from '../composables/useConfirm.ts'
import { buildKategoriOptions, pageWindow } from './vocabPagination.ts'

export function useKosakataCrud() {
  const { addVocab, updateVocab, removeVocab } = useVocabStore()
  const {
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
  } = useVocabPages()
  const { confirmDialog } = useConfirm()

  /** Error operasi tambah/ubah/hapus. */
  const errorMsg = ref('')
  /** True selama permintaan tambah/ubah sedang berjalan. */
  const saving = ref(false)

  /* ---------- Pencarian (popup) ---------- */
  const searchOpen = ref(false)
  /** Baris yang disorot sementara setelah loncat dari hasil pencarian. */
  const highlightId = ref<number | null>(null)
  let highlightTimer: number | undefined

  function onSearchShortcut(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault()
      searchOpen.value = !searchOpen.value
    }
  }

  function onSearchSelect(item: VocabItem) {
    const targetPage = Math.floor(item.index / PER_PAGE) + 1
    highlightId.value = item.id
    if (highlightTimer) window.clearTimeout(highlightTimer)
    highlightTimer = window.setTimeout(() => {
      highlightId.value = null
    }, 2600)
    goToPage(targetPage)
  }

  // Muat bertahap: 20 item pertama (halaman 1 & 2), lalu sesuai kebutuhan.
  onMounted(() => {
    init()
    window.addEventListener('keydown', onSearchShortcut)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onSearchShortcut)
    if (highlightTimer) window.clearTimeout(highlightTimer)
  })

  /* ---------- Tambah ---------- */
  const showForm = ref(false)
  const form = reactive({ jp: '', romaji: '', arti: '', kategori: 'Salam' })

  const formValid = computed(
    () => form.jp.trim() !== '' && form.romaji.trim() !== '' && form.arti.trim() !== '',
  )

  function resetForm() {
    form.jp = ''
    form.romaji = ''
    form.arti = ''
    form.kategori = 'Salam'
  }

  async function submitAdd() {
    if (!formValid.value || saving.value) return
    saving.value = true
    errorMsg.value = ''
    try {
      const res = await addVocab({
        jp: form.jp.trim(),
        romaji: form.romaji.trim(),
        arti: form.arti.trim(),
        kategori: form.kategori,
      })
      // Lompat ke halaman terakhir (berisi item baru) + segarkan cache di sana.
      applyAdded(res.total)
      resetForm()
      await goToPage(pageCount.value)
    } catch (e) {
      errorMsg.value = (e as Error).message
    } finally {
      saving.value = false
    }
  }

  /* ---------- Edit (inline per baris) ---------- */
  const editingId = ref<number | null>(null)
  const draft = reactive({ jp: '', romaji: '', arti: '', kategori: 'Dasar' })

  const draftValid = computed(
    () => draft.jp.trim() !== '' && draft.romaji.trim() !== '' && draft.arti.trim() !== '',
  )

  function startEdit(item: VocabItem) {
    editingId.value = item.id
    draft.jp = item.jp
    draft.romaji = item.romaji
    draft.arti = item.arti
    draft.kategori = item.kategori
  }

  function cancelEdit() {
    editingId.value = null
  }

  async function saveEdit() {
    if (!draftValid.value || saving.value) return
    saving.value = true
    errorMsg.value = ''
    if (editingId.value == null) return
    try {
      const updated = await updateVocab(editingId.value, {
        jp: draft.jp.trim(),
        romaji: draft.romaji.trim(),
        arti: draft.arti.trim(),
        kategori: draft.kategori,
      })
      // Posisi tidak bergeser → patch langsung di semua halaman cache.
      patchCached(updated)
      editingId.value = null
    } catch (e) {
      errorMsg.value = (e as Error).message
    } finally {
      saving.value = false
    }
  }

  /* ---------- Hapus ---------- */
  async function onDelete(item: VocabItem) {
    const ok = await confirmDialog({
      title: 'Hapus kosakata?',
      message: `Kata "${item.jp}" (${item.romaji}) akan dihapus dari daftar. Tindakan ini tidak bisa dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      danger: true,
    })
    if (!ok) return
    errorMsg.value = ''
    try {
      const res = await removeVocab(item.id)
      // Offset setelah posisi terhapus bergeser → buang cache kotor,
      // lalu muat ulang halaman aktif (hit = instan, miss = fetch).
      applyRemoved(res.total, res.index)
      if (editingId.value === item.id) editingId.value = null
      await goToPage(effectivePage.value)
    } catch (e) {
      errorMsg.value = (e as Error).message
    }
  }

  /* ---------- Opsi kategori (termasuk kategori buatan pengguna) ---------- */
  const kategoriOptions = computed(() =>
    buildKategoriOptions(currentItems.value, draft.kategori, form.kategori),
  )

  /* ---------- Kontrol halaman (logika ada di useVocabPages) ---------- */
  function setPage(p: number) {
    return goToPage(p)
  }

  /** Nomor halaman yang ditampilkan (dengan "…" bila terlalu banyak). */
  const visiblePages = computed(() => pageWindow(pageCount.value, effectivePage.value))

  return {
    // pages/store
    PER_PAGE,
    effectivePage,
    total,
    pageCount,
    currentItems,
    rangeStart,
    rangeEnd,
    cachedPages,
    initializing,
    isLoading,
    loadError,
    goToPage,
    prevPage,
    nextPage,
    // ui
    errorMsg,
    saving,
    searchOpen,
    highlightId,
    onSearchSelect,
    // tambah
    showForm,
    form,
    formValid,
    submitAdd,
    // edit
    editingId,
    draft,
    draftValid,
    startEdit,
    cancelEdit,
    saveEdit,
    // hapus
    onDelete,
    // kategori & pagination
    kategoriOptions,
    setPage,
    visiblePages,
  }
}
