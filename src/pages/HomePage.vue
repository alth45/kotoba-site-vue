<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  current,
  goTo,
  onWheel,
  onTouchStart,
  onTouchEnd,
  hideHint,
} from '../composables/useNavigation.ts'
import DotsNav from '../components/DotsNav.vue'
import ScrollHint from '../components/ScrollHint.vue'
import HeroPanel from '../components/HeroPanel.vue'
import BasicsPanel from '../components/BasicsPanel.vue'
import VocabPanel from '../components/VocabPanel.vue'
import FaqPanel from '../components/FaqPanel.vue'
import FooterPanel from '../components/FooterPanel.vue'

const panels = [HeroPanel, BasicsPanel, VocabPanel, FaqPanel, FooterPanel]
const route = useRoute()

/** Kelas posisi panel, sesuai logika paint() pada versi HTML asli. */
function panelClass(i) {
  return {
    'is-active': i === current.value,
    'is-above': i < current.value,
    'is-below': i > current.value,
  }
}

/** Dukung deep-link /?panel=N (dipakai menu bar saat dari halaman lain). */
function applyQueryPanel() {
  const target = Number.parseInt(route.query.panel, 10)
  if (!Number.isNaN(target)) goTo(target)
}

let hintTimer = null

onMounted(() => {
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  hintTimer = window.setTimeout(hideHint, 7000)
  applyQueryPanel()
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchend', onTouchEnd)
  if (hintTimer) window.clearTimeout(hintTimer)
})

watch(() => route.query.panel, applyQueryPanel)
</script>

<template>
  <main class="stage">
    <component
      :is="panels[i]"
      v-for="(panel, i) in panels"
      :key="i"
      :class="panelClass(i)"
    />
  </main>

  <DotsNav />
  <ScrollHint />
</template>
