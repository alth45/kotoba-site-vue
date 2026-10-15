<script setup>
import { featureCards } from '../data/content.ts'
</script>

<template>
  <section class="panel" data-panel="1">
    <div class="wrap">
      <div class="sec-head reveal" style="--d:.05s">
        <span class="eyebrow">Dasar</span>
        <h2>Tiga hal yang membuat hafalan lebih mudah.</h2>
        <p class="lead">Pendekatan sederhana agar kosakata Jepang benar-benar menempel di ingatan, bukan sekadar lewat.</p>
      </div>

      <div class="grid-3">
        <article
          v-for="(card, i) in featureCards"
          :key="card.title"
          class="card reveal"
          :style="{ '--d': `${0.14 + i * 0.08}s` }"
        >
          <span class="ico" :style="{ '--ico': card.color }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path v-for="d in card.paths" :key="d" :d="d" />
            </svg>
          </span>
          <h3>{{ card.title }}</h3>
          <p>{{ card.text }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
