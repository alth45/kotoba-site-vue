/**
 * core/noteFormat.ts
 * Util murni (tanpa state) untuk rich-text editor NotePage:
 * manajemen seleksi, perintah format execCommand, dan operasi gambar.
 */
import { IMG_API, IMG_DEFAULT_WIDTH } from './noteOptions.ts'

/** Bookmark seleksi teks di dalam editor (agar tidak hilang saat klik toolbar). */
export interface SavedSelection {
  range: Range | null
}

/** Ambil Range aktif bila berada di dalam `host`. */
export function selectionInEditor(host: HTMLElement | null): Range | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !host) return null
  const range = sel.getRangeAt(0)
  return host.contains(range.commonAncestorContainer) ? range : null
}

/** Simpan seleksi aktif ke bookmark (bila ada di dalam editor). */
export function captureSelection(host: HTMLElement | null, saved: SavedSelection): void {
  const range = selectionInEditor(host)
  if (range) saved.range = range.cloneRange()
}

/** Kembalikan seleksi dari bookmark; true bila masih ada teks terblok. */
export function restoreSelection(saved: SavedSelection): boolean {
  if (!saved.range) return false
  const sel = window.getSelection()
  if (!sel) return false
  sel.removeAllRanges()
  sel.addRange(saved.range)
  return !sel.isCollapsed
}

/** Fokus editor + kembalikan seleksi; mengembalikan true bila ada teks terblok. */
export function prepareApply(editor: HTMLElement | null, saved: SavedSelection): boolean {
  if (!editor) return false
  editor.focus()
  return restoreSelection(saved)
}

/** Ganti semua font[size="7"] hasil execCommand dengan span berukuran px. */
export function replaceSize7FontTags(editor: HTMLElement | null, px: number): void {
  editor?.querySelectorAll<HTMLElement>('font[size="7"]').forEach((f) => {
    const span = document.createElement('span')
    span.style.fontSize = `${px}px`
    while (f.firstChild) span.appendChild(f.firstChild)
    f.replaceWith(span)
  })
}

/* ================================================================
   GAMBAR — unggah & sisip
   ================================================================ */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024
const IMAGE_TYPES = /^image\/(png|jpeg|gif|webp)$/i

/** Validasi file; mengembalikan pesan error (string) atau null bila valid. */
export function validateImageFile(file: File): string | null {
  if (!IMAGE_TYPES.test(file.type)) {
    return 'Format tidak didukung. Gunakan PNG, JPG, GIF, atau WebP.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Ukuran gambar melebihi 3 MB.'
  }
  return null
}

/** Unggah file ke server; mengembalikan URL gambar. Lempar Error bila gagal. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file, file.name)
  const res = await fetch(IMG_API, { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Gagal mengunggah gambar (HTTP ${res.status}).`)
  return data.url as string
}

/** Lebar efektif gambar: atribut width → bounding box → default. */
export function currentImgWidth(img: HTMLImageElement): number {
  const attr = Number(img.getAttribute('width'))
  if (Number.isFinite(attr) && attr > 0) return Math.round(attr)
  const w = Math.round(img.getBoundingClientRect().width)
  return w > 0 ? w : IMG_DEFAULT_WIDTH
}

/** Terapkan lebar baru ke elemen gambar (di-clamp 80–800 px). */
export function applyImgWidthTo(img: HTMLImageElement, px: number): number {
  const w = Math.min(800, Math.max(80, Math.round(px)))
  img.setAttribute('width', String(w))
  img.style.width = `${w}px`
  return w
}

/** Posisikan handle resize di sudut kanan-bawah gambar terpilih. */
export function positionResizeHandle(
  img: HTMLImageElement | null,
  handle: HTMLElement | null,
): void {
  const paper = img?.closest?.('.note-paper')
  if (!img || !handle || !paper) return
  const pr = paper.getBoundingClientRect()
  const r = img.getBoundingClientRect()
  handle.style.left = `${r.right - pr.left + paper.scrollLeft - 7}px`
  handle.style.top = `${r.bottom - pr.top + paper.scrollTop - 7}px`
}

/**
 * Sisipkan <img> di posisi kursor (atau di akhir editor).
 * Mengembalikan elemen gambar yang disisipkan, atau null bila editor kosong.
 */
export function insertImageAtCaret(
  editor: HTMLElement | null,
  url: string,
  saved: SavedSelection,
): HTMLImageElement | null {
  if (!editor) return null
  editor.focus()
  // Kembalikan kursor ke posisi terakhir bila ada.
  if (saved.range) {
    const sel = window.getSelection()
    sel?.removeAllRanges()
    try {
      sel?.addRange(saved.range)
    } catch { /* abaikan range basi */ }
  }
  const img = document.createElement('img')
  img.src = url
  img.alt = 'Gambar catatan'
  img.setAttribute('width', String(IMG_DEFAULT_WIDTH))
  img.className = 'note-img'
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const range = sel.getRangeAt(0)
    range.deleteContents()
    range.insertNode(img)
    // Baris baru setelah gambar agar bisa lanjut mengetik.
    const br = document.createElement('br')
    img.after(br)
    range.setStartAfter(br)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    saved.range = range.cloneRange()
  } else {
    const p = document.createElement('p')
    p.appendChild(img)
    editor.appendChild(p)
  }
  img.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  return img
}
