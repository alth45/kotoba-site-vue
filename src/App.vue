<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { menuOpen, onKeydown, toggleMenu, closeMenu } from './composables/useNavigation.ts'
import MenuBar from './components/MenuBar.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'

const route = useRoute()

/**
 * Keyboard global. Di beranda, seluruh shortcut aktif (navigasi panel,
 * Ctrl+M, Esc). Di halaman lain, hanya Ctrl+M & Esc yang dipakai.
 */
function onKeydownGlobal(e: KeyboardEvent) {
  if (route.path !== '/') {
    if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault()
      toggleMenu()
      return
    }
    if (e.key === 'Escape' && menuOpen.value) {
      e.preventDefault()
      closeMenu()
    }
    return
  }
  onKeydown(e)
}

onMounted(() => {
  window.addEventListener('keydown', onKeydownGlobal)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydownGlobal)
})
</script>

<template>
  <MenuBar />
  <RouterView />
  <ConfirmDialog />
</template>
