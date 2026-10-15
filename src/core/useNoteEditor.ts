/**
 * core/useNoteEditor.ts
 * Composable editor catatan: menggabungkan state UI + aksi format & gambar.
 * Fungsi murni (DOM/execCommand) diimpor dari ./noteFormat.ts — di sini hanya
 * orkestrasi reaktif, sehingga NotePage.vue cukup memanggil fungsi utamanya.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useNoteStore } from '../composables/useNoteStore.ts'
import {
  FONT_OPTIONS,
  IMG_DEFAULT_WIDTH,
  IMG_PRESETS,
} from './noteOptions.ts'
import {
  applyImgWidthTo,
  captureSelection,
  currentImgWidth,
  insertImageAtCaret as coreInsertImageAtCaret,
  positionResizeHandle as corePositionResizeHandle,
  prepareApply,
  replaceSize7FontTags,
  uploadImage,
  validateImageFile,
  type SavedSelection,
} from './noteFormat.ts'

export interface NoteEditorApi {
  /* store */
  content: Ref<string>
  loading: Ref<boolean>
  saving: Ref<boolean>
  saveError: Ref<string | null>
  lastSavedAt: Ref<Date | null>
  statusText: Ref<string>
  statusClass: ComputedRef<Record<string, boolean>>
  loadNote: () => Promise<void>
  scheduleSave: () => void

  /* editor DOM */
  editorEl: Ref<HTMLDivElement | null>
  charCount: Ref<number>
  onInput: () => void
  onSelectChange: () => void

  /* toolbar popover */
  openPop: Ref<'color' | 'mark' | null>
  togglePop: (name: 'color' | 'mark') => void
  onDocPointerDown: (e: PointerEvent) => void

  /* format */
  currentFont: Ref<string>
  currentSize: Ref<number>
  lastColor: Ref<string>
  lastMark: Ref<string>
  applyFontFamily: (value: string) => void
  applyFontSize: (px: number) => void
  applyColor: (hex: string) => void
  applyHighlight: (hex: string) => void
  undo: () => void

  /* gambar */
  imageInputEl: Ref<HTMLInputElement | null>
  uploadingImage: Ref<boolean>
  selectedImg: Ref<HTMLImageElement | null>
  selectedImgWidth: Ref<number>
  imgPresetLabel: Ref<string>
  resizeHandleEl: Ref<HTMLDivElement | null>
  triggerImagePick: () => void
  onImageFile: (e: Event) => Promise<void>
  onEditorClick: (e: MouseEvent) => void
  applyImgPreset: (width: number) => void
  applyImgWidth: (px: number) => void
  onResizeHandleDown: (e: PointerEvent) => void
  removeSelectedImg: () => void
}

