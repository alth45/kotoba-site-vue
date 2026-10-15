/**
 * core/useNoteSidebar.ts
 * Composable sidebar referensi situs Jepang pada NotePage:
 * daftar situs (dari ./noteOptions.ts), preferensi localStorage, dan state iframe.
 */
import { computed, onMounted, ref } from 'vue'
import { SITES_JP } from './noteOptions.ts'

const SIDEBAR_KEY = 'kotoba-note-sidebar'
const SITE_KEY = 'kotoba-note-site'

export function useNoteSidebar() {
  const sidebarOpen = ref(false)
  const selectedSiteId = ref<string>('')
  const iframeLoading = ref(false)

  /** Ambil URL situs terpilih dari daftar */
  const currentSiteUrl = computed(() => {
    const site = SITES_JP.find((s) => s.id === selectedSiteId.value)
    return site?.url ?? ''
  })

  const currentSiteName = computed(() => {
    const site = SITES_JP.find((s) => s.id === selectedSiteId.value)
    return site?.name ?? ''
  })

  /** Toggle sidebar & simpan preferensi ke localStorage */
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
    try {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen.value))
    } catch { /* abaikan */ }
  }

  /** Pilih situs → update iframe loading state */
  function selectSite(id: string) {
    selectedSiteId.value = id
    iframeLoading.value = true
    try {
      localStorage.setItem(SITE_KEY, id)
    } catch { /* abaikan */ }
  }

  /** Muat preferensi saat mount */
  onMounted(() => {
    try {
      const open = localStorage.getItem(SIDEBAR_KEY)
      if (open !== null) sidebarOpen.value = open === 'true'
      const site = localStorage.getItem(SITE_KEY)
      if (site && SITES_JP.some((s) => s.id === site)) {
        selectedSiteId.value = site
      } else {
        selectedSiteId.value = SITES_JP[0].id // default: NHK Web Easy
      }
    } catch { /* abaikan */ }
  })

  return {
    SITES_JP,
    sidebarOpen,
    selectedSiteId,
    iframeLoading,
    currentSiteUrl,
    currentSiteName,
    toggleSidebar,
    selectSite,
  }
}
