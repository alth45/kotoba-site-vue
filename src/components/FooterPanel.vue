<script setup>
import { goTo } from '../composables/useNavigation.ts'
import { footerColumns } from '../data/content.ts'

function onLinkClick(e, target) {
  e.preventDefault()
  if (target !== undefined) goTo(target)
}
</script>

<template>
  <section class="panel" data-panel="4">
    <div class="wrap">
      <div class="footer-top">
        <div class="reveal" style="--d:.06s">
          <div class="brand">Kotoba</div>
          <p class="lead">Belajar kosakata Jepang sedikit demi sedikit. Dibuat sederhana agar kamu bisa mulai hari ini, tanpa bingung harus dari mana.</p>
        </div>

        <div class="footer-cols reveal" style="--d:.14s">
          <div v-for="col in footerColumns" :key="col.title">
            <h4>{{ col.title }}</h4>
            <a
              v-for="link in col.links"
              :key="link.label"
              href="#"
              @click="onLinkClick($event, link.target)"
            >{{ link.label }}</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom reveal" style="--d:.22s">
        <span>© 2025 Kotoba. Seluruh hak cipta dilindungi.</span>
        <span>Tekan <strong>Ctrl + M</strong> untuk membuka menu</span>
      </div>
    </div>
  </section>
</template>
