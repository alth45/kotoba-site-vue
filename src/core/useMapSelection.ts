/**
 * core/useMapSelection.ts
 * State multi-select (blok) pada kanvas Peta Kalimat.
 */
import { computed, ref } from 'vue'

export function useMapSelection() {
  const multiSelectedIds = ref(new Set<string>())
  const isMultiMode = computed(() => multiSelectedIds.value.size > 0)

  function clearMultiSelect() {
    multiSelectedIds.value = new Set()
  }

  function isMultiSelected(id: string) {
    return multiSelectedIds.value.has(id)
  }

  return { multiSelectedIds, isMultiMode, clearMultiSelect, isMultiSelected }
}
