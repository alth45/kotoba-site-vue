import { ref } from 'vue'

/**
 * State + logika navigasi antar panel (singleton).
 *
 * Diperlakukan sebagai modul berefek samping karena jumlah panel,
 * listener window (wheel/touch/keyboard), dan menu hanya ada satu
 * per halaman — sama persis dengan perilaku file HTML aslinya.
 */

export const PANEL_COUNT = 5

/** Indeks panel yang sedang aktif. */
export const current = ref(0)
/** Status menu melayang. */
export const menuOpen = ref(false)
/** Status hint bawah layar. */
export const hintHidden = ref(false)

/** Kunci animasi perpindahan panel (dicegah double-scroll). */
let locked = false
/** Debounce scroll wheel. */
let wheelArmed = true

export function hideHint(): void {
  hintHidden.value = true
}

export function goTo(index: number): void {
  const target = Math.max(0, Math.min(PANEL_COUNT - 1, index))
  if (target === current.value) return

  current.value = target

  const panel = document.querySelectorAll<HTMLElement>('.panel')[current.value]
  if (panel) panel.scrollTop = 0

  hideHint()

  locked = true
  window.setTimeout(() => {
    locked = false
  }, 800)
}

export function openMenu(): void {
  menuOpen.value = true
}

export function closeMenu(): void {
  menuOpen.value = false
}

export function toggleMenu(): void {
  menuOpen.value ? closeMenu() : openMenu()
}

/**
 * Cek apakah scroll di dalam panel masih bisa dilakukan ke arah dy.
 */
export function canScrollInside(panel: HTMLElement | undefined, dy: number): boolean {
  if (!panel) return false
  if (panel.scrollHeight <= panel.clientHeight + 2) return false
  if (dy > 0) return panel.scrollTop + panel.clientHeight < panel.scrollHeight - 2
  return panel.scrollTop > 2
}

export function onWheel(e: WheelEvent): void {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.panel'))
  const p = panels[current.value]
  if (canScrollInside(p, e.deltaY)) return
  e.preventDefault()
  if (locked || Math.abs(e.deltaY) < 8) return
  if (!wheelArmed) return
  wheelArmed = false
  window.setTimeout(() => {
    wheelArmed = true
  }, 620)
  goTo(current.value + (e.deltaY > 0 ? 1 : -1))
}

let touchY: number | null = null

export function onTouchStart(e: TouchEvent): void {
  touchY = e.touches[0].clientY
}

export function onTouchEnd(e: TouchEvent): void {
  if (touchY === null) return
  const dy = touchY - e.changedTouches[0].clientY
  touchY = null
  if (Math.abs(dy) < 55) return
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.panel'))
  const p = panels[current.value]
  if (canScrollInside(p, dy)) return
  goTo(current.value + (dy > 0 ? 1 : -1))
}

export function onKeydown(e: KeyboardEvent): void {
  if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'm' || e.key === 'M')) {
    e.preventDefault()
    toggleMenu()
    return
  }
  if (e.key === 'Escape') {
    if (menuOpen.value) {
      e.preventDefault()
      closeMenu()
    }
    return
  }
  if (menuOpen.value) return

  const target = e.target as HTMLElement | null
  const tag = target?.tagName ?? ''
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  switch (e.key) {
    case 'ArrowDown':
    case 'PageDown':
      e.preventDefault()
      goTo(current.value + 1)
      break
    case 'ArrowUp':
    case 'PageUp':
      e.preventDefault()
      goTo(current.value - 1)
      break
    case 'Home':
      e.preventDefault()
      goTo(0)
      break
    case 'End':
      e.preventDefault()
      goTo(PANEL_COUNT - 1)
      break
  }
}
