/**
 * core/useMapPaletteDrag.ts
 * Drag item dari palet ke kanvas (ghost mengikuti kursor) untuk MapPalette.
 */
import { ref } from 'vue'
import type { MapNodeInput } from '../types.ts'

export interface PaletteGhost {
  label: string
  x: number
  y: number
}

/** Susun payload node sesuai jenis item palet (bentuk / peran / partikel). */
export function payloadFor(kind: string, value: string): MapNodeInput {
  if (kind === 'shape') return { shape: value, role: 'setsumei' }
  if (kind === 'role') return { role: value, shape: 'kotak' }
  return { role: 'joshi', shape: 'elips', text: value, w: 110, h: 56 }
}

export function useMapPaletteDrag() {
  const ghost = ref<PaletteGhost | null>(null)

  /**
   * Mulai press pada item palet.
   * - Bila bergerak > 5px → dianggap drag; saat lepas panggil `onDrop` (posisi kursor).
   * - Klik biasa → panggil `onClick`.
   */
  function onPaletteDown(
    event: PointerEvent,
    kind: string,
    value: string,
    label: string,
    handlers: {
      onDrop: (payload: MapNodeInput, clientX: number, clientY: number) => void
      onClick: (payload: MapNodeInput) => void
    },
  ) {
    if (event.button !== 0) return
    let pressStarted = false
    const startX = event.clientX
    const startY = event.clientY

    const onMove = (ev: PointerEvent) => {
      if (!pressStarted) {
        if (Math.abs(ev.clientX - startX) < 5 && Math.abs(ev.clientY - startY) < 5) return
        pressStarted = true
      }
      ghost.value = { label, x: ev.clientX, y: ev.clientY }
    }

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const started = pressStarted
      ghost.value = null

      const payload = payloadFor(kind, value)
      if (started) {
        // Dari drag: jatuhkan tepat di kursor (posisi di-clamp ke kanvas).
        handlers.onDrop(payload, ev.clientX, ev.clientY)
      } else {
        // Klik biasa: tambah di tengah + langsung edit teks.
        handlers.onClick(payload)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return { ghost, onPaletteDown }
}
