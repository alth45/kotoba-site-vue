<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useVocabStore } from '../composables/useVocabStore.js'
import { useVocabPages } from '../composables/useVocabPages.js'
import { useConfirm } from '../composables/useConfirm.js'
import SearchDialog from '../components/SearchDialog.vue'

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
const highlightId = ref(null)
let highlightTimer = null

function onSearchShortcut(e) {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    searchOpen.value = !searchOpen.value
  }
}

function onSearchSelect(item) {
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
    errorMsg.value = e.message
  } finally {
    saving.value = false
  }
}

/* ---------- Edit (inline per baris) ---------- */
const editingId = ref(null)
const draft = reactive({ jp: '', romaji: '', arti: '', kategori: 'Dasar' })

const draftValid = computed(
  () => draft.jp.trim() !== '' && draft.romaji.trim() !== '' && draft.arti.trim() !== '',
)

function startEdit(item) {
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
    errorMsg.value = e.message
  } finally {
    saving.value = false
  }
}

/* ---------- Hapus ---------- */
async function onDelete(item) {
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
    errorMsg.value = e.message
  }
}

/* ---------- Opsi kategori (termasuk kategori buatan pengguna) ---------- */
const kategoriOptions = computed(() => {
  const options = ['Salam', 'Sopan', 'Dasar', 'Angka', 'Kata kerja']
  currentItems.value.forEach((item) => {
    if (item.kategori && !options.includes(item.kategori)) options.push(item.kategori)
  })
  if (draft.kategori && !options.includes(draft.kategori)) options.push(draft.kategori)
  if (form.kategori && !options.includes(form.kategori)) options.push(form.kategori)
  return options
})

/* ---------- Kontrol halaman (logika ada di useVocabPages) ---------- */
function setPage(p) {
  return goToPage(p)
}

/** Nomor halaman yang ditampilkan (dengan "…" bila terlalu banyak). */
function pageWindow(totalPages, current) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(totalPages - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < totalPages - 2) pages.push('…')
  pages.push(totalPages)
  return pages
}

const visiblePages = computed(() => pageWindow(pageCount.value, effectivePage.value))
</script>

