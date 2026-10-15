<script setup lang="ts">
// =====================================================================
// MapPalette.vue — logika drag palet didelegasikan ke src/core/useMapPaletteDrag.ts.
// =====================================================================
import type { MapNodeInput, MapRole } from '../../types.ts'
import {
  ROLES,
  SHAPE_DEFS,
  PARTICLES,
  TEMPLATES,
} from '../../composables/useMapStore.ts'
import { useMapPaletteDrag } from '../../core/useMapPaletteDrag.ts'
import { normalizeCanvasApi } from '../../core/useMapNodePlacement.ts'
import { useMapTemplate } from '../../core/useMapTemplate.ts'
import type MapCanvas from './MapCanvas.vue'

const props = defineProps<{
  /** Ref ke MapCanvas (defineExpose: tryDrop, addCentered). */
  canvasRef?: InstanceType<typeof MapCanvas> | null
}>()

/* ---------- Terapkan template (core) ---------- */
const { onTemplate } = useMapTemplate()

/* ---------- Drag dari palet ke kanvas (core) ---------- */
const canvasApi = () => normalizeCanvasApi(props.canvasRef)

const { ghost, onPaletteDown } = useMapPaletteDrag()

function paletteHandlers() {
  return {
    onDrop: (payload: MapNodeInput, x: number, y: number) => canvasApi()?.tryDrop(payload, x, y),
    onClick: (payload: MapNodeInput) => canvasApi()?.addCentered(payload, true),
  }
}

/** Wrapper: teruskan event + info item ke fungsi core dengan handler komponen ini. */
function onItemDown(event: PointerEvent, kind: string, value: string, label: string) {
  onPaletteDown(event, kind, value, label, paletteHandlers())
}

/* ---------- Klik peran / partikel (tanpa drag) ---------- */
function onRoleClick(role: MapRole) {
  canvasApi()?.addCentered({ role: role.id, shape: 'kotak' }, true)
}

function onParticleClick(p: string) {
  canvasApi()?.addCentered({ role: 'joshi', shape: 'elips', text: p, w: 110, h: 56 }, false)
}

/* ---------- Template (core/useMapTemplate.ts) ---------- */
</script>

<template>
  <aside class="map-palette">
    <section class="pal-sec">
      <h4>Bentuk</h4>
      <div class="pal-shapes">
        <button
          v-for="s in SHAPE_DEFS"
          :key="s.id"
          class="pal-shape"
          type="button"
          :title="`Tambah ${s.label} (klik/tarik ke kanvas)`"
          @pointerdown="onItemDown($event, 'shape', s.id, s.label)"
        >
          <span class="pal-shape-preview" :style="{ borderRadius: s.radius }"></span>
          <span class="pal-shape-label">{{ s.label }}</span>
        </button>
      </div>
    </section>

    <section class="pal-sec">
      <h4>Peran tata bahasa</h4>
      <ul class="pal-roles">
        <li v-for="r in ROLES" :key="r.id">
          <button class="pal-role" type="button" :title="`Tambah ${r.idn}`" @click="onRoleClick(r)">
            <span class="pal-role-dot" :style="{ background: r.color }"></span>
            <b>{{ r.jp }}</b>
            <span class="pal-role-idn">{{ r.idn }}</span>
          </button>
        </li>
      </ul>
    </section>

    <section class="pal-sec">
      <h4>Partikel cepat</h4>
      <div class="pal-particles">
        <button
          v-for="p in PARTICLES"
          :key="p"
          class="pal-particle"
          type="button"
          :title="`Tambah partikel ${p}`"
          @click="onParticleClick(p)"
        >{{ p }}</button>
      </div>
    </section>

    <section class="pal-sec">
      <h4>Pola cepat</h4>
      <ul class="pal-templates">
        <li v-for="tpl in TEMPLATES" :key="tpl.id">
          <button class="pal-template" type="button" @click="onTemplate(tpl)">
            <b>{{ tpl.label }}</b>
            <span>{{ tpl.sample }}</span>
          </button>
        </li>
      </ul>
    </section>

    <div v-if="ghost" class="pal-ghost" :style="{ left: `${ghost.x}px`, top: `${ghost.y}px` }">
      {{ ghost.label }}
    </div>
  </aside>
</template>

<style scoped>
.map-palette{
  display:flex;flex-direction:column;gap:18px;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:var(--radius);
  padding:16px 14px;
  overflow-y:auto;
  scrollbar-width:none;
  transition:background-color .5s ease,border-color .5s ease;
}
.map-palette::-webkit-scrollbar{display:none}

.pal-sec h4{
  margin:0 0 10px;
  font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);font-weight:500;
}

/* Bentuk */
.pal-shapes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pal-shape{
  display:flex;flex-direction:column;align-items:center;gap:6px;
  padding:10px 6px;
  border:1px solid var(--border);
  border-radius:12px;
  color:var(--muted);
  cursor:grab;
  transition:border-color .3s ease,transform .3s var(--ease),color .3s ease;
}
.pal-shape:hover{border-color:var(--border-strong);color:var(--text);transform:translateY(-2px)}
.pal-shape-preview{
  width:34px;height:18px;
  border:1.5px solid currentColor;
}
.pal-shape-label{font-size:.7rem}

/* Peran */
.pal-roles{display:flex;flex-direction:column;gap:5px}
.pal-role{
  display:flex;align-items:center;gap:8px;width:100%;
  padding:7px 9px;
  border:1px solid transparent;
  border-radius:10px;
  color:var(--muted);
  font-size:.78rem;
  text-align:left;
  transition:background-color .3s ease,border-color .3s ease,color .3s ease;
}
.pal-role:hover{background:var(--surface-2);border-color:var(--border);color:var(--text)}
.pal-role b{font-weight:600;color:var(--text)}
.pal-role-dot{width:9px;height:9px;border-radius:3px;flex:none}
.pal-role-idn{font-size:.68rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Partikel */
.pal-particles{display:flex;flex-wrap:wrap;gap:6px}
.pal-particle{
  min-width:34px;padding:5px 9px;
  border:1px solid var(--border);
  border-radius:999px;
  background:var(--surface-2);
  color:var(--text);
  font-size:.86rem;
  cursor:grab;
  transition:border-color .3s ease,transform .3s var(--ease);
}
.pal-particle:hover{border-color:var(--accent-2);transform:translateY(-2px)}

/* Template */
.pal-templates{display:flex;flex-direction:column;gap:6px}
.pal-template{
  display:flex;flex-direction:column;gap:1px;width:100%;
  padding:8px 10px;
  border:1px dashed var(--border-strong);
  border-radius:10px;
  color:var(--muted);
  text-align:left;
  transition:border-color .3s ease,background-color .3s ease;
}
.pal-template:hover{border-color:var(--accent-2);background:var(--surface-2)}
.pal-template b{font-size:.78rem;color:var(--text);font-weight:600}
.pal-template span{font-size:.72rem}

/* Ghost drag */
.pal-ghost{
  position:fixed;z-index:300;
  transform:translate(-50%,-50%);
  padding:8px 16px;
  border:1px solid var(--accent-2);
  background:var(--surface);
  color:var(--text);
  border-radius:12px;
  box-shadow:var(--shadow);
  font-size:.85rem;
  pointer-events:none;
}
</style>
