<script setup>
import { ref } from 'vue'
import { faqItems } from '../data/content.ts'

/** Indeks item FAQ yang terbuka (-1 = semua tertutup). */
const openIndex = ref(-1)
/** Tinggi konten jawaban yang sedang terbuka (untuk animasi max-height). */
const openHeight = ref(0)

function toggle(i, e) {
  const ans = e.currentTarget.nextElementSibling
  if (openIndex.value === i) {
    openIndex.value = -1
    return
  }
  openIndex.value = i
  openHeight.value = ans.scrollHeight
}
</script>

<template>
  <section class="panel" data-panel="3">
    <div class="wrap narrow">
      <div class="sec-head center reveal" style="--d:.05s">
        <span class="eyebrow">FAQ</span>
        <h2>Pertanyaan yang sering muncul.</h2>
      </div>

      <div class="faq-list">
        <div
          v-for="(item, i) in faqItems"
          :key="item.question"
          class="faq-item reveal"
          :class="{ open: openIndex === i }"
          :style="{ '--d': `${0.12 + i * 0.06}s` }"
        >
          <button class="faq-q" type="button" @click="toggle(i, $event)">
            <span>{{ item.question }}</span>
            <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <div class="faq-a" :style="{ maxHeight: openIndex === i ? `${openHeight}px` : '' }">
            <p v-html="item.answerHtml"></p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