<template>
  <main class="kosakata-page">
    <div class="wrap">
      <div class="page-head">
        <RouterLink class="back" to="/">← Kembali ke beranda</RouterLink>
        <span class="eyebrow">Kosakata</span>
        <h1>Kelola daftar kosakata.</h1>
        <p class="lead">Tambah, ubah, atau hapus kata. Perubahan tersimpan otomatis di browser ini.</p>
      </div>

      <p v-if="errorMsg" class="page-error" role="alert">
        {{ errorMsg }}
      </p>

      <div class="toolbar">
        <span class="count-pill"><b>{{ initializing ? '…' : total }}</b> kosakata</span>
        <div class="toolbar-actions">
          <button class="btn ghost" type="button" @click="searchOpen = true">
            Cari kosakata… <span class="kbd-chip">Ctrl K</span>
          </button>
          <button class="btn primary" type="button" @click="showForm = !showForm">
            {{ showForm ? 'Tutup form' : '+ Tambah kosakata' }}
          </button>
        </div>
      </div>

      <SearchDialog v-model="searchOpen" @select="onSearchSelect" />

      <form v-if="showForm" class="vocab-form" @submit.prevent="submitAdd">
        <div class="field">
          <label for="v-jp">日本語</label>
          <input id="v-jp" v-model="form.jp" type="text" placeholder="contoh: こんにちは" autocomplete="off">
        </div>
        <div class="field">
          <label for="v-romaji">Romaji</label>
          <input id="v-romaji" v-model="form.romaji" type="text" placeholder="contoh: konnichiwa" autocomplete="off">
        </div>
        <div class="field">
          <label for="v-arti">Arti</label>
          <input id="v-arti" v-model="form.arti" type="text" placeholder="contoh: Halo, selamat siang" autocomplete="off">
        </div>
        <div class="field">
          <label for="v-kategori">Kategori</label>
          <select id="v-kategori" v-model="form.kategori">
            <option v-for="kat in kategoriOptions" :key="kat" :value="kat">{{ kat }}</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn primary" type="submit" :disabled="!formValid || saving">Simpan ke daftar</button>
        </div>
      </form>

      <div class="table-wrap">
        <table class="kv-table">
          <thead>
            <tr>
              <th class="idx">#</th>
              <th>日本語</th>
              <th>Romaji</th>
              <th>Arti</th>
              <th>Kategori</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in currentItems" :key="item.id" :class="{ 'row-hit': highlightId === item.id }">
              <td class="idx">{{ (effectivePage - 1) * PER_PAGE + i + 1 }}</td>

              <template v-if="editingId === item.id">
                <td><input v-model="draft.jp" type="text" aria-label="日本語"></td>
                <td><input v-model="draft.romaji" type="text" aria-label="Romaji"></td>
                <td><input v-model="draft.arti" type="text" aria-label="Arti"></td>
                <td>
                  <select v-model="draft.kategori" aria-label="Kategori">
                    <option v-for="kat in kategoriOptions" :key="kat" :value="kat">{{ kat }}</option>
                  </select>
                </td>
                <td>
                  <div class="row-actions">
                    <button class="row-btn primary" type="button" :disabled="!draftValid || saving" @click="saveEdit">Simpan</button>
                    <button class="row-btn" type="button" @click="cancelEdit">Batal</button>
                  </div>
                </td>
              </template>

              <template v-else>
                <td class="jp">{{ item.jp }}</td>
                <td class="romaji">{{ item.romaji }}</td>
                <td class="arti">{{ item.arti }}</td>
                <td><span class="tag">{{ item.kategori }}</span></td>
                <td>
                  <div class="row-actions">
                    <button class="row-btn" type="button" @click="startEdit(item)">Edit</button>
                    <button class="row-btn danger" type="button" @click="onDelete(item)">Hapus</button>
                  </div>
                </td>
              </template>
            </tr>

            <tr v-if="initializing || isLoading">
              <td class="empty" colspan="6">Memuat kosakata…</td>
            </tr>

            <tr v-else-if="loadError && currentItems.length === 0">
              <td class="empty" colspan="6">
                Gagal memuat — {{ loadError }}
                <button class="row-btn retry-btn" type="button" @click="goToPage(effectivePage)">
                  Coba lagi
                </button>
              </td>
            </tr>

            <tr v-else-if="total === 0">
              <td class="empty" colspan="6">Belum ada kosakata. Tambahkan lewat tombol di atas.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > 0" class="pagination">
        <span class="page-info">Menampilkan {{ rangeStart }}–{{ rangeEnd }} dari {{ total }} kosakata</span>
        <div class="page-controls">
          <button class="page-btn" type="button" :disabled="effectivePage === 1" @click="prevPage">
            ← Sebelumnya
          </button>
          <template v-for="(p, k) in visiblePages" :key="k">
            <span v-if="p === '…'" class="page-ellipsis" aria-hidden="true">…</span>
            <button
              v-else
              class="page-num"
              :class="{ active: p === effectivePage }"
              type="button"
              @click="setPage(p)"
            >{{ p }}</button>
          </template>
          <button class="page-btn" type="button" :disabled="effectivePage === pageCount" @click="nextPage">
            Berikutnya →
          </button>
        </div>
      </div>

      <p v-if="total > 0" class="cache-line">
        Cache halaman: {{ cachedPages.join(', ') || '—' }}
        <span class="cache-note">(maksimal 3 — halaman lama dibuang otomatis)</span>
      </p>
    </div>
  </main>
</template>

<style scoped>
/* ============ LAYOUT HALAMAN ============ */
.kosakata-page{
  position:fixed;inset:0;
  overflow-y:auto;overflow-x:hidden;
  padding:clamp(48px,9vh,96px) clamp(20px,5vw,64px) clamp(56px,8vh,84px);
  scrollbar-width:none;
}
.kosakata-page::-webkit-scrollbar{display:none}

.page-head{max-width:620px;margin-bottom:clamp(22px,4vh,36px)}
.back{
  display:inline-flex;align-items:center;
  font-size:.8rem;color:var(--muted);margin-bottom:18px;
  transition:color .3s ease;
}
.back:hover{color:var(--text)}
.page-head h1{font-size:clamp(1.6rem,3.6vw,2.5rem);letter-spacing:-.03em;margin-bottom:10px}

.page-error{
  border:1px solid var(--accent-3);
  background:var(--surface);
  color:var(--text);
  border-radius:12px;
  padding:11px 16px;
  font-size:.84rem;
  margin-bottom:16px;
}

/* ============ TOOLBAR + COUNT ============ */
.toolbar{
  display:flex;align-items:center;justify-content:space-between;
  gap:14px;flex-wrap:wrap;margin-bottom:18px;
}
.count-pill{
  display:inline-flex;align-items:center;gap:8px;
  font-size:.82rem;color:var(--muted);
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:999px;padding:7px 16px;
}
.count-pill b{color:var(--text);font-size:.98rem;font-weight:600}

.toolbar-actions{display:flex;gap:10px;flex-wrap:wrap}
.kbd-chip{
  display:inline-block;
  font-size:.66rem;letter-spacing:.06em;
  color:var(--muted);
  border:1px solid var(--border);
  border-radius:6px;
  padding:2px 6px;
  margin-left:6px;
  vertical-align:middle;
}

