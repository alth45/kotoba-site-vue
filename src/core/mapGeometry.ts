/**
 * core/mapGeometry.ts
 * Util geometri murni untuk kanvas Peta Kalimat (MapCanvas):
 * konversi koordinat, clamp, gaya node, dan jalur bezier garis penghubung.
 */
import type { MapEdge, MapNode } from '../types.ts'
import { roleById, shapeById } from '../composables/useMapStore.ts'

export interface Point { x: number; y: number }

/** Batas luar seleksi rubber-band → kotak {x,y,w,h} di koordinat kanvas. */
export function boxRect(startX: number, startY: number, curX: number, curY: number) {
  return {
    x: Math.min(startX, curX),
    y: Math.min(startY, curY),
    w: Math.abs(curX - startX),
    h: Math.abs(curY - startY),
  }
}

/** Node mana saja yang tersentuh kotak seleksi? Kembalikan himpunan id. */
export function nodesInBox(nodes: MapNode[], rect: { x: number; y: number; w: number; h: number }) {
  const ids = new Set<string>()
  for (const n of nodes) {
    if (n.x < rect.x + rect.w && n.x + n.w > rect.x && n.y < rect.y + rect.h && n.y + n.h > rect.y) {
      ids.add(n.id)
    }
  }
  return ids
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/** Posisi kursor (px layar) → koordinat logis kanvas (dibagi faktor zoom). */
export function toCanvasPoint(
  e: MouseEvent,
  canvasEl: HTMLElement | null,
  zoom: number,
): Point {
  if (!canvasEl) return { x: 0, y: 0 }
  const rect = canvasEl.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) / zoom,
    y: (e.clientY - rect.top) / zoom,
  }
}

/** Gaya inline kartu node (posisi, ukuran, radius bentuk, warna peran). */
export function nodeStyle(node: MapNode): Record<string, string> {
  const shape = shapeById(node.shape)
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.w}px`,
    height: `${node.h}px`,
    borderRadius: shape.radius,
    '--role-color': roleById(node.role).color,
  }
}

/** Garis sementara saat menyambung node — bezier dari pusat src ke titik kursor. */
export function tempEdgePath(src: MapNode | undefined, x: number, y: number): string {
  if (!src) return ''
  const x1 = src.x + src.w / 2
  const y1 = src.y + src.h / 2
  const c = Math.max(50, Math.abs(x - x1) * 0.4)
  const dir = x >= x1 ? 1 : -1
  return `M ${x1} ${y1} C ${x1 + c * dir} ${y1}, ${x - c * dir} ${y}, ${x} ${y}`
}

export interface EdgePath extends MapEdge {
  d: string
  midX: number
  midY: number
}

/** Hitung path bezier + titik label untuk semua edge antar node. */
export function buildEdgePaths(edges: MapEdge[], nodes: MapNode[]): EdgePath[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const out: EdgePath[] = []
  for (const e of edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) continue
    const x1 = a.x + a.w / 2
    const y1 = a.y + a.h / 2
    const x2 = b.x + b.w / 2
    const y2 = b.y + b.h / 2
    const dx = x2 - x1
    const c = Math.max(60, Math.abs(dx) * 0.4)
    const c1x = x1 + (dx >= 0 ? c : -c)
    const c2x = x2 + (dx >= 0 ? -c : c)
    out.push({
      ...e,
      d: `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`,
      midX: (x1 + 3 * c1x + 3 * c2x + x2) / 8,
      midY: (y1 + 3 * y1 + 3 * y2 + y2) / 8,
    })
  }
  return out
}

/** Perkiraan lebar label edge berdasarkan panjang teks. */
export function labelWidth(label: string): number {
  return label.length * 11 + 16
}
