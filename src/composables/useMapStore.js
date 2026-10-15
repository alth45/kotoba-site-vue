import { ref } from 'vue'

/**
 * Store dokumen peta pola kalimat Jepang.
 * Data disimpan di data/map.json lewat API /api/map (auto-save debounced).
 */

export const CANVAS_W = 1400
export const CANVAS_H = 900

/** Peran tata bahasa Jepang — menentukan warna aksen node. */
export const ROLES = [
  { id: 'shugo', jp: '主語', idn: 'Subjek', color: '#8fae9d' },
  { id: 'mokuteki', jp: '目的語', idn: 'Objek', color: '#8ba3c7' },
  { id: 'jutsugo', jp: '述語', idn: 'Predikat (kata kerja)', color: '#c79a8b' },
  { id: 'hoshi', jp: '補語', idn: 'Komplement', color: '#c9b478' },
  { id: 'shushoku', jp: '修飾語', idn: 'Modifier', color: '#a396c0' },
  { id: 'joshi', jp: '助詞', idn: 'Partikel', color: '#7fa8ae' },
  { id: 'setsumei', jp: '説明', idn: 'Keterangan lain', color: '#9aa1ab' },
]

export function roleById(id) {
  return ROLES.find((r) => r.id === id) ?? ROLES[ROLES.length - 1]
}

/** Bentuk geometri yang tersedia di palet. */
export const SHAPE_DEFS = [
  { id: 'kotak', label: 'Kotak', w: 150, h: 64, radius: '8px' },
  { id: 'membulat', label: 'Membulat', w: 150, h: 64, radius: '16px' },
  { id: 'elips', label: 'Elips', w: 140, h: 74, radius: '50%' },
  { id: 'pil', label: 'Pil', w: 160, h: 50, radius: '999px' },
]

export function shapeById(id) {
  return SHAPE_DEFS.find((s) => s.id === id) ?? SHAPE_DEFS[0]
}

/** Partikel cepat — klik untuk menambah node 助詞 kecil. */
export const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'から', 'まで', 'の', 'も', 'や']

/**
 * Template pola kalimat siap pakai. `key` dipetakan ke id unik saat diterapkan.
 * Koordinat relatif terhadap kanvas CANVAS_W × CANVAS_H.
 */
export const TEMPLATES = [
  {
    id: 'sv',
    label: 'S + V',
    sample: '私は 行く。',
    nodes: [
      { key: 'a', role: 'shugo', shape: 'kotak', text: '私', x: 470, y: 380, w: 150, h: 64 },
      { key: 'b', role: 'joshi', shape: 'elips', text: 'は', x: 645, y: 384, w: 110, h: 56 },
      { key: 'c', role: 'jutsugo', shape: 'membulat', text: '行く', x: 780, y: 380, w: 150, h: 64 },
    ],
    edges: [
      ['a', 'b', ''],
      ['b', 'c', ''],
    ],
  },
  {
    id: 'sov',
    label: 'S + O + V',
    sample: '私は 本を 読む。',
    nodes: [
      { key: 'a', role: 'shugo', shape: 'kotak', text: '私', x: 330, y: 380, w: 150, h: 64 },
      { key: 'b', role: 'joshi', shape: 'elips', text: 'は', x: 505, y: 384, w: 110, h: 56 },
      { key: 'c', role: 'mokuteki', shape: 'kotak', text: '本', x: 640, y: 380, w: 150, h: 64 },
      { key: 'd', role: 'joshi', shape: 'elips', text: 'を', x: 815, y: 384, w: 110, h: 56 },
      { key: 'e', role: 'jutsugo', shape: 'membulat', text: '読む', x: 950, y: 380, w: 150, h: 64 },
    ],
    edges: [
      ['a', 'b', ''],
      ['b', 'c', ''],
      ['c', 'd', ''],
      ['d', 'e', ''],
    ],
  },
  {
    id: 'snv',
    label: 'S + に + V',
    sample: '友達に 会う。',
    nodes: [
      { key: 'a', role: 'mokuteki', shape: 'kotak', text: '友達', x: 470, y: 380, w: 150, h: 64 },
      { key: 'b', role: 'joshi', shape: 'elips', text: 'に', x: 645, y: 384, w: 110, h: 56 },
      { key: 'c', role: 'jutsugo', shape: 'membulat', text: '会う', x: 780, y: 380, w: 150, h: 64 },
    ],
    edges: [
      ['a', 'b', ''],
      ['b', 'c', ''],
    ],
  },
  {
    id: 'shv',
    label: '修飾 + S + V',
    sample: '高い山に 登る。',
    nodes: [
      { key: 'a', role: 'shushoku', shape: 'kotak', text: '高い', x: 330, y: 380, w: 150, h: 64 },
      { key: 'b', role: 'shugo', shape: 'kotak', text: '山', x: 530, y: 380, w: 150, h: 64 },
      { key: 'c', role: 'joshi', shape: 'elips', text: 'に', x: 705, y: 384, w: 110, h: 56 },
      { key: 'd', role: 'jutsugo', shape: 'membulat', text: '登る', x: 840, y: 380, w: 150, h: 64 },
    ],
    edges: [
      ['a', 'b', '連体修飾'],
      ['b', 'c', ''],
      ['c', 'd', ''],
    ],
  },
  {
    id: 'dev',
    label: 'S + で + V',
    sample: '図書館で 勉強する。',
    nodes: [
      { key: 'a', role: 'hoshi', shape: 'kotak', text: '図書館', x: 470, y: 380, w: 150, h: 64 },
      { key: 'b', role: 'joshi', shape: 'elips', text: 'で', x: 645, y: 384, w: 110, h: 56 },
      { key: 'c', role: 'jutsugo', shape: 'membulat', text: '勉強する', x: 780, y: 372, w: 170, h: 72 },
    ],
    edges: [
      ['a', 'b', ''],
      ['b', 'c', ''],
    ],
  },
]

