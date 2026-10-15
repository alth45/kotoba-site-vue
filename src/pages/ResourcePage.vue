<script setup lang="ts">
/**
 * ResourcePage.vue — halaman daftar sumber belajar.
 * Data preset, helper murni (domain/favicon/warna), dan seluruh state +
 * aksi link dipisah ke src/core/resourceLinks.ts & src/core/useResourceLinks.ts.
 * Script ini hanya memanggil fungsi utamanya dan meneruskan hasilnya ke template.
 */
import { CATEGORIES, getDomain, getFavicon, getCategoryColor } from '../core/resourceLinks.ts'
import { useResourceLinks } from '../core/useResourceLinks.ts'

const {
  activeCategory, allLinks, categories, filtered, pinnedLinks, normalLinks,
  form, formError, justAdded, addLink, removeLink, togglePin, isUserLink,
} = useResourceLinks()
</script>

<template>
  <main class="resource-page">
    <!-- ====== HEADER ====== -->
    <header class="rp-head">
      <div class="rp-head-text">
        <RouterLink class="back" to="/">← Kembali ke beranda</RouterLink>
        <span class="eyebrow">Referensi</span>
        <h1>Sumber Belajar Bahasa Jepang</h1>
        <p class="lead">Kumpulan tautan terpilih — kamus, berita, latihan JLPT, hingga hiburan berbahasa Jepang.</p>
      </div>
    </header>

    <!-- ====== ADD FORM ====== -->
    <section class="add-form-wrap" aria-label="Tambah tautan baru">
      <form class="add-form" @submit.prevent="addLink" novalidate>
        <div class="form-row">
          <div class="field">
            <label class="field-label" for="res-name">Nama</label>
            <input
              id="res-name"
              v-model="form.name"
              class="field-input"
              type="text"
              placeholder="mis. Jisho — Kamus Jepang"
              autocomplete="off"
              maxlength="60"
            />
          </div>
          <div class="field field--url">
            <label class="field-label" for="res-url">URL</label>
            <input
              id="res-url"
              v-model="form.url"
              class="field-input"
              type="url"
              placeholder="https://..."
              autocomplete="off"
            />
          </div>
          <div class="field field--cat">
            <label class="field-label" for="res-cat">Kategori</label>
            <select id="res-cat" v-model="form.category" class="field-input field-select">
              <option value="">Pilih…</option>
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <button class="add-btn" type="submit">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            Tambah
          </button>
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
      </form>
    </section>

    <!-- ====== FILTER PILLS ====== -->
    <div class="filter-bar" role="tablist" aria-label="Filter kategori">
      <button
        v-for="cat in categories"
        :key="cat"
        class="cat-pill"
        :class="{ active: activeCategory === cat }"
        type="button"
        role="tab"
        :aria-selected="activeCategory === cat"
        @click="activeCategory = cat"
      >
        {{ cat }}
        <span class="cat-count">
          {{ cat === 'Semua' ? allLinks.length : allLinks.filter(l => l.category === cat).length }}
        </span>
      </button>
    </div>

    <!-- ====== GRID (dalam container dengan scroll) ====== -->
    <div class="grid-scroll-container">
      <div class="link-grid-wrap">
      <!-- Pinned section -->
      <template v-if="pinnedLinks.length">
        <p class="section-label">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
            <path d="M6.5 1.5A1 1 0 0 0 5 1.5l-.5 3.5L2 6v1h3v3.5l.5.5.5-.5V7h3V6L6.5 5l-.5-3.5Z"/>
          </svg>
          Disematkan
        </p>
        <div class="link-grid">
          <a
            v-for="link in pinnedLinks"
            :key="link.id"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="link-card pinned"
            :class="{ 'just-added': justAdded === link.id }"
          >
            <span class="card-cat-bar" :style="{ background: getCategoryColor(link.category) }"></span>
            <div class="card-inner">
              <div class="card-top">
                <img
                  class="card-favicon"
                  :src="getFavicon(link.url)"
                  alt=""
                  width="16" height="16"
                  loading="lazy"
                  @error="($event.target as HTMLElement).style.display='none'"
                />
                <span class="card-cat-badge" :style="{ color: getCategoryColor(link.category) }">{{ link.category }}</span>
                <div class="card-actions" @click.prevent.stop>
                  <button
                    v-if="isUserLink(link.id)"
                    class="card-action-btn"
                    type="button"
                    title="Hapus"
                    @click="removeLink(link.id)"
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2 2l7 7M9 2l-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <p class="card-name">{{ link.name }}</p>
              <span class="card-domain">{{ getDomain(link.url) }}</span>
            </div>
          </a>
        </div>
      </template>

      <!-- All / Filtered links -->
      <p v-if="normalLinks.length" class="section-label">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.2"/>
          <path d="M5.5 4v3M5.5 7.5v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        {{ activeCategory === 'Semua' ? 'Semua Tautan' : activeCategory }}
      </p>
      <div class="link-grid">
        <a
          v-for="link in normalLinks"
          :key="link.id"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="link-card"
          :class="{ 'just-added': justAdded === link.id }"
        >
          <span class="card-cat-bar" :style="{ background: getCategoryColor(link.category) }"></span>
          <div class="card-inner">
            <div class="card-top">
              <img
                class="card-favicon"
                :src="getFavicon(link.url)"
                alt=""
                width="16" height="16"
                loading="lazy"
                @error="($event.target as HTMLElement).style.display='none'"
              />
              <span class="card-cat-badge" :style="{ color: getCategoryColor(link.category) }">{{ link.category }}</span>
              <div class="card-actions" @click.prevent.stop>
                <button
                  v-if="isUserLink(link.id)"
                  class="card-action-btn"
                  type="button"
                  :title="link.pinned ? 'Lepas sematkan' : 'Sematkan'"
                  @click="togglePin(link)"
                >
                  <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor">
                    <path d="M5.8.8A.8.8 0 0 0 4.2.8L3.8 4 1.5 5v.8h3v3L5 9l.5-.2v-3h3V5L6.2 4 5.8.8Z"/>
                  </svg>
                </button>
                <button
                  v-if="isUserLink(link.id)"
                  class="card-action-btn del"
                  type="button"
                  title="Hapus"
                  @click="removeLink(link.id)"
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 2l7 7M9 2l-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <p class="card-name">{{ link.name }}</p>
            <span class="card-domain">{{ getDomain(link.url) }}</span>
          </div>
        </a>
      </div>

      <p v-if="filtered.length === 0" class="empty-state">
        Belum ada tautan di kategori ini.
      </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* ================================================================
   PAGE
   ================================================================ */
