/**
 * core/useSitusGroup.ts
 * Composable state & aksi untuk halaman SitusGroup.
 * Data/statistik murni ada di ./situsGroup.ts — di sini hanya orkestrasi reaktif.
 */
import { computed, reactive, ref } from 'vue'
import {
  loadSitusLinks,
  makeSitusUserLink,
  sgNormalizeUrl,
  saveSitusLinks,
  SG_PRESETS,
  type SitusGroupLink,
} from './situsGroup.ts'

export function useSitusGroup() {
  /* ================================================================
     STATE
     ================================================================ */
  const userLinks = ref<SitusGroupLink[]>(loadSitusLinks())
  const activeCategory = ref('Semua')

  /** Gabungkan preset + user links */
  const allLinks = computed(() => [...SG_PRESETS, ...userLinks.value])

  const categories = computed(() => {
    const cats = new Set(allLinks.value.map((l) => l.category))
    return ['Semua', ...cats]
  })

  const filtered = computed(() => {
    if (activeCategory.value === 'Semua') return allLinks.value
    return allLinks.value.filter((l) => l.category === activeCategory.value)
  })

  const pinnedLinks = computed(() => filtered.value.filter((l) => l.pinned))
  const normalLinks = computed(() => filtered.value.filter((l) => !l.pinned))

  /* ================================================================
     FORM
     ================================================================ */
  const form = reactive({ name: '', url: '', category: '' })
  const formError = ref('')
  const justAdded = ref<string | null>(null)

  function addLink() {
    formError.value = ''
    if (!form.name.trim()) { formError.value = 'Nama link tidak boleh kosong.'; return }
    if (!form.url.trim())  { formError.value = 'URL tidak boleh kosong.'; return }

    const url = sgNormalizeUrl(form.url)
    try { new URL(url) } catch { formError.value = 'URL tidak valid.'; return }

    const entry = makeSitusUserLink({ ...form, url })
    userLinks.value.push(entry)
    saveSitusLinks(userLinks.value)

    justAdded.value = entry.id
    setTimeout(() => { justAdded.value = null }, 1800)

    form.name = ''
    form.url = ''
    form.category = ''
  }

  function removeLink(id: string) {
    userLinks.value = userLinks.value.filter((l) => l.id !== id)
    saveSitusLinks(userLinks.value)
  }

  function togglePin(link: SitusGroupLink) {
    // Hanya user links yang bisa di-pin/unpin
    const idx = userLinks.value.findIndex((l) => l.id === link.id)
    if (idx !== -1) {
      userLinks.value[idx].pinned = !userLinks.value[idx].pinned
      saveSitusLinks(userLinks.value)
    }
  }

  const isUserLink = (id: string) => userLinks.value.some((l) => l.id === id)

  return {
    userLinks,
    activeCategory,
    allLinks,
    categories,
    filtered,
    pinnedLinks,
    normalLinks,
    form,
    formError,
    justAdded,
    addLink,
    removeLink,
    togglePin,
    isUserLink,
  }
}
