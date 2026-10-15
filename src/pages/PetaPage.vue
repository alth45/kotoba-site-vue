<script setup lang="ts">
/**
 * PetaPage.vue — halaman studio peta kalimat.
 * Status simpan & aksi "Bersihkan" didelegasikan ke src/core/useMapStatus.ts
 * dan src/core/useMapClear.ts; komponen anak merakit logikanya sendiri dari
 * src/core (lihat MapCanvas, MapPalette, MapInspector).
 */
import { onMounted, ref } from 'vue'
import { useMapStore } from '../composables/useMapStore.ts'
import { useMapStatus } from '../core/useMapStatus.ts'
import { useMapClear } from '../core/useMapClear.ts'
import type { MapSelection } from '../core/useMapInspector.ts'
import MapPalette from '../components/map/MapPalette.vue'
import MapCanvas from '../components/map/MapCanvas.vue'
import MapInspector from '../components/map/MapInspector.vue'

const { loadMap } = useMapStore()

onMounted(loadMap)

/** Pilihan aktif di kanvas: { type: 'node'|'edge', id } atau null. */
const selected = ref<MapSelection>(null)

function onSelect(type: string | null, id: string | null) {
  selected.value = type && id ? { type: type as 'node' | 'edge', id } : null
}

function clearSelection() {
  selected.value = null
}

const canvasRef = ref<InstanceType<typeof MapCanvas> | null>(null)

/* ---------- Status pill & bersihkan kanvas (core) ---------- */
const { statusText, statusClass } = useMapStatus()
const { onClear } = useMapClear(clearSelection)
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
