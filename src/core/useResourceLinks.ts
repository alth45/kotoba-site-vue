/**
 * core/useResourceLinks.ts
 * Composable state & aksi untuk halaman Sumber Belajar (ResourcePage).
 * Data/statistik murni ada di ./resourceLinks.ts — di sini hanya orkestrasi reaktif.
 */
import { computed, reactive, ref } from 'vue'
import {
  loadLinks,
  makeUserLink,
  normalizeUrl,
  saveLinks,
  PRESETS,
  type ResourceLink,
} from './resourceLinks.ts'

export function useResourceLinks() {
  /* ================================================================
     STATE
     ================================================================ */
  const userLinks = ref<ResourceLink[]>(loadLinks())
  const activeCategory = ref('Semua')

  /** Gabungkan preset + user links */
  const allLinks = computed(() => [...PRESETS, ...userLinks.value])

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
    if (!form.name.trim()) { formError.value = 'Nama tidak boleh kosong.'; return }
    if (!form.url.trim())  { formError.value = 'URL tidak boleh kosong.'; return }

    const url = normalizeUrl(form.url)
    try { new URL(url) } catch { formError.value = 'URL tidak valid.'; return }

    const entry = makeUserLink({ ...form, url })
    userLinks.value.push(entry)
    saveLinks(userLinks.value)

    justAdded.value = entry.id
    setTimeout(() => { justAdded.value = null }, 1800)

    form.name = ''
    form.url = ''
    form.category = ''
  }

  function removeLink(id: string) {
    userLinks.value = userLinks.value.filter((l) => l.id !== id)
    saveLinks(userLinks.value)
  }

  function togglePin(link: ResourceLink) {
    // Hanya user links yang bisa di-pin/unpin
    const idx = userLinks.value.findIndex((l) => l.id === link.id)
    if (idx !== -1) {
      userLinks.value[idx].pinned = !userLinks.value[idx].pinned
      saveLinks(userLinks.value)
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
