<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useNoteStore } from '../composables/useNoteStore.ts'

const { content, loading, saving, saveError, lastSavedAt, loadNote, scheduleSave } =
  useNoteStore()

/* ---------- Opsi toolbar ---------- */
const FONT_OPTIONS = [
  { label: 'Standar', value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' },
  { label: 'Sans Jepang', value: '"Noto Sans JP", "Yu Gothic", "Meiryo", "Hiragino Sans", sans-serif' },
  { label: 'UD Digi Kyokasho', value: '"UD Digi Kyokasho N-R", "UD Digi Kyokasho NK-R", "BIZ UDGothic", "Yu Gothic", "Meiryo", sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Serif Jepang', value: '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif' },
  { label: 'Monospace', value: 'Consolas, "Courier New", monospace' },
  { label: 'Casual', value: '"Segoe Print", "Comic Sans MS", cursive' },
]
const SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48]

const TEXT_COLORS = [
  '#3c4046', '#828892', '#2c3e50', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#c0392b',
  '#d35400', '#f1c40f', '#7f9a8c', '#8494ac', '#c79a8b', '#c9b478', '#a396c0', '#a0434d',
]
const MARK_COLORS = [
  '#ffe9a8', '#ffd6d6', '#d7f0dd', '#d6e4ff', '#e8dcf7', '#ffd9ec', '#dff3f2', '#e6e6e6',
  '#f8c9a0', '#b8e0c8', '#cfe0f7', '#eadcf0',
]

/** Preset lebar gambar (px) — disesuaikan dengan lebar kertas 860px. */
const IMG_PRESETS = [
  { label: 'S', width: 200 },
  { label: 'M', width: 360 },
  { label: 'L', width: 560 },
  { label: 'Penuh', width: 760 },
]
const IMG_DEFAULT_WIDTH = 360
const IMG_API = '/api/note/image'

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
  const img = selectedImg.value
  const handle = resizeHandleEl.value
  const paper = img?.closest?.('.note-paper')
  if (!img || !handle || !paper) return
  const pr = paper.getBoundingClientRect()
  const r = img.getBoundingClientRect()
  handle.style.left = `${r.right - pr.left + paper.scrollLeft - 7}px`
  handle.style.top = `${r.bottom - pr.top + paper.scrollTop - 7}px`
}

watch([selectedImg, selectedImgWidth], async () => {
  if (!selectedImg.value) return
  await nextTick()
  positionResizeHandle()
})

/** Bookmark seleksi teks di dalam editor (agar tidak hilang saat klik toolbar). */
let savedRange: Range | null = null

function selectionInEditor() {
  const sel = window.getSelection()
  const host = editorEl.value
  if (!sel || sel.rangeCount === 0 || !host) return null
  const range = sel.getRangeAt(0)
  return host.contains(range.commonAncestorContainer) ? range : null
}

function onSelectChange() {
  const range = selectionInEditor()
  if (range) savedRange = range.cloneRange()
}

function restoreSelection() {
  if (!savedRange) return false
  const sel = window.getSelection()
  if (!sel) return false
  sel.removeAllRanges()
  sel.addRange(savedRange)
  return !sel.isCollapsed
}

/* ---------- Aksi format ---------- */
function prepareApply() {
  const editor = editorEl.value
  if (!editor) return false
  editor.focus()
  return restoreSelection()
}

function syncContent() {
  if (!editorEl.value) return
  content.value = editorEl.value.innerHTML
  charCount.value = editorEl.value.innerText.length
}

function afterApply() {
  syncContent()
  scheduleSave()
}

function applyFontFamily(value: string) {
  currentFont.value = value
  if (!prepareApply()) return
  document.execCommand('fontName', false, value)
  afterApply()
}