export function useNoteEditor(): NoteEditorApi {
  const { content, loading, saving, saveError, lastSavedAt, loadNote, scheduleSave } =
    useNoteStore()

  /* ---------- State UI ---------- */
  const editorEl = ref<HTMLDivElement | null>(null)
  const charCount = ref(0)
  const openPop = ref<'color' | 'mark' | null>(null)
  const currentFont = ref(FONT_OPTIONS[0].value)
  const currentSize = ref(16)
  const lastColor = ref('#3c4046')
  const lastMark = ref('#ffe9a8')

  /* ---------- Gambar ---------- */
  const imageInputEl = ref<HTMLInputElement | null>(null)
  const uploadingImage = ref(false)
  const selectedImg = ref<HTMLImageElement | null>(null) // elemen <img> yang sedang dipilih
  const selectedImgWidth = ref(IMG_DEFAULT_WIDTH)
  const resizeHandleEl = ref<HTMLDivElement | null>(null)

  /** Posisikan handle resize di sudut kanan-bawah gambar terpilih. */
  function positionResizeHandle() {
    corePositionResizeHandle(selectedImg.value, resizeHandleEl.value)
  }

  watch([selectedImg, selectedImgWidth], async () => {
    if (!selectedImg.value) return
    await nextTick()
    positionResizeHandle()
  })

  /* Bookmark seleksi teks di dalam editor. */
  const saved: SavedSelection = { range: null }

  function onSelectChange() {
    captureSelection(editorEl.value, saved)
  }

  /* ---------- Sinkron konten & simpan ---------- */
  function syncContent() {
    if (!editorEl.value) return
    content.value = editorEl.value.innerHTML
    charCount.value = editorEl.value.innerText.length
  }

  function afterApply() {
    syncContent()
    scheduleSave()
  }

  /* ---------- Aksi format ---------- */
  function prepare() {
    return prepareApply(editorEl.value, saved)
  }

  function applyFontFamily(value: string) {
    currentFont.value = value
    if (!prepare()) return
    document.execCommand('fontName', false, value)
    afterApply()
  }

  function applyFontSize(px: number) {
    currentSize.value = px
    if (!prepare()) return
    // execCommand hanya mendukung skala 1-7 → trik: buat font size=7
    // lalu ganti tag-nya dengan span berukuran px yang kita inginkan.
    document.execCommand('fontSize', false, '7')
    replaceSize7FontTags(editorEl.value, px)
    afterApply()
  }

  function applyColor(hex: string) {
    lastColor.value = hex
    openPop.value = null
    if (!prepare()) return
    document.execCommand('foreColor', false, hex)
    afterApply()
  }

  function applyHighlight(hex: string) {
    lastMark.value = hex
    openPop.value = null
    if (!prepare()) return
    const ok = document.execCommand('hiliteColor', false, hex)
    if (!ok) document.execCommand('backColor', false, hex)
    afterApply()
  }

  function undo() {
    editorEl.value?.focus()
    document.execCommand('undo')
    afterApply()
  }

  /* ---------- Gambar: upload & sisip ---------- */
  function triggerImagePick() {
    imageInputEl.value?.click()
  }

  function markImgSelected(img: HTMLImageElement | null) {
    editorEl.value
      ?.querySelectorAll<HTMLImageElement>('img.is-selected')
      .forEach((el) => el.classList.remove('is-selected'))
    selectedImg.value = img ?? null
    if (img) {
      img.classList.add('is-selected')
      selectedImgWidth.value = currentImgWidth(img)
    }
  }

  const imgPresetLabel = computed(() => {
    const w = selectedImgWidth.value
    const hit = IMG_PRESETS.find((p) => Math.abs(p.width - w) <= 5)
    return hit ? hit.label : ''
  })

  async function onImageFile(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    const invalid = validateImageFile(file)
    if (invalid) {
      saveError.value = invalid
      return
    }
    uploadingImage.value = true
    try {
      const url = await uploadImage(file)
      insertImageAtCaret(url)
    } catch (err) {
      saveError.value = (err as Error).message || 'Gagal mengunggah gambar.'
    } finally {
      uploadingImage.value = false
    }
  }

  function insertImageAtCaret(url: string) {
    const img = coreInsertImageAtCaret(editorEl.value, url, saved)
    afterApply()
    if (img) markImgSelected(img)
  }

  /* ---------- Gambar: pilih, resize, hapus ---------- */
  function onEditorClick(e: MouseEvent) {
    const img = (e.target as HTMLElement | null)?.closest?.('img') as HTMLImageElement | null
    markImgSelected(img && editorEl.value?.contains(img) ? img : null)
    if (img) e.preventDefault()
  }

  function applyImgWidth(px: number) {
    const img = selectedImg.value
    if (!img) return
    selectedImgWidth.value = applyImgWidthTo(img, px)
    afterApply()
  }

  function applyImgPreset(width: number) {
    applyImgWidth(width)
  }

  let resizeDrag: { startX: number; startW: number } | null = null

  function onResizeHandleDown(e: PointerEvent) {
    const img = selectedImg.value
    if (!img) return
    e.preventDefault()
    e.stopPropagation()
    resizeDrag = { startX: e.clientX, startW: currentImgWidth(img) }
    window.addEventListener('pointermove', onResizeHandleMove)
    window.addEventListener('pointerup', onResizeHandleUp, { once: true })
  }

  function onResizeHandleMove(e: PointerEvent) {
    if (!resizeDrag) return
    applyImgWidth(resizeDrag.startW + (e.clientX - resizeDrag.startX))
  }

  function onResizeHandleUp() {
    resizeDrag = null
    window.removeEventListener('pointermove', onResizeHandleMove)
  }

  function removeSelectedImg() {
    const img = selectedImg.value
    if (!img) return
    img.remove()
    markImgSelected(null)
    afterApply()
    editorEl.value?.focus()
  }

  /* ---------- Popover palet ---------- */
  function togglePop(name: 'color' | 'mark') {
    openPop.value = openPop.value === name ? null : name
  }

  function onDocPointerDown(e: PointerEvent) {
    if (!(e.target as HTMLElement | null)?.closest?.('.tb-pop-wrap')) openPop.value = null
  }

  watch(openPop, (v) => {
    if (v) document.addEventListener('pointerdown', onDocPointerDown, true)
    else document.removeEventListener('pointerdown', onDocPointerDown, true)
  })

  /* ---------- Editor ---------- */
  function onInput() {
    syncContent()
    scheduleSave()
  }

  /* ---------- Status simpan ---------- */
  const statusText = computed(() => {
    if (loading.value) return 'Memuat…'
    if (saveError.value) return saveError.value
    if (saving.value) return 'Menyimpan…'
    if (lastSavedAt.value) {
      return `Tersimpan ${lastSavedAt.value.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    }
    return 'Siap — perubahan tersimpan otomatis'
  })

  const statusClass = computed(() => ({
    'is-saving': saving.value,
    'is-error': !!saveError.value,
  }))

  /* ---------- Lifecycle ---------- */
  onMounted(async () => {
    document.addEventListener('selectionchange', onSelectChange)
    await loadNote()
    if (editorEl.value) {
      editorEl.value.innerHTML = content.value || ''
      syncContent()
    }
    markImgSelected(null)
  })

  return {
    content, loading, saving, saveError, lastSavedAt,
    statusText, statusClass, loadNote, scheduleSave,
    editorEl, charCount, onInput, onSelectChange,
    openPop, togglePop, onDocPointerDown,
    currentFont, currentSize, lastColor, lastMark,
    applyFontFamily, applyFontSize, applyColor, applyHighlight, undo,
    imageInputEl, uploadingImage, selectedImg, selectedImgWidth, imgPresetLabel,
    resizeHandleEl, triggerImagePick, onImageFile, onEditorClick,
    applyImgPreset, applyImgWidth, onResizeHandleDown, removeSelectedImg,
  }
}
