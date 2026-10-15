<script setup>
import { onMounted } from 'vue'
import { useVocabStore } from '../composables/useVocabStore.js'

// Preview 10 baris pertama — tanpa memuat seluruh data.
const { previewItems, previewTotal, previewLoading, previewError, loadPreview } = useVocabStore()

onMounted(loadPreview)
</script>

<template>
  <section class="panel" data-panel="2">
    <div class="wrap">
      <div class="sec-head center reveal" style="--d:.05s">
        <span class="eyebrow">Kosakata</span>
        <h2>Kosakata dasar untukmu.</h2>
        <p class="lead">Semua kata di bawah ini termasuk level N5 — bisa langsung dipakai setiap hari.</p>
      </div>

      <div class="reveal" style="--d:.14s">
        <table class="vocab-table">
          <thead>
            <tr>
              <th>日本語</th>
              <th>Romaji</th>
              <th>Arti</th>
              <th>Kategori</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="word in previewItems" :key="word.id">
              <td class="jp">{{ word.jp }}</td>
              <td class="romaji">{{ word.romaji }}</td>
              <td class="arti">{{ word.arti }}</td>
              <td><span class="tag">{{ word.kategori }}</span></td>
            </tr>
            <tr v-if="previewLoading">
              <td class="arti" colspan="4" style="text-align:center;color:var(--muted);padding:26px">
                Memuat kosakata dari server…
              </td>
            </tr>
            <tr v-else-if="previewError">
              <td class="arti" colspan="4" style="text-align:center;color:var(--accent-3);padding:26px">
                Gagal memuat kosakata — {{ previewError }}
              </td>
            </tr>
            <tr v-else-if="previewItems.length === 0">
              <td class="arti" colspan="4" style="text-align:center;color:var(--muted);padding:26px">
                Belum ada kosakata — tambahkan di halaman kelola.
              </td>
            </tr>
          </tbody>
        </table>
        <p
          v-if="previewTotal > previewItems.length"
          style="text-align:center;font-size:.78rem;color:var(--muted);margin-top:12px"
        >
          Menampilkan {{ previewItems.length }} dari {{ previewTotal }} kosakata —
          kelola selengkapnya di halaman kosakata.
        </p>
      </div>

      <div class="panel-cta reveal" style="--d:.22s">
        <RouterLink class="btn ghost" to="/kosakata">Kelola daftar kosakata →</RouterLink>
      </div>
    </div>
  </section>
</template>
