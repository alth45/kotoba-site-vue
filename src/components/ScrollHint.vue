<script setup>
import { hintHidden } from '../composables/useNavigation.js'
</script>

<template>
  <div class="hint" :class="{ hide: hintHidden }">
    <span>Scroll untuk berpindah</span>
    <kbd>Ctrl</kbd><kbd>M</kbd>
    <span>menu</span>
  </div>
</template>