.resource-page {
  min-height: 100vh;
  height: 100vh;
  padding: clamp(24px, 5vh, 48px) clamp(20px, 5vw, 64px);
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* ================================================================
   HEADER
   ================================================================ */
.rp-head { }

.back {
  display: inline-flex;
  align-items: center;
  font-size: .8rem;
  color: var(--muted);
  margin-bottom: 10px;
  transition: color .25s;
}
.back:hover { color: var(--text); }

.eyebrow {
  display: block;
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--accent-2);
  margin-bottom: 6px;
}

.rp-head h1 {
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  letter-spacing: -.03em;
  margin-bottom: 8px;
}
.lead {
  font-size: .86rem;
  color: var(--muted);
  max-width: 560px;
}

/* ================================================================
   ADD FORM
   ================================================================ */
.add-form-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
}

.add-form { }

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 140px;
}
.field--url { flex: 2; min-width: 200px; }
.field--cat { flex: 0 0 140px; }

.field-label {
  font-size: .68rem;
  font-weight: 600;
  letter-spacing: .06em;
  color: var(--muted);
  text-transform: uppercase;
}

.field-input {
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: .82rem;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
  width: 100%;
}
.field-input::placeholder { color: var(--muted); opacity: .6; }
.field-input:focus {
  border-color: var(--accent-2);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-2) 20%, transparent);
}

