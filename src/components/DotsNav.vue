<script setup>
import { current, goTo, PANEL_COUNT } from '../composables/useNavigation.js'

const dots = Array.from({ length: PANEL_COUNT }, (_, i) => i)
</script>

<template>
  <div class="dots" aria-hidden="true">
    <button
      v-for="i in dots"
      :key="i"
      class="dot"
      :class="{ 'is-on': i === current }"
      type="button"
      :aria-label="`Ke bagian ${i + 1}`"
      @click="goTo(i)"
    ></button>
  </div>
</template>