/* ============ FORM TAMBAH ============ */
.vocab-form{
  display:grid;grid-template-columns:repeat(4,1fr);gap:12px;
  align-items:end;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:var(--radius);
  padding:18px 20px;margin-bottom:18px;
}
.field{display:flex;flex-direction:column;gap:6px}
.field label{
  font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);
}
.field input,
.field select,
.kv-table input,
.kv-table select{
  border:1px solid var(--border);
  background:var(--surface-2);
  border-radius:10px;
  padding:9px 12px;
  font:inherit;font-size:.86rem;color:var(--text);
  width:100%;
  transition:border-color .3s ease;
}
.field input:focus,
.field select:focus,
.kv-table input:focus,
.kv-table select:focus{outline:none;border-color:var(--border-strong)}
.form-actions{grid-column:1/-1;display:flex;justify-content:flex-end}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none}

/* ============ TABEL ============ */
.table-wrap{
  border:1px solid var(--border);
  border-radius:var(--radius);
  overflow:hidden;
  background:var(--surface);
}
.kv-table{
  width:100%;
  border-collapse:separate;
  border-spacing:0;
  background:var(--surface);
}
.kv-table th,
.kv-table td{
  padding:13px 18px;
  text-align:left;
  border-bottom:1px solid var(--border);
  vertical-align:middle;
  font-size:.88rem;
}
.kv-table thead th{
  background:var(--surface-2);
  font-weight:500;
  font-size:.7rem;
  letter-spacing:.14em;
  text-transform:uppercase;
  color:var(--muted);
}
.kv-table tbody tr{transition:background-color .3s ease}
.kv-table tbody tr:hover{background:var(--surface-2)}
/* Sorotan baris setelah loncat dari pencarian */
.kv-table tbody tr.row-hit{animation:row-hit 2.6s var(--ease)}
@keyframes row-hit{
  0%{background:color-mix(in srgb, var(--accent-2) 40%, transparent)}
  100%{background:transparent}
}
.kv-table tbody tr:last-child td{border-bottom:none}
.kv-table .jp{font-size:1.02rem;font-weight:500;letter-spacing:.02em}
.kv-table .romaji{color:var(--muted);font-style:italic;font-size:.84rem}
.kv-table .arti{font-size:.88rem}
.kv-table .idx{color:var(--muted);width:44px}
.kv-table .empty{text-align:center;color:var(--muted);padding:34px 18px}

/* ============ AKSI BARIS ============ */
.row-actions{display:flex;gap:8px;flex-wrap:wrap}
.row-btn{
  border:1px solid var(--border);
  border-radius:10px;
  padding:7px 14px;
  font-size:.8rem;
  color:var(--muted);
  white-space:nowrap;
  transition:transform .3s var(--ease),background-color .3s ease,color .3s ease,border-color .3s ease;
}
.row-btn:hover{transform:translateY(-1px);color:var(--text);border-color:var(--border-strong)}
.row-btn.primary{background:var(--accent-2);border-color:transparent;color:#3c4046}
[data-theme="dark"] .row-btn.primary{color:#191b1f}
.row-btn.primary:hover{background:var(--accent)}
.row-btn.danger:hover{border-color:var(--accent-3);color:var(--accent-3)}
.row-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}

/* ============ PAGINASI ============ */
.pagination{
  display:flex;align-items:center;justify-content:space-between;
  gap:14px;flex-wrap:wrap;margin-top:16px;
}
.page-info{font-size:.8rem;color:var(--muted)}
.page-controls{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.page-btn,
.page-num{
  border:1px solid var(--border);
  border-radius:10px;
  padding:7px 13px;
  font-size:.8rem;
  color:var(--muted);
  white-space:nowrap;
  transition:transform .3s var(--ease),background-color .3s ease,color .3s ease,border-color .3s ease;
}
.page-btn:hover:not(:disabled),
.page-num:hover:not(.active){transform:translateY(-1px);color:var(--text);border-color:var(--border-strong)}
.page-num{min-width:34px;text-align:center}
.page-num.active{
  background:var(--accent-2);border-color:transparent;
  color:#3c4046;font-weight:600;
}
[data-theme="dark"] .page-num.active{color:#191b1f}
.page-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.page-ellipsis{color:var(--muted);padding:0 2px;font-size:.8rem}

.cache-line{
  margin-top:10px;
  font-size:.74rem;
  color:var(--muted);
  letter-spacing:.02em;
}
.cache-note{opacity:.75}
.retry-btn{display:inline-block;margin-left:10px;vertical-align:middle}

/* ============ RESPONSIVE ============ */
@media (max-width:900px){
  .vocab-form{grid-template-columns:1fr 1fr}
}
@media (max-width:720px){
  .vocab-form{grid-template-columns:1fr}
  .kv-table th,
  .kv-table td{padding:10px 12px;font-size:.82rem}
  .kv-table thead th:nth-child(5),
  .kv-table tbody td:nth-child(5){display:none}
  .kv-table .jp{font-size:.96rem}
}
</style>
