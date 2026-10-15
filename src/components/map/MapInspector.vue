<script setup>
import { computed } from 'vue'
import { ROLES, SHAPE_DEFS, useMapStore } from '../../composables/useMapStore.js'

const props = defineProps({
  /** Pilihan aktif: { type: 'node'|'edge', id } atau null. */
  selected: { type: Object, default: null },
})
const emit = defineEmits(['clear'])

const { nodes, edges, updateNode, removeNode, updateEdge, removeEdge } = useMapStore()

const node = computed(() => {
  if (props.selected?.type !== 'node') return null
  return nodes.value.find((n) => n.id === props.selected.id) ?? null
})

const edge = computed(() => {
  if (props.selected?.type !== 'edge') return null
  return edges.value.find((e) => e.id === props.selected.id) ?? null
})

function onRoleChange(e) {
  if (node.value) updateNode(node.value.id, { role: e.target.value })
}

function onShapeClick(shape) {
  if (!node.value) return
  updateNode(node.value.id, { shape: shape.id, w: shape.w, h: shape.h })
}

function onTextInput(e) {
  if (node.value) updateNode(node.value.id, { text: e.target.value })
}

function deleteNode() {
  if (!node.value) return
  removeNode(node.value.id)
  emit('clear')
}

function onLabelInput(e) {
  if (edge.value) updateEdge(edge.value.id, { label: e.target.value })
}

function flipEdge() {
  if (!edge.value) return
  updateEdge(edge.value.id, { from: edge.value.to, to: edge.value.from })
}

function deleteEdge() {
  if (!edge.value) return
  removeEdge(edge.value.id)
  emit('clear')
}
</script>

<template>
  <aside class="map-inspector">
    <template v-if="node">
      <h4>Node terpilih</h4>

      <label class="ins-label" for="ins-role">Peran tata bahasa</label>
      <select id="ins-role" class="ins-select" :value="node.role" @change="onRoleChange">
        <option v-for="r in ROLES" :key="r.id" :value="r.id">{{ r.jp }} — {{ r.idn }}</option>
      </select>

      <label class="ins-label" for="ins-text">Teks</label>
      <textarea
        id="ins-text"
        class="ins-textarea"
        rows="3"
        :value="node.text"
        placeholder="mis. 私は"
        @input="onTextInput"
      ></textarea>

      <label class="ins-label">Bentuk</label>
      <div class="ins-shapes">
        <button
          v-for="s in SHAPE_DEFS"
          :key="s.id"
          class="ins-shape"
          :class="{ active: node.shape === s.id }"
          type="button"
          :title="s.label"
          @click="onShapeClick(s)"
        >
          <span class="ins-shape-preview" :style="{ borderRadius: s.radius }"></span>
        </button>
      </div>

      <p class="ins-info">Posisi: {{ Math.round(node.x) }}, {{ Math.round(node.y) }}</p>

      <button class="ins-delete" type="button" @click="deleteNode">Hapus node (Del)</button>
    </template>

    <template v-else-if="edge">
      <h4>Garis terpilih</h4>

      <label class="ins-label" for="ins-label">Label garis</label>
      <input
        id="ins-label"
        class="ins-input"
        type="text"
        :value="edge.label"
        placeholder="mis. を, 連体修飾"
        @input="onLabelInput"
      >
      <p class="ins-hint">
        Label menandai hubungan antar node — misalnya partikel, jenis peran, atau arah perintah.
      </p>

      <button class="ins-flip" type="button" @click="flipEdge">⇄ Balik arah panah</button>
      <button class="ins-delete" type="button" @click="deleteEdge">Hapus garis (Del)</button>
    </template>

    <template v-else>
      <h4>Panel properti</h4>
      <p class="ins-hint">Pilih node atau garis di kanvas untuk mengeditnya.</p>
      <ul class="ins-tips">
        <li><b>Dobel klik</b> node → ubah teks</li>
        <li><b>Tarik titik</b> di samping node → membuat garis</li>
        <li><b>Del / Backspace</b> → hapus yang terpilih</li>
        <li><b>Esc</b> → batalkan pilihan / edit</li>
      </ul>
    </template>
  </aside>
</template>

<style scoped>
.map-inspector{
  display:flex;flex-direction:column;gap:8px;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:var(--radius);
  padding:16px 14px;
  overflow-y:auto;
  scrollbar-width:none;
  transition:background-color .5s ease,border-color .5s ease;
}
.map-inspector::-webkit-scrollbar{display:none}

.map-inspector h4{
  margin:0 0 4px;
  font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);font-weight:500;
}

.ins-label{
  font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;
  color:var(--muted);
  margin-top:6px;
}
.ins-select,
.ins-input,
.ins-textarea{
  width:100%;
  border:1px solid var(--border);
  background:var(--surface-2);
  color:var(--text);
  border-radius:10px;
  padding:8px 10px;
  font:inherit;
  font-size:.85rem;
  transition:border-color .3s ease;
}
.ins-textarea{resize:vertical;min-height:64px}
.ins-select:focus,
.ins-input:focus,
.ins-textarea:focus{outline:none;border-color:var(--border-strong)}

.ins-shapes{display:flex;gap:8px}
.ins-shape{
  flex:1;
  display:grid;place-items:center;
  padding:9px 4px;
  border:1px solid var(--border);
  border-radius:10px;
  color:var(--muted);
  transition:border-color .3s ease,background-color .3s ease;
}
.ins-shape:hover{border-color:var(--border-strong);color:var(--text)}
.ins-shape.active{
  border-color:var(--accent-2);
  background:color-mix(in srgb, var(--accent-2) 14%, transparent);
  color:var(--text);
}
.ins-shape-preview{
  width:30px;height:16px;
  border:1.5px solid currentColor;
}

.ins-info{font-size:.72rem;color:var(--muted);margin:4px 0 0}
.ins-hint{font-size:.78rem;color:var(--muted);line-height:1.55;margin:2px 0 0}

.ins-flip,
.ins-delete{
  margin-top:4px;
  border:1px solid var(--border);
  border-radius:10px;
  padding:9px 12px;
  font-size:.8rem;
  color:var(--muted);
  transition:border-color .3s ease,color .3s ease,transform .3s var(--ease);
}
.ins-flip:hover{border-color:var(--border-strong);color:var(--text);transform:translateY(-1px)}
.ins-delete:hover{
  border-color:var(--accent-3);
  color:var(--accent-3);
  transform:translateY(-1px);
}

.ins-tips{
  list-style:none;margin:8px 0 0;padding:0;
  display:flex;flex-direction:column;gap:8px;
  font-size:.78rem;color:var(--muted);line-height:1.5;
}
.ins-tips b{color:var(--text);font-weight:600}
</style>
