/**
 * core/useMapInspector.ts
 * Logika panel properti MapInspector: turunkan node/edge terpilih dari
 * pilihan kanvas, plus aksi edit (peran, bentuk, teks, label, balik arah)
 * dan hapus — semuanya memakai API useMapStore.
 */
import { computed, isRef } from 'vue'
import type { Ref } from 'vue'
import type { ShapeDef } from '../types.ts'
import { useMapStore } from '../composables/useMapStore.ts'

/** Pilihan aktif di kanvas: { type: 'node'|'edge', id } atau null. */
export type MapSelection = { type: 'node' | 'edge'; id: string } | null

/** Getter pilihan aktif (props ter-unref) — dibaca reaktif oleh core. */
type SelectionSource = MapSelection | (() => MapSelection)

export function useMapInspector(
  selected: Ref<MapSelection> | SelectionSource,
  emitClear: () => void,
) {
  const sel = computed<MapSelection>(() => {
    const raw = isRef(selected) ? selected.value : (typeof selected === 'function' ? selected() : selected)
    return raw ?? null
  })

  const { nodes, edges, updateNode, removeNode, updateEdge, removeEdge } = useMapStore()

  const node = computed(() => {
    const s = sel.value
    if (s?.type !== 'node') return null
    return nodes.value.find((n) => n.id === s.id) ?? null
  })

  const edge = computed(() => {
    const s = sel.value
    if (s?.type !== 'edge') return null
    return edges.value.find((e) => e.id === s.id) ?? null
  })

  function onRoleChange(e: Event) {
    if (node.value) updateNode(node.value.id, { role: (e.target as HTMLSelectElement).value })
  }

  function onShapeClick(shape: ShapeDef) {
    if (!node.value) return
    updateNode(node.value.id, { shape: shape.id, w: shape.w, h: shape.h })
  }

  function onTextInput(e: Event) {
    if (node.value) updateNode(node.value.id, { text: (e.target as HTMLTextAreaElement).value })
  }

  function deleteNode() {
    if (!node.value) return
    removeNode(node.value.id)
    emitClear()
  }

  function onLabelInput(e: Event) {
    if (edge.value) updateEdge(edge.value.id, { label: (e.target as HTMLInputElement).value })
  }

  function flipEdge() {
    if (!edge.value) return
    updateEdge(edge.value.id, { from: edge.value.to, to: edge.value.from })
  }

  function deleteEdge() {
    if (!edge.value) return
    removeEdge(edge.value.id)
    emitClear()
  }

  return { node, edge, onRoleChange, onShapeClick, onTextInput, deleteNode, onLabelInput, flipEdge, deleteEdge }
}
