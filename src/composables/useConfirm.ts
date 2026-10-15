import { ref } from 'vue'
import type { ConfirmOptions, ResolvedConfirmOptions } from '../types.ts'

/**
 * Dialog konfirmasi global (singleton, berbasis Promise).
 * Komponen <ConfirmDialog /> dipasang sekali di App.vue.
 */

const visible = ref(false)

const options = ref<ResolvedConfirmOptions>({
  title: 'Konfirmasi',
  message: '',
  confirmText: 'Ya, lanjutkan',
  cancelText: 'Batal',
  danger: false,
})

let resolvePromise: ((value: boolean) => void) | null = null

export function useConfirm() {
  /** Tampilkan dialog; resolve `true` bila dikonfirmasi, `false` bila dibatalkan. */
  function confirmDialog(opt: ConfirmOptions = {}): Promise<boolean> {
    options.value = {
      title: opt.title ?? 'Konfirmasi',
      message: opt.message ?? '',
      confirmText: opt.confirmText ?? 'Ya, lanjutkan',
      cancelText: opt.cancelText ?? 'Batal',
      danger: opt.danger ?? false,
    }
    visible.value = true
    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  function settle(result: boolean): void {
    visible.value = false
    const pending = resolvePromise
    resolvePromise = null
    if (pending) pending(result)
  }

  function handleConfirm(): void {
    settle(true)
  }

  function handleCancel(): void {
    settle(false)
  }

  return { visible, options, confirmDialog, handleConfirm, handleCancel }
}
