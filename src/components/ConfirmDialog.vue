<script setup>
import { nextTick, ref, watch } from 'vue'
import { useConfirm } from '../composables/useConfirm.js'

const { visible, options, handleConfirm, handleCancel } = useConfirm()

const overlayEl = ref(null)

// Pindahkan fokus ke overlay saat dibuka agar Esc berfungsi langsung.
watch(visible, async (open) => {
  if (open) {
    await nextTick()
    overlayEl.value?.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div
        v-if="visible"
        ref="overlayEl"
        class="confirm-scrim"
        tabindex="-1"
        @click.self="handleCancel"
        @keydown.esc="handleCancel"
      >
        <Transition name="confirm-pop" appear>
          <div
            class="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            :aria-label="options.title"
          >
            <span v-if="options.danger" class="confirm-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3 2.5 20h19L12 3Z" />
                <path d="M12 10v4" />
                <path d="M12 17.5v.01" />
              </svg>
            </span>

            <h3 class="confirm-title">{{ options.title }}</h3>
            <p class="confirm-msg">{{ options.message }}</p>

            <div class="confirm-actions">
              <button class="btn ghost" type="button" @click="handleCancel">
                {{ options.cancelText }}
              </button>
              <button
                class="btn"
                :class="options.danger ? 'danger' : 'primary'"
                type="button"
                @click="handleConfirm"
              >
                {{ options.confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ============ SCRIM ============ */
.confirm-scrim{
  position:fixed;inset:0;z-index:200;
  display:grid;place-items:center;
  padding:20px;
  background:rgba(20,22,26,.28);
  backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);
}
.confirm-scrim:focus{outline:none}

/* ============ KARTU DIALOG ============ */
.confirm-dialog{
  width:100%;max-width:420px;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  padding:26px 24px;
  transition:background-color .5s ease,border-color .5s ease;
}

.confirm-ico{
  display:inline-grid;place-items:center;
  width:38px;height:38px;border-radius:12px;
  border:1px solid var(--border);
  background:var(--surface-2);
  color:var(--accent-3);
  margin-bottom:14px;
}
.confirm-ico svg{width:19px;height:19px}

.confirm-title{
  font-size:1.1rem;font-weight:600;letter-spacing:-.02em;
  margin:0 0 10px;
}
.confirm-msg{
  font-size:.88rem;color:var(--muted);line-height:1.65;
  margin:0;
}

.confirm-actions{
  display:flex;justify-content:flex-end;gap:10px;
  flex-wrap:wrap;margin-top:24px;
}

/* Tombol aksi — mengikuti gaya .btn + token tema */
.btn.danger{
  background:var(--accent-3);
  border-color:transparent;
  color:#3c4046;
}
[data-theme="dark"] .btn.danger{color:#191b1f}
.btn.danger:hover{background:var(--accent);color:#3c4046}
[data-theme="dark"] .btn.danger:hover{color:#191b1f}

/* ============ ANIMASI ============ */
.confirm-fade-enter-active,
.confirm-fade-leave-active{transition:opacity .35s ease}
.confirm-fade-enter-from,
.confirm-fade-leave-to{opacity:0}

.confirm-pop-enter-active{
  transition:transform .45s var(--ease),opacity .35s ease;
}
.confirm-pop-leave-active{
  transition:transform .28s ease,opacity .22s ease;
}
.confirm-pop-enter-from,
.confirm-pop-leave-to{
  opacity:0;
  transform:translateY(14px) scale(.97);
}
</style>
