<script setup>
import { goTo } from '../composables/useNavigation.ts'
import { heroStats } from '../data/content.ts'
</script>

<template>
  <section class="panel" data-panel="0">
    <div class="wrap center">
      <span class="pill reveal" style="--d:.05s">N5 — Level pemula</span>
      <h1 class="reveal" style="--d:.12s">Mulai belajar <em>kosakata Jepang</em><br>dari kata paling sering dipakai.</h1>
      <p class="lead reveal" style="--d:.20s">
        Delapan kata dasar ini akan langsung berguna dalam percakapan sehari-hari.
        Dilengkapi romaji dan arti agar mudah dihafal sejak hari pertama.
      </p>
      <div class="cta reveal" style="--d:.28s">
        <button class="btn primary" type="button" @click="goTo(2)">Lihat kosakata</button>
        <button class="btn ghost" type="button" @click="goTo(1)">Cara menghafal</button>
      </div>
      <div class="stats reveal" style="--d:.38s">
        <div v-for="stat in heroStats" :key="stat.label" class="stat">
          <b>{{ stat.value }}</b><span>{{ stat.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