/* ---------- State dokumen ---------- */

const nodes = ref([])
const edges = ref([])
const loading = ref(false)
const saving = ref(false)
const saveError = ref(null)
const lastSavedAt = ref(null)
/** Node yang sedang mengedit teks (null bila tidak). */
const editingId = ref(null)

const AUTOSAVE_MS = 900
let saveTimer = null
let queuedSave = false

let seqCounter = 0
function uid(prefix) {
  seqCounter += 1
  return `${prefix}${Date.now().toString(36)}${seqCounter.toString(36)}`
}

async function loadMap() {
  loading.value = true
  saveError.value = null
  try {
    const res = await fetch('/api/map')
    if (!res.ok) throw new Error(`Gagal memuat peta (HTTP ${res.status}).`)
    const data = await res.json()
    nodes.value = Array.isArray(data.nodes) ? data.nodes : []
    edges.value = Array.isArray(data.edges) ? data.edges : []
  } catch (e) {
    saveError.value = e.message
  } finally {
    loading.value = false
  }
}

async function saveMap() {
  if (saving.value) {
    queuedSave = true // ada perubahan baru → simpan lagi setelah selesai
    return
  }
  saving.value = true
  saveError.value = null
  try {
    const res = await fetch('/api/map', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: nodes.value, edges: edges.value }),
    })
    if (!res.ok) throw new Error(`Gagal menyimpan (HTTP ${res.status}).`)
    lastSavedAt.value = new Date()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
    if (queuedSave) {
      queuedSave = false
      saveMap()
    }
  }
}

function scheduleSave() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(saveMap, AUTOSAVE_MS)
}

export function useMapStore() {
  function addNode(partial) {
    const shape = shapeById(partial.shape)
    const node = {
      id: uid('n'),
      role: 'setsumei',
      shape: shape.id,
      text: '',
      x: 100,
      y: 100,
      w: shape.w,
      h: shape.h,
      ...partial,
    }
    nodes.value.push(node)
    scheduleSave()
    return node
  }

  function updateNode(id, patch) {
    const node = nodes.value.find((n) => n.id === id)
    if (!node) return
    Object.assign(node, patch)
    scheduleSave()
  }

  function removeNode(id) {
    nodes.value = nodes.value.filter((n) => n.id !== id)
    edges.value = edges.value.filter((e) => e.from !== id && e.to !== id)
    if (editingId.value === id) editingId.value = null
    scheduleSave()
  }

  function addEdge(from, to, label = '') {
    if (!from || !to || from === to) return null
    if (edges.value.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))) {
      return null
    }
    const edge = { id: uid('e'), from, to, label }
    edges.value.push(edge)
    scheduleSave()
    return edge
  }

  function updateEdge(id, patch) {
    const edge = edges.value.find((e) => e.id === id)
    if (!edge) return
    Object.assign(edge, patch)
    scheduleSave()
  }

  function removeEdge(id) {
    edges.value = edges.value.filter((e) => e.id !== id)
    scheduleSave()
  }

  function clearAll() {
    nodes.value = []
    edges.value = []
    editingId.value = null
    scheduleSave()
  }

  /** Terapkan template: ganti seluruh isi kanvas dengan layout contoh. */
  function applyTemplate(tpl) {
    const keyToId = {}
    nodes.value = tpl.nodes.map((n) => {
      const fresh = addNodeLocal(n)
      keyToId[n.key] = fresh.id
      return fresh
    })
    edges.value = tpl.edges
      .map(([from, to, label]) => ({
        id: uid('e'),
        from: keyToId[from],
        to: keyToId[to],
        label: label ?? '',
      }))
      .filter((e) => e.from && e.to)
    editingId.value = null
    scheduleSave()
  }

  /** Bentuk node mentah tanpa menyentuh scheduleSave (dipakai applyTemplate). */
  function addNodeLocal(partial) {
    const shape = shapeById(partial.shape)
    return {
      id: uid('n'),
      role: 'setsumei',
      shape: shape.id,
      text: '',
      x: 100,
      y: 100,
      w: shape.w,
      h: shape.h,
      ...partial,
    }
  }

  return {
    nodes,
    edges,
    loading,
    saving,
    saveError,
    lastSavedAt,
    editingId,
    loadMap,
    saveMap,
    scheduleSave,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    updateEdge,
    removeEdge,
    clearAll,
    applyTemplate,
  }
}
