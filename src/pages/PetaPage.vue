<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMapStore } from '../composables/useMapStore.ts'
import { useConfirm } from '../composables/useConfirm.ts'
import MapPalette from '../components/map/MapPalette.vue'
import MapCanvas from '../components/map/MapCanvas.vue'
import MapInspector from '../components/map/MapInspector.vue'

const { loadMap, loading, saving, saveError, lastSavedAt, nodes, clearAll } = useMapStore()
const { confirmDialog } = useConfirm()

onMounted(loadMap)

/** Pilihan aktif di kanvas: { type: 'node'|'edge', id } atau null. */
type Selection = { type: 'node' | 'edge'; id: string } | null
const selected = ref<Selection>(null)

function onSelect(type: string | null, id: string | null) {
  selected.value = type && id ? { type: type as 'node' | 'edge', id } : null
}

function clearSelection() {
  selected.value = null
}

const canvasRef = ref<InstanceType<typeof MapCanvas> | null>(null)

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

async function onClear() {
  if (nodes.value.length === 0) return
  const ok = await confirmDialog({
    title: 'Bersihkan kanvas?',
    message: 'Seluruh node dan garis pada peta ini akan dihapus. Tindakan ini tidak bisa dibatalkan.',
    confirmText: 'Bersihkan',
    cancelText: 'Batal',
    danger: true,
  })
  if (!ok) return
  clearAll()
  clearSelection()
}
</script>

<template>
  <main class="peta-page">
    <header class="map-head">
      <div class="map-head-text">
        <RouterLink class="back" to="/">← Kembali ke beranda</RouterLink>
        <span class="eyebrow">Studio Pemetaan</span>
        <h1>Peta Pola Kalimat Jepang</h1>
        <p class="lead">
          Tarik bentuk & partikel ke kanvas, dobel-klik untuk menulis teks, lalu sambung node
          untuk memetakan struktur kalimat — 主語, 目的語, 述語, dan lainnya.
        </p>
      </div>
      <div class="map-head-actions">
        <span class="save-pill" :class="statusClass">{{ statusText }}</span>
        <button class="btn ghost" type="button" @click="onClear">Bersihkan</button>
      </div>
    </header>

    <div class="map-shell">
      <MapPalette :canvas-ref="canvasRef" />
      <MapCanvas ref="canvasRef" :selected="selected" @select="onSelect" />
      <MapInspector :selected="selected" @clear="clearSelection" />
    </div>
  </main>
</template>

<style scoped>
.peta-page{
  position:fixed;inset:0;
  display:flex;flex-direction:column;
  overflow:hidden;
  padding:clamp(20px,4vh,40px) clamp(16px,3vw,36px) clamp(18px,3vh,32px);
  gap:16px;
}

/* ---------- Header ---------- */
.map-head{
  display:flex;align-items:flex-end;justify-content:space-between;
  gap:18px;flex-wrap:wrap;
}
.map-head-text{max-width:640px}
.back{
  display:inline-flex;align-items:center;
  font-size:.8rem;color:var(--muted);margin-bottom:12px;
  transition:color .3s ease;
}
.back:hover{color:var(--text)}
.map-head h1{
  font-size:clamp(1.4rem,3vw,2.1rem);
  letter-spacing:-.03em;
  margin-bottom:8px;
}
.map-head .lead{font-size:.86rem;max-width:none}

.map-head-actions{
  display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  padding-bottom:4px;
}
.save-pill{
  display:inline-flex;align-items:center;gap:8px;
  font-size:.74rem;color:var(--muted);
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:999px;
  padding:7px 14px;
  transition:border-color .3s ease,color .3s ease;
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

/* ---------- Shell: palet | kanvas | inspector ---------- */
.map-shell{
  flex:1;min-height:0;
  display:grid;
  grid-template-columns:224px minmax(0,1fr) 216px;
  gap:14px;
}

/* ---------- Responsive ---------- */
@media (max-width:1020px){
  .map-shell{grid-template-columns:200px minmax(0,1fr) 200px}
}
@media (max-width:860px){
  .peta-page{position:static;overflow-y:auto;height:auto}
  .map-shell{
    grid-template-columns:1fr;
    grid-auto-rows:min-content;
  }
  .map-shell :deep(.map-workspace){height:520px}
  .map-shell :deep(.map-palette),
  .map-shell :deep(.map-inspector){max-height:none}
}
</style>
