/**
 * core/useMapStatus.ts
 * Teks & kelas "pill" status simpan otomatis pada header PetaPage
 * (memakai state global useMapStore — pola yang sama dengan useNoteEditor).
 */
import { computed } from 'vue'
import { useMapStore } from '../composables/useMapStore.ts'

export function useMapStatus() {
  const { loading, saving, saveError, lastSavedAt } = useMapStore()

  const statusText = computed(() => {
    if (loading.value) return 'Memuat…'
    if (saveError.value) return saveError.value
    if (saving.value) return 'Menyimpan…'
    if (lastSavedAt.value) {
      return `Tersimpan ${lastSavedAt.value.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    }
    return 'Siap — perubahan tersimpan otomatis'
  })

  const statusClass = computed(() => ({
    'is-saving': saving.value,
    'is-error': !!saveError.value,
  }))

  return { statusText, statusClass }
}
