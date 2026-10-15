import { ref, watch } from 'vue'

const THEME_STORAGE_KEY = 'kotoba-theme'

function getInitialTheme() {
  let saved = null
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY)
  } catch (e) {
    // localStorage tidak tersedia (mis. private mode) — abaikan.
  }
  if (!saved) {
    saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return saved
}

const theme = ref(getInitialTheme())

function applyTheme(value) {
  document.documentElement.setAttribute('data-theme', value)
}

// Terapkan tema saat modul dimuat, lalu setiap kali berubah.
applyTheme(theme.value)
watch(theme, (value) => {
  applyTheme(value)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch (e) {
    // Abaikan bila penyimpanan tidak tersedia.
  }
})

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return { theme, toggleTheme }
}
