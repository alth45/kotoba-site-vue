/**
 * core/useMapZoom.ts
 * Composable kontrol zoom kanvas peta (state + aksi + shortcut wheel).
 */
import { ref } from 'vue'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3
export const ZOOM_STEP = 0.15

export function useMapZoom() {
  const zoom = ref(1)

  function setZoom(val: number) {
    zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, val))
  }
  function zoomIn() { setZoom(zoom.value + ZOOM_STEP) }
  function zoomOut() { setZoom(zoom.value - ZOOM_STEP) }
  function zoomReset() { setZoom(1) }

  /** Zoom dengan Ctrl/Cmd + scroll pada workspace. */
  function onWheelZoom(e: WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
    setZoom(zoom.value + delta)
  }

  return { zoom, setZoom, zoomIn, zoomOut, zoomReset, onWheelZoom }
}
