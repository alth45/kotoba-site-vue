<script setup lang="ts">
// =====================================================================
// MapCanvas.vue — hanya berisi PERAKITAN fungsi dari src/core/.
// Seluruh logika (zoom, export, seleksi, drag, geometri) tinggal di core.
// =====================================================================
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MapNode } from '../../types.ts'
import { CANVAS_W, CANVAS_H, useMapStore, roleById } from '../../composables/useMapStore.ts'
import { useMapZoom, MIN_ZOOM, MAX_ZOOM } from '../../core/useMapZoom.ts'
import { useMapExport } from '../../core/useMapExport.ts'
import { useMapSelection } from '../../core/useMapSelection.ts'
import { useMapCanvasInteractions } from '../../core/useMapCanvasInteractions.ts'
import { useMapNodePlacement } from '../../core/useMapNodePlacement.ts'
import {
  boxRect,
  buildEdgePaths,
  labelWidth,
  nodeStyle,
  tempEdgePath,
} from '../../core/mapGeometry.ts'

/** Pilihan aktif di kanvas: { type: 'node'|'edge', id } atau null. */
type Selection = { type: 'node' | 'edge'; id: string } | null

const props = defineProps<{ selected?: Selection }>()
const emit = defineEmits<{ select: [type: string | null, id: string | null] }>()

const {
  nodes,
  edges,
  loading,
  editingId,
  addNode,
  updateNode,
  removeNode,
  addEdge,
  removeEdge,
  scheduleSave,
} = useMapStore()

const workspaceEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLDivElement | null>(null)
const connecting = ref<{ fromId: string; x: number; y: number } | null>(null)
const boxSel = ref<{ startX: number; startY: number; curX: number; curY: number } | null>(null)

/* ---- Zoom & Export PNG (core) ---- */
const { zoom, zoomIn, zoomOut, zoomReset, onWheelZoom } = useMapZoom()
const { exporting, exportToPng } = useMapExport(() => canvasEl.value, zoom)

/* ---- Multi-select (core) ---- */
const { multiSelectedIds, isMultiMode, clearMultiSelect, isMultiSelected } = useMapSelection()

/* ---- Interaksi pointer: blok seleksi, drag, sambung (core) ---- */
const { startBoxSelect, startMultiDrag, startNodeDrag, startConnect } = useMapCanvasInteractions({
  canvasEl,
  zoom,
  editingId,
  nodes,
  boxSel,
  connecting,
  updateNode,
  addEdge,
  onSelectMany: (ids) => { multiSelectedIds.value = ids },
  emitSelect: (type, id) => emit('select', type, id),
})

/* ---- Penambahan node dari palet (core) ---- */
const { addCentered, tryDrop } = useMapNodePlacement({
  workspaceEl,
  canvasEl,
  zoom,
  editingId,
  addNode,
  clearMultiSelect,
  emitSelect: (type, id) => emit('select', type, id),
})
defineExpose({ addCentered, tryDrop })

