<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { searchVocab } from '../composables/useVocabStore.js'
import { PER_PAGE } from '../composables/useVocabPages.js'

const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['select'])

const query = ref('')
const results = ref([])
const totalMatches = ref(0)
const searching = ref(false)
const activeIndex = ref(0)
const inputEl = ref(null)

const DEBOUNCE_MS = 250
let debounceTimer = null
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

function choose(item) {
  emit('select', item)
  open.value = false
}

function close() {
  open.value = false
}

function move(dir) {
  if (results.value.length === 0) return
  activeIndex.value =
    (activeIndex.value + dir + results.value.length) % results.value.length
  document
    .getElementById(`sd-row-${activeIndex.value}`)
    ?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(e) {
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

/** Pecah teks menjadi segmen (cocok/tidak) — highlight aman tanpa v-html. */
function segments(text, q) {
  const source = String(text ?? '')
  const needle = q.trim().toLowerCase()
  if (!needle) return [{ text: source, hit: false }]
  const lower = source.toLowerCase()
  const parts = []
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

onBeforeUnmount(() => window.clearTimeout(debounceTimer))
</script>

<template>
  <Teleport to="body">
    <Transition name="sd-fade">
      <div v-if="open" class="sd-scrim" tabindex="-1" @click.self="close" @keydown.esc="close">
        <Transition name="sd-pop" appear>
          <div class="sd-dialog" role="dialog" aria-modal="true" aria-label="Cari kosakata">
            <div class="sd-bar" aria-hidden="true"></div>

            <div class="sd-search">
              <svg class="sd-search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.2-3.2" />
              </svg>
              <input
                ref="inputEl"
                v-model="query"
                type="text"
                placeholder="Ketik kanji, romaji, atau arti…"
                autocomplete="off"
                spellcheck="false"
                @keydown="onKeydown"
              >
              <button class="sd-esc" type="button" @click="close">esc</button>
            </div>

            <p class="sd-meta">
              <template v-if="query.trim()">
                <template v-if="searching">Mencari…</template>
                <template v-else-if="totalMatches === 0">
                  Tidak ada hasil untuk “{{ query.trim() }}”
                </template>
                <template v-else>
                  {{ results.length }}<template v-if="totalMatches > results.length"> teratas</template>
                  hasil dari {{ totalMatches }} kosakata
                </template>
              </template>
              <template v-else>
                Cari di seluruh daftar kosakata — kanji, romaji, arti, maupun kategori.
              </template>
            </p>

            <ul class="sd-results">
              <li
                v-for="(item, i) in results"
                :id="`sd-row-${i}`"
                :key="item.id"
                class="sd-item"
                :class="{ active: i === activeIndex }"
                @mousemove="activeIndex = i"
                @click="choose(item)"
              >
                <span class="sd-item-head">
                  <span class="sd-jp">
                    <template v-for="(s, si) in segments(item.jp, query)" :key="si">
                      <mark v-if="s.hit">{{ s.text }}</mark>
                      <template v-else>{{ s.text }}</template>
                    </template>
                  </span>
                  <span class="sd-romaji">
                    <template v-for="(s, si) in segments(item.romaji, query)" :key="si">
                      <mark v-if="s.hit">{{ s.text }}</mark>
                      <template v-else>{{ s.text }}</template>
                    </template>
                  </span>
                </span>
                <span class="sd-arti">
                  <template v-for="(s, si) in segments(item.arti, query)" :key="si">
                    <mark v-if="s.hit">{{ s.text }}</mark>
                    <template v-else>{{ s.text }}</template>
                  </template>
                </span>
                <span class="tag sd-tag">{{ item.kategori }}</span>
                <span class="sd-page">Hal. {{ Math.floor(item.index / PER_PAGE) + 1 }}</span>
              </li>
            </ul>

            <div class="sd-footer">
              <span><kbd>↑</kbd><kbd>↓</kbd> navigasi</span>
              <span><kbd>Enter</kbd> buka di tabel</span>
              <span><kbd>Esc</kbd> tutup</span>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ============ SCRIM ============ */
.sd-scrim{
  position:fixed;inset:0;z-index:150;
  display:flex;justify-content:center;align-items:flex-start;
  padding:12vh 20px 20px;
  background:rgba(20,22,26,.32);
  backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
}
.sd-scrim:focus{outline:none}

/* ============ DIALOG (command-palette style) ============ */
.sd-dialog{
  position:relative;
  width:100%;max-width:640px;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:18px;
  box-shadow:var(--shadow);
  overflow:hidden;
  transition:background-color .5s ease,border-color .5s ease;
}

/* Strip gradien unik di puncak dialog */
.sd-bar{
  height:3px;
  background:linear-gradient(90deg,var(--accent),var(--accent-2),var(--accent-4),var(--accent-3));
  background-size:300% 100%;
  animation:sd-bar-slide 6s linear infinite;
}
@keyframes sd-bar-slide{
  0%{background-position:0% 0}
  100%{background-position:300% 0}
}

/* ============ BARIS PENCARIAN ============ */
.sd-search{
  display:flex;align-items:center;gap:12px;
  padding:16px 18px 12px;
}
.sd-search-ico{
  width:20px;height:20px;flex:none;color:var(--muted);
}
.sd-search input{
  flex:1;min-width:0;
  border:none;background:transparent;
  font:inherit;font-size:1.12rem;color:var(--text);
  letter-spacing:-.01em;
}
.sd-search input:focus{outline:none}
.sd-search input::placeholder{color:var(--muted);opacity:.8}
.sd-esc{
  flex:none;
  font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;
  color:var(--muted);
  border:1px solid var(--border);
  border-radius:7px;
  padding:4px 9px;
  transition:color .3s ease,border-color .3s ease;
}
.sd-esc:hover{color:var(--text);border-color:var(--border-strong)}

.sd-meta{
  margin:0;padding:0 18px 12px;
  font-size:.78rem;color:var(--muted);
}

/* ============ HASIL ============ */
.sd-results{
  list-style:none;margin:0;padding:0 8px;
  max-height:46vh;overflow-y:auto;
  border-top:1px solid var(--border);
  scrollbar-width:thin;
}
.sd-item{
  display:flex;align-items:center;gap:12px;
  padding:11px 12px;
  border-radius:12px;
  cursor:pointer;
  transition:background-color .2s ease,box-shadow .2s ease;
}
.sd-item.active{
  background:var(--surface-2);
  box-shadow:inset 3px 0 0 var(--accent-2);
}
.sd-item-head{display:flex;flex-direction:column;gap:1px;min-width:118px}
.sd-jp{font-size:1rem;font-weight:500;letter-spacing:.02em}
.sd-romaji{font-size:.76rem;color:var(--muted);font-style:italic}
.sd-arti{flex:1;min-width:0;font-size:.85rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sd-tag{flex:none}
.sd-page{flex:none;font-size:.7rem;color:var(--muted);letter-spacing:.03em;white-space:nowrap}

/* Highlight kecocokan — memakai warna tema */
.sd-item mark{
  background:color-mix(in srgb, var(--accent-2) 42%, transparent);
  color:var(--text);
  border-radius:4px;
  padding:0 2px;
}

/* ============ FOOTER ============ */
.sd-footer{
  display:flex;gap:16px;flex-wrap:wrap;
  padding:10px 18px;
  border-top:1px solid var(--border);
  font-size:.72rem;color:var(--muted);
}
.sd-footer kbd{
  border:1px solid var(--border);
  border-radius:5px;
  padding:1px 5px;
  margin-right:3px;
  font-family:inherit;font-size:.68rem;
}

/* ============ ANIMASI ============ */
.sd-fade-enter-active,
.sd-fade-leave-active{transition:opacity .3s ease}
.sd-fade-enter-from,
.sd-fade-leave-to{opacity:0}

.sd-pop-enter-active{
  transition:transform .45s var(--ease),opacity .3s ease;
}
.sd-pop-leave-active{
  transition:transform .25s ease,opacity .2s ease;
}
.sd-pop-enter-from,
.sd-pop-leave-to{
  opacity:0;
  transform:translateY(-18px) scale(.985);
}

/* ============ RESPONSIVE ============ */
@media (max-width:720px){
  .sd-scrim{padding:8vh 12px 12px}
  .sd-item-head{min-width:96px}
  .sd-tag{display:none}
}
</style>
