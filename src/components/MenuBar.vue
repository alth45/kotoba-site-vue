<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { menuOpen, current, closeMenu, goTo } from '../composables/useNavigation.ts'
import { useTheme } from '../composables/useTheme.ts'
import { navItems } from '../data/content.ts'

const route = useRoute()
const router = useRouter()
const { toggleTheme } = useTheme()

const onHome = computed(() => route.path === '/')

/** Item menu yang punya `page` langsung ke halaman; selain itu lompat panel di beranda. */
function onItemClick(item) {
  if (item.page) {
    router.push(item.page)
  } else if (onHome.value) {
    goTo(item.target)
  } else {
    router.push({ path: '/', query: { panel: item.target } })
  }
  if (menuOpen.value) closeMenu()
}

function isCurrentItem(item) {
  if (item.page) return route.path === item.page
  return onHome.value && item.target === current.value
}
</script>

<template>
  <div class="scrim" :class="{ open: menuOpen }" @click="closeMenu"></div>

  <header
    class="menubar"
    :class="{ open: menuOpen }"
    role="dialog"
    aria-label="Menu utama"
    :aria-hidden="menuOpen ? 'false' : 'true'"
  >
    <div class="menubar-inner">
      <span class="mb-logo" aria-hidden="true"></span>
      <nav class="mb-nav">
        <button
          v-for="item in navItems"
          :key="item.label"
          class="mb-item"
          :class="{ 'is-current': isCurrentItem(item) }"
          type="button"
          @click="onItemClick(item)"
        >
          {{ item.label }}
        </button>
      </nav>
      <span class="mb-divider" aria-hidden="true"></span>
      <button class="mb-icon" type="button" aria-label="Ganti tema" title="Ganti tema" @click="toggleTheme">
        <svg class="ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
        </svg>
        <svg class="ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        </svg>
      </button>
      <span class="mb-kbd">Ctrl M</span>
    </div>
  </header>
</template>
