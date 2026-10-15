import { ref, watch } from 'vue'

const THEME_STORAGE_KEY = 'kotoba-theme'

/** Nama tema yang didukung situs. */
type ThemeName = 'light' | 'dark'

function getInitialTheme(): ThemeName {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    // localStorage tidak tersedia (mis. private mode) — abaikan.
  }
  if (saved !== 'dark' && saved !== 'light') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return saved
}

const theme = ref<ThemeName>(getInitialTheme())

function applyTheme(value: ThemeName): void {
  document.documentElement.setAttribute('data-theme', value)
}

// Terapkan tema saat modul dimuat, lalu setiap kali berubah.
applyTheme(theme.value)
watch(theme, (value) => {
  applyTheme(value)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // Abaikan bila penyimpanan tidak tersedia.
  }
})

export function useTheme() {
  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return { theme, toggleTheme }
}
