import { ref } from 'vue'

/**
 * Dialog konfirmasi global (singleton, berbasis Promise).
 * Komponen <ConfirmDialog /> dipasang sekali di App.vue.
 */

const visible = ref(false)

const options = ref({
  title: 'Konfirmasi',
  message: '',
  confirmText: 'Ya, lanjutkan',
  cancelText: 'Batal',
  danger: false,
})

let resolvePromise = null

export function useConfirm() {
  /** Tampilkan dialog; resolve `true` bila dikonfirmasi, `false` bila dibatalkan. */
  function confirmDialog(opt = {}) {
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

  function settle(result) {
    visible.value = false
    const pending = resolvePromise
    resolvePromise = null
    if (pending) pending(result)
  }

  function handleConfirm() {
    settle(true)
  }

  function handleCancel() {
    settle(false)
  }

  return { visible, options, confirmDialog, handleConfirm, handleCancel }
}
