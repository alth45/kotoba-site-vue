/**
 * core/useMapTemplate.ts
 * Terapkan template pola kalimat ke kanvas (MapPalette) — dengan konfirmasi
 * bila kanvas sudah berisi. Pemanggil cukup meneruskan hasil onTemplate ke
 * tombol "Terapkan" di daftar template.
 */
import type { MapTemplate } from '../types.ts'
import { useMapStore } from '../composables/useMapStore.ts'
import { useConfirm } from '../composables/useConfirm.ts'

export function useMapTemplate() {
  const { nodes, applyTemplate } = useMapStore()
  const { confirmDialog } = useConfirm()

  async function onTemplate(tpl: MapTemplate) {
    if (nodes.value.length > 0) {
      const ok = await confirmDialog({
        title: 'Ganti isi kanvas?',
        message: `Template "${tpl.label}" (${tpl.sample}) akan mengganti seluruh isi peta saat ini.`,
        confirmText: 'Terapkan',
        cancelText: 'Batal',
        danger: false,
      })
      if (!ok) return
    }
    applyTemplate(tpl)
  }

  return { onTemplate }
}
