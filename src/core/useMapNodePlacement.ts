/**
 * core/useMapNodePlacement.ts
 * Penambahan node pada kanvas: dari palet (klik → tengah kanvas, atau drag →
 * posisi jatuh), termasuk normalisasi canvasRef untuk MapPalette.
 */
import type { Ref } from 'vue'
import type { MapNodeInput } from '../types.ts'
import { CANVAS_H, CANVAS_W, shapeById } from '../composables/useMapStore.ts'
import { clamp } from './mapGeometry.ts'

export interface PlacementContext {
  workspaceEl: Ref<HTMLDivElement | null>
  canvasEl: Ref<HTMLDivElement | null>
  zoom: Ref<number>
  editingId: Ref<string | null>
  addNode: (input: MapNodeInput & { x: number; y: number }) => { id: string }
  clearMultiSelect: () => void
  emitSelect: (type: string | null, id: string | null) => void
}

/** API yang diekspos MapCanvas via defineExpose. */
export interface CanvasApi {
  addCentered: (payload: MapNodeInput, autoEdit?: boolean) => unknown
  tryDrop: (payload: MapNodeInput, clientX: number, clientY: number) => unknown
}

/**
 * canvasRef bisa berupa instance komponen (hasil auto-unwrap template Vue)
 * ATAU ref murni — dinormalisasi dulu supaya tryDrop/addCentered selalu terpanggil.
 */
export function normalizeCanvasApi(
  c: { value?: CanvasApi } | CanvasApi | null | undefined,
): CanvasApi | null {
  if (!c) return null
  if (typeof c === 'object' && 'value' in c) return (c as { value: CanvasApi }).value ?? null
  return c as CanvasApi
}

export function useMapNodePlacement(ctx: PlacementContext) {
  /** Tambah node di sekitar tengah kanvas; autoEdit → langsung edit teks. */
  function addCentered(payload: MapNodeInput, autoEdit = false) {
    const shape = shapeById(payload.shape ?? 'kotak')
    const w = payload.w ?? shape.w
    const h = payload.h ?? shape.h
    const node = ctx.addNode({
      ...payload,
      x: Math.round((CANVAS_W - w) / 2 + (Math.random() * 60 - 30)),
      y: Math.round((CANVAS_H - h) / 2 + (Math.random() * 40 - 20)),
    })
    ctx.clearMultiSelect()
    ctx.emitSelect('node', node.id)
    if (autoEdit) ctx.editingId.value = node.id
    return node
  }

  /** Jatuhkan node dari drag palet — hanya bila titik jatuh di dalam workspace. */
  function tryDrop(payload: MapNodeInput, clientX: number, clientY: number) {
    const wsRect = ctx.workspaceEl.value?.getBoundingClientRect()
    const cvRect = ctx.canvasEl.value?.getBoundingClientRect()
    if (!wsRect || !cvRect) return null

    const inside =
      clientX >= wsRect.left && clientX <= wsRect.right &&
      clientY >= wsRect.top && clientY <= wsRect.bottom
    if (!inside) return null

    const shape = shapeById(payload.shape ?? 'kotak')
    const w = payload.w ?? shape.w
    const h = payload.h ?? shape.h
    const x = clamp(Math.round((clientX - cvRect.left) / ctx.zoom.value - w / 2), 0, CANVAS_W - w)
    const y = clamp(Math.round((clientY - cvRect.top) / ctx.zoom.value - h / 2), 0, CANVAS_H - h)
    const node = ctx.addNode({ ...payload, x, y })
    ctx.clearMultiSelect()
    ctx.emitSelect('node', node.id)
    return node
  }

  return { addCentered, tryDrop }
}