.field-select { cursor: pointer; padding-right: 28px; }

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  background: var(--accent-2);
  color: #fff;
  font: inherit;
  font-size: .82rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity .2s, transform .1s;
}
.add-btn:hover { opacity: .88; }
.add-btn:active { transform: scale(.96); }

.form-error {
  margin-top: 8px;
  font-size: .75rem;
  color: var(--accent-3, #e05a4e);
}

/* ================================================================
   FILTER PILLS
   ================================================================ */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  font: inherit;
  font-size: .74rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s, color .15s;
}
.cat-pill:hover {
  border-color: var(--muted);
  color: var(--text);
}
.cat-pill.active {
  background: var(--accent-2);
  border-color: var(--accent-2);
  color: #fff;
}
.cat-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 18%, transparent);
  font-size: .65rem;
  font-weight: 700;
}

/* ================================================================
   SECTION LABEL
   ================================================================ */
.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: -8px;
  position: sticky;
  top: -16px;
  z-index: 2;
  padding: 4px 0 12px;
  background: linear-gradient(to bottom, var(--bg) 60%, transparent);
}

/* ================================================================
   GRID
   ================================================================ */
/* Container dengan scroll vertikal untuk area grid kartu */
.grid-scroll-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 45%, transparent);
  padding: 16px;
  scrollbar-width: thin;
}
.grid-scroll-container::-webkit-scrollbar {
  width: 8px;
}
.grid-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}
.grid-scroll-container::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--muted) 35%, transparent);
  border-radius: 999px;
}
.grid-scroll-container::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--muted) 60%, transparent);
}

.link-grid-wrap {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

/* ================================================================
   CARD
   ================================================================ */
.link-card {
  position: relative;
  display: block;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  overflow: hidden;
  text-decoration: none;
  color: var(--text);
  transition: border-color .2s, box-shadow .2s, transform .2s;
}
.link-card:hover {
  border-color: var(--accent-2);
  box-shadow: 0 4px 24px color-mix(in srgb, var(--accent-2) 16%, transparent);
  transform: translateY(-2px);
}

.link-card.pinned {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

/* Animasi saat baru ditambah */
.link-card.just-added {
  animation: card-pop .4s var(--ease) both;
}
@keyframes card-pop {
  from { opacity: 0; transform: scale(.94) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* Garis warna kategori di sisi kiri */
.card-cat-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  border-radius: 12px 0 0 12px;
  opacity: .85;
}

.card-inner {
  padding: 12px 12px 12px 16px;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.card-favicon {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  object-fit: contain;
  flex-shrink: 0;
}

.card-cat-badge {
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  flex: 1;
}

/* Tombol aksi (pin, hapus) — muncul saat hover card */
.card-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity .15s;
}
.link-card:hover .card-actions { opacity: 1; }

.card-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  transition: background .15s, color .15s, border-color .15s;
}
.card-action-btn:hover {
  background: var(--surface);
  color: var(--text);
  border-color: var(--muted);
}
.card-action-btn.del:hover {
  background: color-mix(in srgb, #e05a4e 12%, var(--surface));
  border-color: #e05a4e;
  color: #e05a4e;
}

.card-name {
  font-size: .86rem;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 4px;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-domain {
  font-size: .7rem;
  color: var(--muted);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ================================================================
   EMPTY STATE
   ================================================================ */
.empty-state {
  text-align: center;
  color: var(--muted);
  font-size: .86rem;
  padding: 40px;
}

/* ================================================================
   RESPONSIVE
   ================================================================ */
@media (max-width: 640px) {
  .form-row { flex-direction: column; }
  .field--cat { flex: 1; }
  .add-btn { width: 100%; justify-content: center; }
  .link-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 400px) {
  .link-grid { grid-template-columns: 1fr; }
}
/* Layar pendek / mobile: kembali ke scroll halaman biasa agar tetap nyaman */
@media (max-height: 560px) {
  .resource-page { height: auto; }
  .grid-scroll-container { max-height: none; overflow-y: visible; border: none; background: none; padding: 0; }
}
</style>
