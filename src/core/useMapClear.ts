/**
 * core/useMapClear.ts
 * Aksi "Bersihkan kanvas" pada PetaPage dengan konfirmasi (useConfirm) —
 * memuat seluruh node/edges lewat useMapStore.clearAll, lalu memanggil
 * onCleared (PetaPage memakai ini untuk menghapus seleksi aktif).
 */
import { useMapStore } from '../composables/useMapStore.ts'
import { useConfirm } from '../composables/useConfirm.ts'

export function useMapClear(onCleared?: () => void) {
  const { nodes, clearAll } = useMapStore()
  const { confirmDialog } = useConfirm()

  async function onClear() {
    if (nodes.value.length === 0) return
    const ok = await confirmDialog({
      title: 'Bersihkan kanvas?',
      message: 'Seluruh node dan garis pada peta ini akan dihapus. Tindakan ini tidak bisa dibatalkan.',
      confirmText: 'Bersihkan',
      cancelText: 'Batal',
      danger: true,
    })
    if (!ok) return
    clearAll()
    onCleared?.()
  }

  return { onClear }
}
