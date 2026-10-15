/**
 * core/useMapCanvasInteractions.ts
 * Interaksi pointer pada kanvas Peta Kalimat: blok seleksi (rubber-band),
 * drag tunggal, drag multi-select, dan menyambung node.
 * Semua fungsi memakai "konteks" berisi ref & API store — tidak ada state
 * tersembunyi di dalam modul ini, sehingga mudah dibaca & diuji.
 */
import type { Ref } from 'vue'
import type { MapNode } from '../types.ts'
import { CANVAS_H, CANVAS_W } from '../composables/useMapStore.ts'
import { boxRect, clamp, nodesInBox, toCanvasPoint, type Point } from './mapGeometry.ts'

export interface BoxSelState {
  startX: number
  startY: number
  curX: number
  curY: number
}

export interface ConnectingState {
  fromId: string
  x: number
  y: number
}

export interface MapInteractionContext {
  canvasEl: Ref<HTMLDivElement | null>
  zoom: Ref<number>
  editingId: Ref<string | null>
  nodes: Ref<MapNode[]>
  /** Kotak seleksi aktif — ditulis langsung untuk menggambar rubber-band. */
  boxSel: Ref<BoxSelState | null>
  /** Garis sementara saat menyambung node. */
  connecting: Ref<ConnectingState | null>
  /** updateNode/addEdge dari useMapStore. */
  updateNode: (id: string, patch: Partial<MapNode>) => void
  addEdge: (from: string, to: string) => unknown
  /** Hasil blok seleksi: himpunan id node terpilih. */
  onSelectMany: (ids: Set<string>) => void
  /** Seleksi tunggal / kosong (diteruskan ke parent via emit). */
  emitSelect: (type: string | null, id: string | null) => void
}

export function useMapCanvasInteractions(ctx: MapInteractionContext) {
  function canvasPoint(e: MouseEvent): Point {
    return toCanvasPoint(e, ctx.canvasEl.value, ctx.zoom.value)
  }

  /* ================================================================
     BOX SELECTION (rubber-band)
     ================================================================ */
  function startBoxSelect(e: PointerEvent) {
    if (e.button !== 0) return
    if (ctx.editingId.value) return

    const p = canvasPoint(e)
    ctx.boxSel.value = { startX: p.x, startY: p.y, curX: p.x, curY: p.y }

    const onMove = (ev: PointerEvent) => {
      const pt = canvasPoint(ev)
      if (ctx.boxSel.value) {
        ctx.boxSel.value = { ...ctx.boxSel.value, curX: pt.x, curY: pt.y }
      }
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)

      if (ctx.boxSel.value) {
        const { startX, startY, curX, curY } = ctx.boxSel.value
        const rect = boxRect(startX, startY, curX, curY)

        if (rect.w > 6 || rect.h > 6) {
          const ids = nodesInBox(ctx.nodes.value, rect)
          ctx.onSelectMany(ids)
          ctx.emitSelect(null, null)
        } else {
          ctx.onSelectMany(new Set())
          ctx.emitSelect(null, null)
        }
      }
      ctx.boxSel.value = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /* ================================================================
     DRAG MULTI-SELECT
     ================================================================ */
  function startMultiDrag(e: PointerEvent, startNode: MapNode, selectedIds: Set<string>) {
    if (e.button !== 0) return
    if (ctx.editingId.value === startNode.id) return

    const snapshots = new Map<string, { x: number; y: number }>()
    for (const id of selectedIds) {
      const n = ctx.nodes.value.find((nd) => nd.id === id)
      if (n) snapshots.set(id, { x: n.x, y: n.y })
    }

    const startPt = canvasPoint(e)

    const onMove = (ev: PointerEvent) => {
      const pt = canvasPoint(ev)
      const dx = Math.round(pt.x - startPt.x)
      const dy = Math.round(pt.y - startPt.y)
      for (const [id, snap] of snapshots) {
        const n = ctx.nodes.value.find((nd) => nd.id === id)
        if (!n) continue
        ctx.updateNode(id, {
          x: clamp(snap.x + dx, 0, CANVAS_W - n.w),
          y: clamp(snap.y + dy, 0, CANVAS_H - n.h),
        })
      }
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /* ================================================================
     DRAG SINGLE NODE
     ================================================================ */
  function startNodeDrag(e: PointerEvent, node: MapNode) {
    if (e.button !== 0) return
    if (ctx.editingId.value === node.id) return

    const el = e.currentTarget as HTMLElement
    const start = canvasPoint(e)
    const offX = start.x - node.x
    const offY = start.y - node.y

    const onMove = (ev: PointerEvent) => {
      const p = canvasPoint(ev)
      ctx.updateNode(node.id, {
        x: clamp(Math.round(p.x - offX), 0, CANVAS_W - node.w),
        y: clamp(Math.round(p.y - offY), 0, CANVAS_H - node.h),
      })
    }
    const onUp = () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
    el.setPointerCapture(e.pointerId)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  /* ================================================================
     SAMBUNG NODE
     ================================================================ */
  function startConnect(e: PointerEvent, node: MapNode) {
    e.preventDefault()
    const p = canvasPoint(e)
    ctx.connecting.value = { fromId: node.id, x: p.x, y: p.y }

    const onMove = (ev: PointerEvent) => {
      const pt = canvasPoint(ev)
      ctx.connecting.value = { fromId: node.id, x: pt.x, y: pt.y }
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.node')
      if (target?.dataset?.id) ctx.addEdge(node.id, target.dataset.id)
      ctx.connecting.value = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return { canvasPoint, startBoxSelect, startMultiDrag, startNodeDrag, startConnect }
}
