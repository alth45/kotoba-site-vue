<script setup lang="ts">
/**
 * SitusViewerPage.vue — halaman render internal untuk SitusGroup.
 * Saat kartu link diklik di SitusGroupPage, kita berpindah ke halaman ini
 * (tetap di dalam web yang sama, tanpa tab baru) dan situs tujuan dirender
 * lewat iframe. Ada fallback sessionStorage agar tahan terhadap refresh.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { sgGetDomain, sgGetFavicon } from '../core/situsGroup.ts'
import { useSitusGroup } from '../core/useSitusGroup.ts'

const { viewerActive } = useSitusGroup()

const link = viewerActive
const loading = ref(true)
const frameKey = ref(0)

// Setiap kali link berganti, reset state loading
watch(link, () => { loading.value = true })

function reloadFrame() {
  loading.value = true
  frameKey.value += 1
}

onBeforeUnmount(() => {
  try { sessionStorage.removeItem('kotoba-situsgroup-viewer') } catch { /* abaikan */ }
})
</script>

<template>
  <main class="situsviewer-page">
    <!-- ====== TOOLBAR ====== -->
    <header class="sv-bar">
      <RouterLink class="sv-back" to="/situsgroup">← Kembali ke SitusGroup</RouterLink>

      <div v-if="link" class="sv-title">
        <img
          class="sv-favicon"
          :src="sgGetFavicon(link.url)"
          alt=""
          width="16" height="16"
          @error="($event.target as HTMLElement).style.display='none'"
        />
        <span class="sv-name">{{ link.name }}</span>
        <span class="sv-domain">{{ sgGetDomain(link.url) }}</span>
      </div>

      <div v-if="link" class="sv-actions">
        <button class="sv-btn" type="button" title="Muat ulang halaman" @click="reloadFrame">⟳ Muat Ulang</button>
        <a
          class="sv-btn sv-btn--open"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          title="Buka di tab baru bila situs memblokir embed"
        >↗ Buka Tab</a>
      </div>
    </header>

    <!-- ====== FRAME RENDER ====== -->
    <div v-if="link" class="sv-frame-wrap">
      <div v-if="loading" class="sv-loading">Memuat {{ link.name }}…</div>
      <iframe
        :key="frameKey"
        class="sv-iframe"
        :src="link.url"
        :title="`Render ${link.name}`"
        referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        loading="eager"
        @load="loading = false"
      ></iframe>
    </div>

    <!-- ====== EMPTY STATE (mis. dibuka langsung tanpa klik kartu) ====== -->
    <div v-else class="sv-empty">
      <p class="sv-empty-icon">🔗</p>
      <h2>Tidak ada situs untuk dirender</h2>
      <p>Klik salah satu kartu link di halaman SitusGroup untuk membukanya di sini.</p>
      <RouterLink class="sv-btn sv-btn--primary" to="/situsgroup">Ke Daftar Situs</RouterLink>
    </div>

    <p v-if="link" class="sv-hint">
      💡 Situs dirender di dalam halaman ini. Bila area kosong, situs tersebut memblokir
      embed (X-Frame-Options) — gunakan tombol “Buka Tab”.
    </p>
  </main>
</template>

<style scoped>
.situsviewer-page {
  min-height: 100vh;
  height: 100vh;
  padding: clamp(16px, 3vh, 28px) clamp(16px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* ---------- Toolbar ---------- */
.sv-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
}

.sv-back {
  font-size: .78rem;
  color: var(--muted);
  text-decoration: none;
  white-space: nowrap;
  transition: color .25s;
}
.sv-back:hover { color: var(--text); }

.sv-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.sv-favicon { width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0; }
.sv-name {
  font-size: .85rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sv-domain {
  font-size: .72rem;
  color: var(--muted);
  white-space: nowrap;
}

.sv-actions { display: flex; gap: 6px; margin-left: auto; }

.sv-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: .75rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color .2s, color .2s;
}
.sv-btn:hover { border-color: var(--accent-2); color: var(--accent-2); }
.sv-btn--primary {
  background: var(--accent-2);
  border-color: var(--accent-2);
  color: #fff;
}
.sv-btn--primary:hover { color: #fff; opacity: .9; }

/* ---------- Frame ---------- */
.sv-frame-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 300px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: #fff;
}
.sv-iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
.sv-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .85rem;
  color: var(--muted);
  background: var(--surface);
  z-index: 1;
}

/* ---------- Empty state ---------- */
.sv-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--muted);
  text-align: center;
  padding: 24px;
}
.sv-empty h2 { color: var(--text); font-size: 1.1rem; margin: 0; }
.sv-empty p { margin: 0; font-size: .82rem; }
.sv-empty-icon { font-size: 2rem; }
.sv-empty .sv-btn--primary { margin-top: 10px; }

.sv-hint {
  margin: 0;
  font-size: .72rem;
  line-height: 1.5;
  color: var(--muted);
}
</style>