function applyFontSize(px: number) {
  currentSize.value = px
  if (!prepareApply()) return
  // execCommand hanya mendukung skala 1-7 → trik: buat font size=7
  // lalu ganti tag-nya dengan span berukuran px yang kita inginkan.
  document.execCommand('fontSize', false, '7')
  editorEl.value?.querySelectorAll<HTMLElement>('font[size="7"]').forEach((f) => {
    const span = document.createElement('span')
    span.style.fontSize = `${px}px`
    while (f.firstChild) span.appendChild(f.firstChild)
    f.replaceWith(span)
  })
  afterApply()
}

function applyColor(hex: string) {
  lastColor.value = hex
  openPop.value = null
  if (!prepareApply()) return
  document.execCommand('foreColor', false, hex)
  afterApply()
}

function applyHighlight(hex: string) {
  lastMark.value = hex
  openPop.value = null
  if (!prepareApply()) return
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

function currentImgWidth(img: HTMLImageElement) {
  const attr = Number(img.getAttribute('width'))
  if (Number.isFinite(attr) && attr > 0) return Math.round(attr)
  const w = Math.round(img.getBoundingClientRect().width)
  return w > 0 ? w : IMG_DEFAULT_WIDTH
}

function markImgSelected(img: HTMLImageElement | null) {
  editorEl.value?.querySelectorAll<HTMLImageElement>('img.is-selected').forEach((el) => el.classList.remove('is-selected'))
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
  if (!/^image\/(png|jpeg|gif|webp)$/i.test(file.type)) {
    saveError.value = 'Format tidak didukung. Gunakan PNG, JPG, GIF, atau WebP.'
    return
  }
  if (file.size > 3 * 1024 * 1024) {
    saveError.value = 'Ukuran gambar melebihi 3 MB.'
    return
  }
  uploadingImage.value = true
  try {
    const form = new FormData()
    form.append('file', file, file.name)
    const res = await fetch(IMG_API, { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Gagal mengunggah gambar (HTTP ${res.status}).`)
    insertImageAtCaret(data.url)
  } catch (err) {
    saveError.value = (err as Error).message || 'Gagal mengunggah gambar.'
  } finally {
    uploadingImage.value = false
  }
}

function insertImageAtCaret(url: string) {
  const editor = editorEl.value
  if (!editor) return
  editor.focus()
  // Kembalikan kursor ke posisi terakhir bila ada.
  if (savedRange) {
    const sel = window.getSelection()
    sel?.removeAllRanges()
    try {
      sel?.addRange(savedRange)
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
    savedRange = range.cloneRange()
  } else {
    const p = document.createElement('p')
    p.appendChild(img)
    editor.appendChild(p)
  }
  afterApply()
  markImgSelected(img)
  img.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
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
  const w = Math.min(800, Math.max(80, Math.round(px)))
  img.setAttribute('width', String(w))
  img.style.width = `${w}px`
  selectedImgWidth.value = w
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

/* ---------- Sidebar: render situs Jepang untuk meniru teks ---------- */
interface SitusJp {
  id: string
  name: string
  url: string
  category: string
}

/** Daftar situs yang disediakan (sumber: data ResourcePage). */
const SITES_JP: SitusJp[] = [
  { id: 'nhk-easy', name: 'NHK Web Easy', url: 'https://www3.nhk.or.jp/news/easy/', category: 'Berita' },
  { id: 'jisho', name: 'Jisho Dictionary', url: 'https://jisho.org/', category: 'Kamus' },
  { id: 'takoboto', name: 'Takoboto', url: 'https://takoboto.jp/', category: 'Kamus' },
  { id: 'wanikani', name: 'Wanikani', url: 'https://www.wanikani.com/', category: 'Belajar' },
  { id: 'bunpro', name: 'Bunpro', url: 'https://bunpro.jp/', category: 'Belajar' },
  { id: 'jlptsensei', name: 'JLPT Sensei', url: 'https://jlptsensei.com/', category: 'JLPT' },
  { id: 'jees', name: 'JEES — Soal JLPT', url: 'https://www.jees.or.jp/jlpt/sample.htm', category: 'JLPT' },
  { id: 'tofu', name: 'Tofugu', url: 'https://www.tofugu.com/', category: 'Belajar' },
  { id: 'animelon', name: 'Animelon', url: 'https://animelon.com/', category: 'Hiburan' },
  { id: 'satori', name: 'Satori Reader', url: 'https://www.satorireader.com/', category: 'Baca' },
  { id: 'jpdb', name: 'Jpdb.io', url: 'https://jpdb.io/', category: 'Kamus' },
  { id: 'nhk-japan', name: 'NHK Japan', url: 'https://www.nhk.or.jp/', category: 'Berita' },
  { id: 'asahi', name: 'Asahi Shimbun', url: 'https://www.asahi.com/', category: 'Berita' },
  { id: 'yomiuri', name: 'Yomiuri Online', url: 'https://www.yomiuri.co.jp/', category: 'Berita' },
  { id: 'mainichi', name: 'Mainichi Shimbun', url: 'https://mainichi.jp/', category: 'Berita' },
  { id: 'nihongo-pro', name: 'Nihongo-Pro', url: 'https://www.nihongo-pro.com/', category: 'Belajar' },
  { id: 'pod101', name: 'JapanesePod101', url: 'https://www.japanesepod101.com/', category: 'Belajar' },
  { id: 'ojad', name: 'OJAD — Prosodi', url: 'https://www.gavo.t.u-tokyo.ac.jp/ojad/', category: 'Kamus' },
  { id: 'kana', name: 'Hiragana/Katakana', url: 'https://www.learn-japanese-adventure.com/', category: 'Belajar' },
  { id: 'erin', name: "Erin's Challenge", url: 'https://www.erin.ne.jp/en/', category: 'Hiburan' },
]

const SIDEBAR_KEY = 'kotoba-note-sidebar'
const SITE_KEY = 'kotoba-note-site'

const sidebarOpen = ref(false)
const selectedSiteId = ref<string>('')
const iframeLoading = ref(false)

/** Ambil URL situs terpilih dari daftar */
const currentSiteUrl = computed(() => {
  const site = SITES_JP.find((s) => s.id === selectedSiteId.value)
  return site?.url ?? ''
})

const currentSiteName = computed(() => {
  const site = SITES_JP.find((s) => s.id === selectedSiteId.value)
  return site?.name ?? ''
})

/** Toggle sidebar & simpan preferensi ke localStorage */
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
  try {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen.value))
  } catch { /* abaikan */ }
}

/** Pilih situs → update iframe loading state */
function selectSite(id: string) {
  selectedSiteId.value = id
  iframeLoading.value = true
  try {
    localStorage.setItem(SITE_KEY, id)
  } catch { /* abaikan */ }
}

/** Muat preferensi saat mount */
onMounted(() => {
  try {
    const open = localStorage.getItem(SIDEBAR_KEY)
    if (open !== null) sidebarOpen.value = open === 'true'
    const site = localStorage.getItem(SITE_KEY)
    if (site && SITES_JP.some((s) => s.id === site)) {
      selectedSiteId.value = site
    } else {
      selectedSiteId.value = SITES_JP[0].id // default: NHK Web Easy
    }
  } catch { /* abaikan */ }
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

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectChange)
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})
</script>

<template>
  <main class="note-page">
    <header class="note-head">
      <div class="note-head-text">
        <RouterLink class="back" to="/">← Kembali ke beranda</RouterLink>
        <span class="eyebrow">Studio Menulis</span>
        <h1>Catatan</h1>
        <p class="lead">
          Ruang mengetik bebas — pilih font & ukuran huruf, blok kata lalu warnai
          atau sorot, dan sisipkan gambar yang ukurannya bisa diatur.
        </p>
      </div>
      <span class="save-pill" :class="statusClass">{{ statusText }}</span>
    </header>

    <div class="note-toolbar" role="toolbar" aria-label="Format catatan">
      <select
        class="tb-select"
        :value="currentFont"
        title="Jenis font"
        @change="applyFontFamily(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="f in FONT_OPTIONS" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>

      <select
        class="tb-select tb-size"
        :value="currentSize"
        title="Ukuran huruf"
        @change="applyFontSize(Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }} px</option>
      </select>

      <span class="tb-sep" aria-hidden="true"></span>

      <div class="tb-pop-wrap">
        <button
          class="tb-btn"
          type="button"
          title="Warnai kata yang diblok"
          @mousedown.prevent
          @click="togglePop('color')"
        >
          <span class="tb-letter" :style="{ color: lastColor }">A</span>
          <span class="tb-caret">▾</span>
        </button>
        <div v-if="openPop === 'color'" class="tb-pop">
          <p class="tb-pop-title">Warna teks</p>
          <div class="tb-swatches">
            <button
              v-for="c in TEXT_COLORS"
              :key="c"
              class="tb-swatch"
              :class="{ active: lastColor === c }"
              :style="{ background: c }"
              type="button"
              :title="c"
              @mousedown.prevent
              @click="applyColor(c)"
            ></button>
          </div>
        </div>
      </div>

      <div class="tb-pop-wrap">
        <button
          class="tb-btn"
          type="button"
          title="Sorot kata yang diblok"
          @mousedown.prevent
          @click="togglePop('mark')"
        >
          <span class="tb-marker" :style="{ background: lastMark }">▮</span>
          <span class="tb-caret">▾</span>
        </button>
        <div v-if="openPop === 'mark'" class="tb-pop">
          <p class="tb-pop-title">Sorotan (stabilo)</p>
          <div class="tb-swatches">
            <button
              v-for="c in MARK_COLORS"
              :key="c"
              class="tb-swatch"
              :class="{ active: lastMark === c }"
              :style="{ background: c }"
              type="button"
              :title="c"
              @mousedown.prevent
              @click="applyHighlight(c)"
            ></button>
          </div>
        </div>
      </div>

      <span class="tb-sep" aria-hidden="true"></span>

      <button class="tb-btn tb-text-btn" type="button" title="Urungkan" @mousedown.prevent @click="undo">
        ↶ Urungkan
      </button>

      <span class="tb-sep" aria-hidden="true"></span>

      <button
        class="tb-btn"
        type="button"
        title="Sisipkan gambar (PNG/JPG/GIF/WebP, maks 3 MB)"
        :disabled="uploadingImage"
        @mousedown.prevent
        @click="triggerImagePick"
      >
        {{ uploadingImage ? '⏳ Mengunggah…' : '🖼️ Gambar' }}
      </button>
      <input
        ref="imageInputEl"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        @change="onImageFile"
      />

      <span class="tb-spacer"></span>
      <span class="tb-count">{{ charCount }} karakter</span>

      <span class="tb-sep" aria-hidden="true"></span>

      <button
        class="tb-btn tb-text-btn"
        type="button"
        :class="{ active: sidebarOpen }"
        :title="sidebarOpen ? 'Sembunyikan sidebar situs' : 'Tampilkan sidebar situs'"
        :aria-pressed="sidebarOpen"
        @mousedown.prevent
        @click="toggleSidebar"
      >
        {{ sidebarOpen ? '📖 Sembunyikan Sidebar' : '📖 Tampilkan Sidebar' }}
      </button>
    </div>

    <!-- Panel gambar terpilih: preset ukuran + slider + hapus -->
    <div v-if="selectedImg" class="img-bar" role="toolbar" aria-label="Ukuran gambar">
      <span class="img-bar-label">🖼️ Gambar terpilih</span>
      <div class="img-sizes">
        <button
          v-for="p in IMG_PRESETS"
          :key="p.label"
          class="img-size-btn"
          :class="{ active: imgPresetLabel === p.label }"
          type="button"
          @mousedown.prevent
          @click="applyImgPreset(p.width)"
        >
          {{ p.label }}
        </button>
      </div>
      <label class="img-slider">
        <input
          type="range"
          min="80"
          max="800"
          step="10"
          :value="selectedImgWidth"
          @input="applyImgWidth(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="img-slider-val">{{ selectedImgWidth }} px</span>
      </label>
      <button class="tb-btn tb-text-btn danger" type="button" @mousedown.prevent @click="removeSelectedImg">
        🗑 Hapus gambar
      </button>
    </div>

    <div class="note-body">
      <div class="note-paper">
        <div
          ref="editorEl"
          class="note-editor"
          :class="{ 'is-loading': loading }"
          contenteditable="true"
          data-placeholder="Mulai mengetik di sini… Blok teks untuk memberi warna atau sorotan."
          spellcheck="true"
          role="textbox"
          aria-multiline="true"
          aria-label="Isi catatan"
          @input="onInput"
          @click="onEditorClick"
        ></div>
        <!-- Handle tarik untuk resize gambar terpilih (diposisikan via watcher) -->
        <span
          v-if="selectedImg"
          ref="resizeHandleEl"
          class="img-resize-handle"
          title="Tarik untuk mengubah ukuran"
          @pointerdown="onResizeHandleDown"
        ></span>
      </div>

      <!-- ===== Sidebar: render situs Jepang sebagai referensi menulis ===== -->
      <aside v-if="sidebarOpen" class="note-sidebar" aria-label="Sidebar referensi situs">
        <div class="ns-head">
          <span class="ns-title">📖 Referensi Situs</span>
          <button class="ns-close" type="button" title="Tutup sidebar" @click="toggleSidebar">✕</button>
        </div>

        <div class="ns-controls">
          <select
            class="ns-select tb-select"
            :value="selectedSiteId"
            title="Pilih situs yang ingin dirender"
            @change="selectSite(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="s in SITES_JP" :key="s.id" :value="s.id">
              {{ s.name }} — {{ s.category }}
            </option>
          </select>
          <a
            v-if="currentSiteUrl"
            class="ns-open"
            :href="currentSiteUrl"
            target="_blank"
            rel="noopener noreferrer"
            title="Buka di tab baru bila diblokir situs"
          >↗ Buka Tab</a>
        </div>

        <div class="ns-frame-wrap">
          <div v-if="iframeLoading" class="ns-loading">Memuat {{ currentSiteName }}…</div>
          <iframe
            v-if="currentSiteUrl"
            key="site-iframe"
            class="ns-iframe"
            :src="currentSiteUrl"
            :title="`Render ${currentSiteName}`"
            referrerpolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            loading="lazy"
            @load="iframeLoading = false"
          ></iframe>
        </div>

        <p class="ns-hint">
          💡 Tiru teks dari situs ini ke canvas catatan. Bila halaman tidak muncul,
          situs memblokir embed — gunakan tombol “Buka Tab”.
        </p>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.note-page{
  position:fixed;inset:0;
  display:flex;flex-direction:column;
  overflow-y:auto;
  padding:clamp(20px,4vh,40px) clamp(16px,3vw,36px) clamp(24px,4vh,44px);
  gap:14px;
  scrollbar-width:none;
}
.note-page::-webkit-scrollbar{display:none}

/* ---------- Header ---------- */
.note-head{
  display:flex;align-items:flex-end;justify-content:space-between;
  gap:18px;flex-wrap:wrap;
}
.note-head-text{max-width:620px}
.back{
  display:inline-flex;align-items:center;
  font-size:.8rem;color:var(--muted);margin-bottom:12px;
  transition:color .3s ease;
}
.back:hover{color:var(--text)}
.note-head h1{
  font-size:clamp(1.4rem,3vw,2.1rem);
  letter-spacing:-.03em;
  margin-bottom:8px;
}
.note-head .lead{font-size:.86rem;max-width:none}

.save-pill{
  display:inline-flex;align-items:center;gap:8px;
  font-size:.74rem;color:var(--muted);
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:999px;
  padding:7px 14px;
  margin-bottom:4px;
}
.save-pill::before{
  content:"";width:7px;height:7px;border-radius:50%;
  background:var(--accent);
}
.save-pill.is-saving::before{background:var(--accent-2);animation:pill-pulse 1s ease infinite}
.save-pill.is-error{border-color:var(--accent-3);color:var(--accent-3)}
.save-pill.is-error::before{background:var(--accent-3)}
@keyframes pill-pulse{
  0%,100%{opacity:.4}
  50%{opacity:1}
}

/* ---------- Toolbar ---------- */
.note-toolbar{
  position:sticky;top:0;z-index:20;
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  border:1px solid var(--border);
  background:var(--glass);
  backdrop-filter:blur(16px) saturate(140%);
  -webkit-backdrop-filter:blur(16px) saturate(140%);
  border-radius:14px;
  padding:8px 10px;
}
.tb-select{
  border:1px solid var(--border);
  background:var(--surface-2);
  color:var(--text);
  border-radius:10px;
  padding:7px 10px;
  font:inherit;
  font-size:.82rem;
  max-width:190px;
}
.tb-select:focus{outline:none;border-color:var(--border-strong)}
.tb-size{max-width:92px}
.tb-sep{width:1px;height:22px;background:var(--border);margin:0 2px}
.tb-spacer{flex:1}

.tb-btn{
  display:inline-flex;align-items:center;gap:5px;
  border:1px solid var(--border);
  background:var(--surface);
  color:var(--muted);
  border-radius:10px;
  padding:7px 11px;
  font-size:.82rem;
  cursor:pointer;
  transition:border-color .3s ease,color .3s ease,transform .3s var(--ease);
}
.tb-btn:hover{border-color:var(--border-strong);color:var(--text);transform:translateY(-1px)}
.tb-letter{font-weight:700;font-size:.95rem;line-height:1}
.tb-marker{font-size:.85rem;line-height:1;padding:0 1px;border-radius:3px}
.tb-caret{font-size:.62rem;opacity:.7}

.tb-count{font-size:.74rem;color:var(--muted);white-space:nowrap}

/* Popover palet warna */
.tb-pop-wrap{position:relative}
.tb-pop{
  position:absolute;
  top:calc(100% + 8px);
  left:0;
  z-index:40;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:14px;
  box-shadow:var(--shadow);
  padding:12px 12px 10px;
  min-width:210px;
}
.tb-pop-title{
  margin:0 0 8px;
  font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted);
}
.tb-swatches{display:grid;grid-template-columns:repeat(8,1fr);gap:7px}
.tb-swatch{
  width:22px;height:22px;
  border-radius:7px;
  border:1px solid var(--border-strong);
  cursor:pointer;
  padding:0;
  transition:transform .2s var(--ease),box-shadow .2s ease;
}
.tb-swatch:hover{transform:scale(1.15)}
.tb-swatch.active{box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--accent-2)}

/* ---------- Kertas editor ---------- */
.note-body{
  display:flex;align-items:stretch;gap:14px;
  width:100%;flex:1 1 auto;min-height:0;
}
.note-paper{
  flex:1 1 auto;min-width:0;
  width:100%;max-width:860px;
  margin:0 auto;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  padding:clamp(22px,4vw,44px);
  min-height:min(62vh,640px);
  transition:background-color .5s ease,border-color .5s ease;
}
.note-editor{
  min-height:52vh;
  font-size:16px;
  line-height:1.85;
  color:var(--text);
  outline:none;
  word-break:break-word;
  white-space:pre-wrap;
}
.note-editor:empty::before{
  content:attr(data-placeholder);
  color:var(--muted);
  opacity:.7;
  pointer-events:none;
}
.note-editor.is-loading{opacity:.5}

/* Gambar di dalam catatan */
.note-paper{position:relative}
.note-editor img.note-img,
.note-editor img{
  max-width:100%;
  height:auto;
  border-radius:12px;
  border:1px solid var(--border);
  margin:10px 0;
  cursor:pointer;
  transition:box-shadow .25s ease,border-color .25s ease;
}
.note-editor img.is-selected{
  outline:2px solid var(--accent-2);
  outline-offset:2px;
  border-color:var(--accent-2);
  box-shadow:var(--shadow);
}

/* Panel ukuran gambar */
.img-bar{
  width:100%;max-width:860px;margin:0 auto;
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;
  border:1px solid var(--border);
  background:var(--glass);
  backdrop-filter:blur(16px) saturate(140%);
  -webkit-backdrop-filter:blur(16px) saturate(140%);
  border-radius:14px;
  padding:8px 12px;
}
.img-bar-label{font-size:.78rem;color:var(--muted);white-space:nowrap}
.img-sizes{display:flex;gap:6px}
.img-size-btn{
  border:1px solid var(--border);
  background:var(--surface);
  color:var(--muted);
  border-radius:9px;
  padding:6px 12px;
  font-size:.78rem;
  cursor:pointer;
  transition:border-color .25s ease,color .25s ease;
}
.img-size-btn:hover{border-color:var(--border-strong);color:var(--text)}
.img-size-btn.active{border-color:var(--accent-2);color:var(--text)}
.img-slider{display:flex;align-items:center;gap:8px;flex:1;min-width:180px}
.img-slider input[type="range"]{flex:1;accent-color:var(--accent-2)}
.img-slider-val{font-size:.76rem;color:var(--muted);min-width:52px;text-align:right}
.tb-text-btn.danger{color:var(--accent-3)}
.tb-text-btn.danger:hover{border-color:var(--accent-3);color:var(--accent-3)}
.tb-btn:disabled{opacity:.55;cursor:wait;transform:none}

/* Handle tarik resize */
.img-resize-handle{
  position:absolute;z-index:30;
  width:16px;height:16px;border-radius:50%;
  background:var(--accent-2);
  border:2px solid var(--surface);
  box-shadow:var(--shadow);
  cursor:nwse-resize;
  touch-action:none;
}

/* ---------- Responsive ---------- */
@media (max-width:720px){
  .tb-select{max-width:150px}
  .tb-swatches{grid-template-columns:repeat(6,1fr)}
  .note-paper{padding:18px 16px}
}

/* ---------- Sidebar referensi situs ---------- */
.note-sidebar{
  flex:0 0 clamp(320px, 34vw, 520px);
  display:flex;flex-direction:column;gap:10px;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  padding:12px;
  min-height:min(62vh,640px);
  max-height:min(84vh,900px);
  position:sticky;top:0;
  align-self:flex-start;
}
.ns-head{
  display:flex;align-items:center;justify-content:space-between;gap:8px;
}
.ns-title{
  font-weight:700;font-size:14px;color:var(--text);letter-spacing:.02em;
}
.ns-close{
  border:none;background:transparent;color:var(--muted,#828892);
  font-size:14px;cursor:pointer;padding:4px 8px;border-radius:8px;line-height:1;
}
.ns-close:hover{background:rgba(128,136,146,.12);color:var(--text)}
.ns-controls{
  display:flex;align-items:center;gap:8px;
}
.ns-select{flex:1 1 auto;min-width:0}
.ns-open{
  flex:0 0 auto;font-size:12px;font-weight:600;text-decoration:none;
  color:var(--accent-2,#2980b9);border:1px solid var(--border);
  padding:6px 10px;border-radius:8px;white-space:nowrap;
}
.ns-open:hover{border-color:var(--accent-2,#2980b9)}
.ns-frame-wrap{
  position:relative;flex:1 1 auto;min-height:260px;
  border:1px solid var(--border);border-radius:10px;overflow:hidden;
  background:#fff;
}
.ns-iframe{
  position:absolute;inset:0;width:100%;height:100%;border:0;display:block;
}
.ns-loading{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:13px;color:var(--muted,#828892);background:var(--surface);z-index:1;
}
.ns-hint{
  margin:0;font-size:11.5px;line-height:1.5;color:var(--muted,#828892);
}
.tb-btn.active{
  border-color:var(--accent-2,#2980b9);color:var(--accent-2,#2980b9);
  background:rgba(41,128,185,.08);
}
@media (max-width: 900px){
  .note-body{flex-direction:column}
  .note-sidebar{flex:0 0 auto;width:100%;max-height:60vh;position:static}
}
</style>