/* ---- Gaya rubber-band ---- */
const boxSelStyle = computed(() => {
  if (!boxSel.value) return null
  const r = boxRect(boxSel.value.startX, boxSel.value.startY, boxSel.value.curX, boxSel.value.curY)
  return { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` }
})

/* ---- Helper kecil yang tersisa di komponen ---- */
function roleOf(node: MapNode) {
  return roleById(node.role)
}
function isSelected(id: string) {
  return props.selected?.type === 'node' && props.selected.id === id
}
function isSelectedEdge(id: string) {
  return props.selected?.type === 'edge' && props.selected.id === id
}

/* ---- Drag node: bila sudah terblok → multi-drag (core) ---- */
function onNodePointerDown(e: PointerEvent, node: MapNode) {
  if (isMultiSelected(node.id)) {
    startMultiDrag(e, node, multiSelectedIds.value)
    return
  }
  clearMultiSelect()
  emit('select', 'node', node.id)
  startNodeDrag(e, node)
}

/* ---- Edit teks (dbl-click) ---- */
function beginEdit(node: MapNode) {
  clearMultiSelect()
  emit('select', 'node', node.id)
  editingId.value = node.id
}
function endEdit() {
  editingId.value = null
}
watch(editingId, (id) => {
  if (!id) return
  nextTick(() => {
    const ta = canvasEl.value?.querySelector<HTMLTextAreaElement>(`.node[data-id="${id}"] .node-edit`)
    if (ta) {
      ta.focus()
      ta.select()
    }
  })
})

/* ---- Keyboard: zoom, Escape, Delete (memakai aksi core) ---- */
function onKeydown(e: KeyboardEvent) {
  const t = e.target as HTMLElement | EventTarget | null
  const tag = (t as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (t as HTMLElement | null)?.isContentEditable) return

  if (e.key === '+' || e.key === '=') { zoomIn(); return }
  if (e.key === '-' && !e.ctrlKey) { zoomOut(); return }
  if (e.key === '0' && !e.ctrlKey) { zoomReset(); return }

  if (e.key === 'Escape') {
    if (editingId.value) { editingId.value = null; return }
    clearMultiSelect()
    emit('select', null, null)
    return
  }
  if (e.key !== 'Delete' && e.key !== 'Backspace') return

  if (isMultiMode.value) {
    e.preventDefault()
    for (const id of [...multiSelectedIds.value]) removeNode(id)
    clearMultiSelect()
    emit('select', null, null)
    return
  }
  if (props.selected?.type === 'node') {
    e.preventDefault()
    removeNode(props.selected.id)
    emit('select', null, null)
  } else if (props.selected?.type === 'edge') {
    e.preventDefault()
    removeEdge(props.selected.id)
    emit('select', null, null)
  }
}

/* ---- Geometri garis (core) ---- */
const edgePaths = computed(() => buildEdgePaths(edges.value, nodes.value))
const tempPath = computed(() => {
  if (!connecting.value) return ''
  const src = nodes.value.find((n) => n.id === connecting.value!.fromId)
  return tempEdgePath(src, connecting.value.x, connecting.value.y)
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // Pusatkan tampilan awal kanvas.
  const ws = workspaceEl.value
  if (ws) ws.scrollLeft = Math.max(0, (CANVAS_W - ws.clientWidth) / 2)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="map-workspace-outer">
    <!-- =========== ZOOM CONTROLS =========== -->
    <div class="zoom-bar" role="toolbar" aria-label="Kontrol zoom kanvas">
      <button class="zoom-btn" type="button" title="Zoom in (+)" @click="zoomIn" :disabled="zoom >= MAX_ZOOM">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4"/>
          <line x1="7" y1="3.5" x2="7" y2="10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="zoom-level" type="button" title="Reset zoom ke 100% (tekan 0)" @click="zoomReset">
        {{ Math.round(zoom * 100) }}%
      </button>
      <button class="zoom-btn" type="button" title="Zoom out (-)" @click="zoomOut" :disabled="zoom <= MIN_ZOOM">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4"/>
          <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="zoom-sep"></div>
      <span v-if="isMultiMode" class="zoom-info multi-info">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <rect x="0.7" y="0.7" width="9.6" height="9.6" rx="2" stroke="currentColor" stroke-width="1.1" stroke-dasharray="2.5 1.5"/>
        </svg>
        {{ multiSelectedIds.size }} node dipilih — geser atau Delete untuk hapus
      </span>
      <span v-else class="zoom-info">
        Ctrl+Scroll untuk zoom &nbsp;·&nbsp; Drag area kosong untuk blok seleksi
      </span>

      <!-- spacer mendorong tombol export ke kanan -->
      <span style="flex:1"></span>

      <!-- EXPORT PNG -->
      <button
        class="export-btn"
        type="button"
        :disabled="exporting || nodes.length === 0"
        :title="nodes.length === 0 ? 'Kanvas kosong' : 'Export kanvas ke PNG'"
        @click="exportToPng"
      >
        <span v-if="exporting" class="export-spinner" aria-hidden="true"></span>
        <svg v-else width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M6.5 1v7M4 6l2.5 2.5L9 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M1.5 9.5v1A1.5 1.5 0 003 12h7a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        {{ exporting ? 'Mengekspor…' : 'Export PNG' }}
      </button>
    </div>

    <!-- =========== WORKSPACE (scrollable) =========== -->
    <div ref="workspaceEl" class="map-workspace" @wheel="onWheelZoom">
      <!-- Scaler: ukurannya mengikuti zoom sehingga scrollbar muncul dengan benar -->
      <div
        class="map-canvas-scaler"
        :style="{ width: `${CANVAS_W * zoom}px`, height: `${CANVAS_H * zoom}px` }"
      >
        <div
          ref="canvasEl"
          class="map-canvas"
          :style="{
            width: `${CANVAS_W}px`,
            height: `${CANVAS_H}px`,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
          }"
          @pointerdown.self="startBoxSelect"
        >
          <svg class="map-edges" :width="CANVAS_W" :height="CANVAS_H" aria-hidden="true">
            <defs>
              <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#828892" />
              </marker>
              <marker id="map-arrow-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#8494ac" />
              </marker>
            </defs>

            <g
              v-for="ep in edgePaths"
              :key="ep.id"
              class="edge-group"
              @click.stop="emit('select', 'edge', ep.id)"
            >
              <path class="edge-hit" :d="ep.d" />
              <path
                class="edge-line"
                :class="{ sel: isSelectedEdge(ep.id) }"
                :d="ep.d"
                :marker-end="isSelectedEdge(ep.id) ? 'url(#map-arrow-sel)' : 'url(#map-arrow)'"
              />
              <g v-if="ep.label" class="edge-label" :transform="`translate(${ep.midX},${ep.midY})`">
                <rect :x="-labelWidth(ep.label) / 2" y="-9" :width="labelWidth(ep.label)" height="18" rx="9" />
                <text y="4" text-anchor="middle">{{ ep.label }}</text>
              </g>
            </g>

            <path v-if="tempPath" class="edge-line temp" :d="tempPath" />
          </svg>

          <!-- Rubber-band box selection -->
          <div v-if="boxSel" class="box-sel" :style="boxSelStyle"></div>

          <div
            v-for="node in nodes"
            :key="node.id"
            class="node"
            :class="{
              selected: isSelected(node.id),
              'multi-sel': isMultiSelected(node.id),
            }"
            :data-id="node.id"
            :style="nodeStyle(node)"
            @pointerdown="onNodePointerDown($event, node)"
            @dblclick.stop="beginEdit(node)"
          >
            <span class="node-role">{{ roleOf(node).jp }}</span>

            <span v-if="editingId !== node.id" class="node-text">{{ node.text || '…' }}</span>
            <textarea
              v-else
              v-model="node.text"
              class="node-edit"
              rows="2"
              spellcheck="false"
              @pointerdown.stop
              @input="scheduleSave"
              @blur="endEdit"
              @keydown.enter.exact.prevent="endEdit"
              @keydown.esc.stop="endEdit"
            ></textarea>

            <button
              v-if="isSelected(node.id)"
              class="node-link"
              type="button"
              title="Tarik ke node lain untuk menyambung"
              @pointerdown.stop.prevent="startConnect($event, node)"
            ></button>

            <!-- Dot badge penanda multi-select -->
            <span v-if="isMultiSelected(node.id)" class="multi-dot"></span>
          </div>

          <div v-if="loading" class="map-overlay">Memuat peta…</div>
          <div v-else-if="nodes.length === 0" class="map-overlay">
            Kanvas kosong — tarik bentuk dari palet, atau pilih <b>Pola cepat</b> di kiri.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ================================================================
   OUTER WRAPPER
   ================================================================ */
.map-workspace-outer {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

/* ================================================================
   ZOOM BAR
   ================================================================ */
.zoom-bar {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: var(--radius) var(--radius) 0 0;
  flex-shrink: 0;
  user-select: none;
}

.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
  padding: 0;
  flex-shrink: 0;
}
.zoom-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent-2) 10%, var(--surface));
  border-color: var(--accent-2);
  transform: scale(1.1);
}
.zoom-btn:active:not(:disabled) { transform: scale(0.94); }
.zoom-btn:disabled { opacity: 0.32; cursor: not-allowed; }

.zoom-level {
  min-width: 48px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  font-size: 0.73rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0 5px;
  text-align: center;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.zoom-level:hover {
  border-color: var(--accent-2);
  color: var(--accent-2);
  background: color-mix(in srgb, var(--accent-2) 8%, var(--surface));
}

.zoom-sep {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 5px;
  flex-shrink: 0;
}

.zoom-info {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  color: var(--muted);
  margin-left: 2px;
}
.multi-info {
  color: var(--accent);
  font-weight: 600;
}

/* ================================================================
   WORKSPACE (scroll container)
   ================================================================ */
.map-workspace {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 var(--radius) var(--radius);
  background: var(--surface-2);
  scrollbar-width: thin;
  position: relative;
}

.map-canvas-scaler {
  position: relative;
  flex-shrink: 0;
}

/* Kanvas logis dengan pola titik */
.map-canvas {
  position: absolute;
  top: 0;
  left: 0;
  background-color: var(--surface);
  background-image: radial-gradient(var(--border-strong) 1px, transparent 1px);
  background-size: 22px 22px;
  transition: background-color 0.5s ease;
  touch-action: none;
}

/* ================================================================
   BOX SELECTION
   ================================================================ */
.box-sel {
  position: absolute;
  z-index: 10;
  pointer-events: none;
  border: 1.5px solid var(--accent-2);
  background: color-mix(in srgb, var(--accent-2) 10%, transparent);
  border-radius: 4px;
}

/* ================================================================
   GARIS
   ================================================================ */
.map-edges {
  position: absolute; inset: 0;
  pointer-events: none;
}
.edge-hit {
  fill: none;
  stroke: transparent;
  stroke-width: 16;
  pointer-events: stroke;
  cursor: pointer;
}
.edge-line {
  fill: none;
  stroke: var(--muted);
  stroke-width: 2;
  pointer-events: none;
}
.edge-line.sel { stroke: var(--accent-2); stroke-width: 2.6; }
.edge-line.temp {
  stroke-dasharray: 7 6;
  stroke: var(--accent-2);
}
.edge-label rect {
  fill: var(--surface-2);
  stroke: var(--border);
  stroke-width: 1;
}
.edge-label text {
  fill: var(--muted);
  font-size: 11px;
  font-family: inherit;
}

/* ================================================================
   NODE
   ================================================================ */
.node {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 14px 10px;
  border: 1.5px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  cursor: grab;
  user-select: none;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.5s ease;
}
.node:hover { border-color: var(--muted); }
.node:active { cursor: grabbing; }
.node.selected {
  border-color: var(--accent-2);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-2) 32%, transparent);
}
.node.multi-sel {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 26%, transparent);
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
}

.node-role {
  position: absolute;
  top: 4px; left: 8px;
  font-size: .6rem;
  letter-spacing: .08em;
  font-weight: 600;
  color: var(--role-color);
  opacity: .95;
  pointer-events: none;
}
.node-text {
  font-size: .95rem;
  line-height: 1.3;
  text-align: center;
  word-break: break-word;
  width: 100%;
}
.node-edit {
  width: 100%;
  border: 1px solid var(--accent-2);
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: .92rem;
  text-align: center;
  padding: 4px 6px;
  resize: none;
  outline: none;
}
.node-link {
  position: absolute;
  right: -8px; top: 50%;
  transform: translateY(-50%);
  width: 15px; height: 15px;
  border-radius: 50%;
  border: 2px solid var(--surface);
  background: var(--accent-2);
  cursor: crosshair;
  padding: 0;
  z-index: 3;
  transition: transform 0.2s var(--ease);
}
.node-link:hover { transform: translateY(-50%) scale(1.25); }

/* Dot badge di pojok kanan atas node multi-selected */
.multi-dot {
  position: absolute;
  top: 5px; right: 7px;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--accent);
  pointer-events: none;
}

/* ================================================================
   EXPORT BUTTON
   ================================================================ */
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  font-size: 0.72rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
}
.export-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent-2) 10%, var(--surface));
  border-color: var(--accent-2);
  color: var(--accent-2);
  transform: scale(1.04);
}
.export-btn:active:not(:disabled) { transform: scale(0.96); }
.export-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.export-spinner {
  display: inline-block;
  width: 11px;
  height: 11px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ================================================================
   OVERLAY
   ================================================================ */
.map-overlay {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  text-align: center;
  padding: 40px;
  font-size: .9rem;
  color: var(--muted);
  pointer-events: none;
}
</style>
