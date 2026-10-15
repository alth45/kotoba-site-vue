<script setup lang="ts">
/**
 * NotePage.vue — halaman catatan.
 * Seluruh logika editor, sidebar situs, dan chat cepat telah dipisah ke
 * src/core/ (useNoteEditor, useNoteSidebar, useNoteChat + helper murni
 * noteFormat/noteOptions/renderRich). Script ini hanya memanggil fungsi
 * utamanya dan meneruskan hasilnya ke template.
 */
import {
  FONT_OPTIONS,
  SIZE_OPTIONS,
  TEXT_COLORS,
  MARK_COLORS,
  IMG_PRESETS,
} from '../core/noteOptions.ts'
import { renderRich } from '../core/renderRich.ts'
import { useNoteEditor } from '../core/useNoteEditor.ts'
import { useNoteSidebar } from '../core/useNoteSidebar.ts'
import { useNoteChat } from '../core/useNoteChat.ts'

/* ---------- Editor: state + aksi format & gambar ---------- */
const {
  statusText, statusClass, loading,
  editorEl, charCount, onInput, onSelectChange,
  openPop, togglePop,
  currentFont, currentSize, lastColor, lastMark,
  applyFontFamily, applyFontSize, applyColor, applyHighlight, undo,
  imageInputEl, uploadingImage, selectedImg, selectedImgWidth, imgPresetLabel,
  resizeHandleEl, triggerImagePick, onImageFile, onEditorClick,
  applyImgPreset, applyImgWidth, onResizeHandleDown, removeSelectedImg,
} = useNoteEditor()

/* ---------- Sidebar situs Jepang ---------- */
const {
  SITES_JP, sidebarOpen, selectedSiteId, iframeLoading,
  currentSiteUrl, currentSiteName, toggleSidebar, selectSite,
} = useNoteSidebar()

/* ---------- Chat cepat mengambang (FAB) ---------- */
const {
  chatMsgs, chatTyping, chatMode, aiReady, chatOpen, chatDraft, chatBoxEl,
  fabPos, fabDragging, fabEl,
  onChatModeChange, onChatSend, toggleChat,
  onFabPointerDown, onFabPointerMove, onFabPointerUp, resetFabPos,
} = useNoteChat()
</script>

<template>
  <main class="note-page">
    <header class="note-head">
      <div class="note-head-text">
        <RouterLink class="back" to="/">← Kembali ke beranda</RouterLink>
        <span class="eyebrow">Studio Menulis</span>
        <h1>Catatan</h1>
        <p class="lead">
          Ruang mengetik bebas — pilih font & ukuran huruf, blok kata lalu warnai
          atau sorot, dan sisipkan gambar yang ukurannya bisa diatur.
        </p>
      </div>
      <span class="save-pill" :class="statusClass">{{ statusText }}</span>
    </header>

    <div class="note-toolbar" role="toolbar" aria-label="Format catatan">
      <select
        class="tb-select"
        :value="currentFont"
        title="Jenis font"
        @change="applyFontFamily(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="f in FONT_OPTIONS" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>

      <select
        class="tb-select tb-size"
        :value="currentSize"
        title="Ukuran huruf"
        @change="applyFontSize(Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="s in SIZE_OPTIONS" :key="s" :value="s">{{ s }} px</option>
      </select>

      <span class="tb-sep" aria-hidden="true"></span>

      <div class="tb-pop-wrap">
        <button
          class="tb-btn"
          type="button"
          title="Warnai kata yang diblok"
          @mousedown.prevent
          @click="togglePop('color')"
        >
          <span class="tb-letter" :style="{ color: lastColor }">A</span>
          <span class="tb-caret">▾</span>
        </button>
        <div v-if="openPop === 'color'" class="tb-pop">
          <p class="tb-pop-title">Warna teks</p>
          <div class="tb-swatches">
            <button
              v-for="c in TEXT_COLORS"
              :key="c"
              class="tb-swatch"
              :class="{ active: lastColor === c }"
              :style="{ background: c }"
              type="button"
              :title="c"
              @mousedown.prevent
              @click="applyColor(c)"
            ></button>
          </div>
        </div>
      </div>

      <div class="tb-pop-wrap">
        <button
          class="tb-btn"
          type="button"
          title="Sorot kata yang diblok"
          @mousedown.prevent
          @click="togglePop('mark')"
        >
          <span class="tb-marker" :style="{ background: lastMark }">▮</span>
          <span class="tb-caret">▾</span>
        </button>
        <div v-if="openPop === 'mark'" class="tb-pop">
          <p class="tb-pop-title">Sorotan (stabilo)</p>
          <div class="tb-swatches">
            <button
              v-for="c in MARK_COLORS"
              :key="c"
              class="tb-swatch"
              :class="{ active: lastMark === c }"
              :style="{ background: c }"
              type="button"
              :title="c"
              @mousedown.prevent
              @click="applyHighlight(c)"
            ></button>
          </div>
        </div>
      </div>

      <span class="tb-sep" aria-hidden="true"></span>

      <button class="tb-btn tb-text-btn" type="button" title="Urungkan" @mousedown.prevent @click="undo">
        ↶ Urungkan
      </button>

      <span class="tb-sep" aria-hidden="true"></span>

      <button
        class="tb-btn"
        type="button"
        title="Sisipkan gambar (PNG/JPG/GIF/WebP, maks 3 MB)"
        :disabled="uploadingImage"
        @mousedown.prevent
        @click="triggerImagePick"
      >
        {{ uploadingImage ? '⏳ Mengunggah…' : '🖼️ Gambar' }}
      </button>
      <input
        ref="imageInputEl"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        @change="onImageFile"
      />

      <span class="tb-spacer"></span>
      <span class="tb-count">{{ charCount }} karakter</span>

      <span class="tb-sep" aria-hidden="true"></span>

      <button
        class="tb-btn tb-text-btn"
        type="button"
        :class="{ active: sidebarOpen }"
        :title="sidebarOpen ? 'Sembunyikan sidebar situs' : 'Tampilkan sidebar situs'"
        :aria-pressed="sidebarOpen"
        @mousedown.prevent
        @click="toggleSidebar"
      >
        {{ sidebarOpen ? '📖 Sembunyikan Sidebar' : '📖 Tampilkan Sidebar' }}
      </button>
    </div>

    <!-- Panel gambar terpilih: preset ukuran + slider + hapus -->
    <div v-if="selectedImg" class="img-bar" role="toolbar" aria-label="Ukuran gambar">
      <span class="img-bar-label">🖼️ Gambar terpilih</span>
      <div class="img-sizes">
        <button
          v-for="p in IMG_PRESETS"
          :key="p.label"
          class="img-size-btn"
          :class="{ active: imgPresetLabel === p.label }"
          type="button"
          @mousedown.prevent
          @click="applyImgPreset(p.width)"
        >
          {{ p.label }}
        </button>
      </div>
      <label class="img-slider">
        <input
          type="range"
          min="80"
          max="800"
          step="10"
          :value="selectedImgWidth"
          @input="applyImgWidth(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="img-slider-val">{{ selectedImgWidth }} px</span>
      </label>
      <button class="tb-btn tb-text-btn danger" type="button" @mousedown.prevent @click="removeSelectedImg">
        🗑 Hapus gambar
      </button>
    </div>

    <div class="note-body">
      <div class="note-paper">
        <div
          ref="editorEl"
          class="note-editor"
          :class="{ 'is-loading': loading }"
          contenteditable="true"
          data-placeholder="Mulai mengetik di sini… Blok teks untuk memberi warna atau sorotan."
          spellcheck="true"
          role="textbox"
          aria-multiline="true"
          aria-label="Isi catatan"
          @input="onInput"
          @click="onEditorClick"
        ></div>
        <!-- Handle tarik untuk resize gambar terpilih (diposisikan via watcher) -->
        <span
          v-if="selectedImg"
          ref="resizeHandleEl"
          class="img-resize-handle"
          title="Tarik untuk mengubah ukuran"
          @pointerdown="onResizeHandleDown"
        ></span>
      </div>

      <!-- ===== Sidebar: render situs Jepang sebagai referensi menulis ===== -->
      <aside v-if="sidebarOpen" class="note-sidebar" aria-label="Sidebar referensi situs">
        <div class="ns-head">
          <span class="ns-title">📖 Referensi Situs</span>
          <button class="ns-close" type="button" title="Tutup sidebar" @click="toggleSidebar">✕</button>
        </div>

        <div class="ns-controls">
          <select
            class="ns-select tb-select"
            :value="selectedSiteId"
            title="Pilih situs yang ingin dirender"
            @change="selectSite(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="s in SITES_JP" :key="s.id" :value="s.id">
              {{ s.name }} — {{ s.category }}
            </option>
          </select>
          <a
            v-if="currentSiteUrl"
            class="ns-open"
            :href="currentSiteUrl"
            target="_blank"
            rel="noopener noreferrer"
            title="Buka di tab baru bila diblokir situs"
          >↗ Buka Tab</a>
        </div>

        <div class="ns-frame-wrap">
          <div v-if="iframeLoading" class="ns-loading">Memuat {{ currentSiteName }}…</div>
          <iframe
            v-if="currentSiteUrl"
            key="site-iframe"
            class="ns-iframe"
            :src="currentSiteUrl"
            :title="`Render ${currentSiteName}`"
            referrerpolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            loading="lazy"
            @load="iframeLoading = false"
          ></iframe>
        </div>

        <p class="ns-hint">
          💡 Tiru teks dari situs ini ke canvas catatan. Bila halaman tidak muncul,
          situs memblokir embed — gunakan tombol “Buka Tab”.
        </p>
      </aside>
    </div>

    <!-- ===== Chat cepat: tombol mengambang yang bisa digeser ===== -->
    <button
      ref="fabEl"
      class="chat-fab"
      :class="{ 'is-dragging': fabDragging, 'is-open': chatOpen }"
      type="button"
      :style="fabPos ? { left: fabPos.x + 'px', top: fabPos.y + 'px', right: 'auto', bottom: 'auto' } : undefined"
      title="Klik: buka/tutup chat cepat · Geser: pindahkan tombol"
      :aria-pressed="chatOpen"
      aria-label="Chat cepat kosakata"
      @pointerdown="onFabPointerDown"
      @pointermove="onFabPointerMove"
      @pointerup="onFabPointerUp"
      @pointercancel="onFabPointerUp"
      @contextmenu.prevent="resetFabPos"
    >
      <span class="chat-fab-icon" aria-hidden="true">{{ chatOpen ? '✕' : '💬' }}</span>
      <span v-if="!chatOpen" class="chat-fab-badge" aria-hidden="true">問</span>
    </button>

    <!-- Kotak chat — logika 100% memakai useChatAgent (sama dgn halaman /chat) -->
    <section v-if="chatOpen" class="chat-pop" aria-label="Chat cepat kosakata" aria-live="polite">
      <header class="cp-head">
        <span class="cp-title">💬 Tanya kosakata cepat</span>
        <label class="cp-mode" title="Sumber jawaban Koto">
          <select
            class="cp-mode-select"
            :value="chatMode"
            :disabled="chatTyping"
            @change="onChatModeChange"
          >
            <option value="local">Lokal</option>
            <option value="ai" :disabled="!aiReady">AI{{ aiReady ? '' : ' (belum aktif)' }}</option>
          </select>
        </label>
        <button class="cp-close" type="button" title="Tutup chat" @click="toggleChat">✕</button>
      </header>

      <div ref="chatBoxEl" class="cp-box">
        <div
          v-for="m in chatMsgs"
          :key="m.id"
          class="cp-msg"
          :class="m.role === 'user' ? 'is-user' : 'is-agent'"
        >
          <span v-if="m.role === 'agent'" class="cp-avatar" aria-hidden="true">言</span>
          <div class="cp-bubble">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p class="cp-bubble-text" v-html="renderRich(m.text)"></p>
            <ul v-if="m.results?.length" class="cp-results">
              <li v-for="r in m.results" :key="r.id">
                <strong>{{ r.jp }}</strong>
                <em>{{ r.romaji }}</em>
                <span>{{ r.arti }}</span>
              </li>
            </ul>
            <span class="cp-time">{{ m.time }}</span>
          </div>
        </div>
        <div v-if="chatTyping" class="cp-msg is-agent">
          <span class="cp-avatar" aria-hidden="true">言</span>
          <div class="cp-bubble is-typing" aria-label="Koto sedang mengetik">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <form class="cp-input" @submit.prevent="onChatSend(chatDraft)">
        <input
          v-model="chatDraft"
          type="text"
          placeholder="mis. apa arti arigatou?"
          aria-label="Tulis pesan ke Koto"
          maxlength="300"
          autocomplete="off"
        />
        <button class="cp-send" type="submit" :disabled="!chatDraft.trim() || chatTyping">
          {{ chatTyping ? '…' : 'Kirim' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.note-page{
  position:fixed;inset:0;
  display:flex;flex-direction:column;
  overflow-y:auto;
  padding:clamp(20px,4vh,40px) clamp(16px,3vw,36px) clamp(24px,4vh,44px);
  gap:14px;
  scrollbar-width:none;
}
.note-page::-webkit-scrollbar{display:none}

/* ---------- Header ---------- */
.note-head{
  display:flex;align-items:flex-end;justify-content:space-between;
  gap:18px;flex-wrap:wrap;
}
.note-head-text{max-width:620px}
.back{
  display:inline-flex;align-items:center;
  font-size:.8rem;color:var(--muted);margin-bottom:12px;
  transition:color .3s ease;
}
.back:hover{color:var(--text)}
.note-head h1{
  font-size:clamp(1.4rem,3vw,2.1rem);
  letter-spacing:-.03em;
  margin-bottom:8px;
}
.note-head .lead{font-size:.86rem;max-width:none}

.save-pill{
  display:inline-flex;align-items:center;gap:8px;
  font-size:.74rem;color:var(--muted);
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:999px;
  padding:7px 14px;
  margin-bottom:4px;
}
.save-pill::before{
  content:"";width:7px;height:7px;border-radius:50%;
  background:var(--accent);
}
.save-pill.is-saving::before{background:var(--accent-2);animation:pill-pulse 1s ease infinite}
.save-pill.is-error{border-color:var(--accent-3);color:var(--accent-3)}
.save-pill.is-error::before{background:var(--accent-3)}
@keyframes pill-pulse{
  0%,100%{opacity:.4}
  50%{opacity:1}
}

/* ---------- Toolbar ---------- */
.note-toolbar{
  position:sticky;top:0;z-index:20;
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  border:1px solid var(--border);
  background:var(--glass);
  backdrop-filter:blur(16px) saturate(140%);
  -webkit-backdrop-filter:blur(16px) saturate(140%);
  border-radius:14px;
  padding:8px 10px;
}
.tb-select{
  border:1px solid var(--border);
  background:var(--surface-2);
  color:var(--text);
  border-radius:10px;
  padding:7px 10px;
  font:inherit;
  font-size:.82rem;
  max-width:190px;
}
.tb-select:focus{outline:none;border-color:var(--border-strong)}
.tb-size{max-width:92px}
.tb-sep{width:1px;height:22px;background:var(--border);margin:0 2px}
.tb-spacer{flex:1}

.tb-btn{
  display:inline-flex;align-items:center;gap:5px;
  border:1px solid var(--border);
  background:var(--surface);
  color:var(--muted);
  border-radius:10px;
  padding:7px 11px;
  font-size:.82rem;
  cursor:pointer;
  transition:border-color .3s ease,color .3s ease,transform .3s var(--ease);
}
.tb-btn:hover{border-color:var(--border-strong);color:var(--text);transform:translateY(-1px)}
.tb-letter{font-weight:700;font-size:.95rem;line-height:1}
.tb-marker{font-size:.85rem;line-height:1;padding:0 1px;border-radius:3px}
.tb-caret{font-size:.62rem;opacity:.7}

.tb-count{font-size:.74rem;color:var(--muted);white-space:nowrap}

/* Popover palet warna */
.tb-pop-wrap{position:relative}
.tb-pop{
  position:absolute;
  top:calc(100% + 8px);
  left:0;
  z-index:40;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:14px;
  box-shadow:var(--shadow);
  padding:12px 12px 10px;
  min-width:210px;
}
.tb-pop-title{
  margin:0 0 8px;
  font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted);
}
.tb-swatches{display:grid;grid-template-columns:repeat(8,1fr);gap:7px}
.tb-swatch{
  width:22px;height:22px;
  border-radius:7px;
  border:1px solid var(--border-strong);
  cursor:pointer;
  padding:0;
  transition:transform .2s var(--ease),box-shadow .2s ease;
}
.tb-swatch:hover{transform:scale(1.15)}
.tb-swatch.active{box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--accent-2)}

/* ---------- Kertas editor ---------- */
.note-body{
  display:flex;align-items:stretch;gap:14px;
  width:100%;flex:1 1 auto;min-height:0;
}
.note-paper{
  flex:1 1 auto;min-width:0;
  width:100%;max-width:860px;
  margin:0 auto;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  padding:clamp(22px,4vw,44px);
  min-height:min(62vh,640px);
  transition:background-color .5s ease,border-color .5s ease;
}
.note-editor{
  min-height:52vh;
  font-size:16px;
  line-height:1.85;
  color:var(--text);
  outline:none;
  word-break:break-word;
  white-space:pre-wrap;
}
.note-editor:empty::before{
  content:attr(data-placeholder);
  color:var(--muted);
  opacity:.7;
  pointer-events:none;
}
.note-editor.is-loading{opacity:.5}

/* Gambar di dalam catatan */
.note-paper{position:relative}
.note-editor img.note-img,
.note-editor img{
  max-width:100%;
  height:auto;
  border-radius:12px;
  border:1px solid var(--border);
  margin:10px 0;
  cursor:pointer;
  transition:box-shadow .25s ease,border-color .25s ease;
}
.note-editor img.is-selected{
  outline:2px solid var(--accent-2);
  outline-offset:2px;
  border-color:var(--accent-2);
  box-shadow:var(--shadow);
}

/* Panel ukuran gambar */
.img-bar{
  width:100%;max-width:860px;margin:0 auto;
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;
  border:1px solid var(--border);
  background:var(--glass);
  backdrop-filter:blur(16px) saturate(140%);
  -webkit-backdrop-filter:blur(16px) saturate(140%);
  border-radius:14px;
  padding:8px 12px;
}
.img-bar-label{font-size:.78rem;color:var(--muted);white-space:nowrap}
.img-sizes{display:flex;gap:6px}
.img-size-btn{
  border:1px solid var(--border);
  background:var(--surface);
  color:var(--muted);
  border-radius:9px;
  padding:6px 12px;
  font-size:.78rem;
  cursor:pointer;
  transition:border-color .25s ease,color .25s ease;
}
.img-size-btn:hover{border-color:var(--border-strong);color:var(--text)}
.img-size-btn.active{border-color:var(--accent-2);color:var(--text)}
.img-slider{display:flex;align-items:center;gap:8px;flex:1;min-width:180px}
.img-slider input[type="range"]{flex:1;accent-color:var(--accent-2)}
.img-slider-val{font-size:.76rem;color:var(--muted);min-width:52px;text-align:right}
.tb-text-btn.danger{color:var(--accent-3)}
.tb-text-btn.danger:hover{border-color:var(--accent-3);color:var(--accent-3)}
.tb-btn:disabled{opacity:.55;cursor:wait;transform:none}

/* Handle tarik resize */
.img-resize-handle{
  position:absolute;z-index:30;
  width:16px;height:16px;border-radius:50%;
  background:var(--accent-2);
  border:2px solid var(--surface);
  box-shadow:var(--shadow);
  cursor:nwse-resize;
  touch-action:none;
}

/* ---------- Responsive ---------- */
@media (max-width:720px){
  .tb-select{max-width:150px}
  .tb-swatches{grid-template-columns:repeat(6,1fr)}
  .note-paper{padding:18px 16px}
}

/* ---------- Sidebar referensi situs ---------- */
.note-sidebar{
  flex:0 0 clamp(320px, 34vw, 520px);
  display:flex;flex-direction:column;gap:10px;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  padding:12px;
  min-height:min(62vh,640px);
  max-height:min(84vh,900px);
  position:sticky;top:0;
  align-self:flex-start;
}
.ns-head{
  display:flex;align-items:center;justify-content:space-between;gap:8px;
}
.ns-title{
  font-weight:700;font-size:14px;color:var(--text);letter-spacing:.02em;
}
.ns-close{
  border:none;background:transparent;color:var(--muted,#828892);
  font-size:14px;cursor:pointer;padding:4px 8px;border-radius:8px;line-height:1;
}
.ns-close:hover{background:rgba(128,136,146,.12);color:var(--text)}
.ns-controls{
  display:flex;align-items:center;gap:8px;
}
.ns-select{flex:1 1 auto;min-width:0}
.ns-open{
  flex:0 0 auto;font-size:12px;font-weight:600;text-decoration:none;
  color:var(--accent-2,#2980b9);border:1px solid var(--border);
  padding:6px 10px;border-radius:8px;white-space:nowrap;
}
.ns-open:hover{border-color:var(--accent-2,#2980b9)}
.ns-frame-wrap{
  position:relative;flex:1 1 auto;min-height:260px;
  border:1px solid var(--border);border-radius:10px;overflow:hidden;
  background:#fff;
}
.ns-iframe{
  position:absolute;inset:0;width:100%;height:100%;border:0;display:block;
}
.ns-loading{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:13px;color:var(--muted,#828892);background:var(--surface);z-index:1;
}
.ns-hint{
  margin:0;font-size:11.5px;line-height:1.5;color:var(--muted,#828892);
}
.tb-btn.active{
  border-color:var(--accent-2,#2980b9);color:var(--accent-2,#2980b9);
  background:rgba(41,128,185,.08);
}
@media (max-width: 900px){
  .note-body{flex-direction:column}
  .note-sidebar{flex:0 0 auto;width:100%;max-height:60vh;position:static}
}

/* ---------- Chat cepat: tombol mengambang yang bisa digeser ---------- */
.chat-fab{
  position:fixed;z-index:60;
  right:28px;bottom:28px;
  width:58px;height:58px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  border:1px solid var(--border-strong);
  background:var(--glass);
  backdrop-filter:blur(14px) saturate(140%);
  -webkit-backdrop-filter:blur(14px) saturate(140%);
  box-shadow:var(--shadow);
  color:var(--text);
  font-size:22px;line-height:1;
  cursor:grab;touch-action:none;user-select:none;
  transition:border-color .25s ease,transform .25s var(--ease),background-color .3s ease;
}
.chat-fab:hover{border-color:var(--accent-2,#2980b9);transform:scale(1.06)}
.chat-fab.is-dragging{cursor:grabbing;transition:none;transform:scale(1.08);opacity:.92}
.chat-fab.is-open{
  background:rgba(41,128,185,.14);
  border-color:var(--accent-2,#2980b9);
}
.chat-fab-icon{pointer-events:none;display:block}
.chat-fab-badge{
  position:absolute;top:-4px;right:-4px;
  width:22px;height:22px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:var(--accent-2,#2980b9);color:#fff;
  font-size:11px;font-weight:700;
  border:2px solid var(--surface);
  pointer-events:none;
}

/* Kotak chat mengambang */
.chat-pop{
  position:fixed;z-index:59;
  right:28px;bottom:100px;
  width:min(360px,calc(100vw - 40px));
  max-height:min(560px,calc(100vh - 150px));
  display:flex;flex-direction:column;gap:0;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:16px;
  box-shadow:var(--shadow);
  overflow:hidden;
  animation:cp-in .22s var(--ease);
}
@keyframes cp-in{
  from{opacity:0;transform:translateY(10px) scale(.98)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
.cp-head{
  display:flex;align-items:center;gap:8px;
  padding:10px 12px;
  border-bottom:1px solid var(--border);
  background:var(--glass);
}
.cp-title{font-size:.8rem;font-weight:700;color:var(--text);flex:1;letter-spacing:.01em}
.cp-mode-select{
  border:1px solid var(--border);
  background:var(--surface-2);
  color:var(--text);
  border-radius:8px;
  font:inherit;font-size:.72rem;
  padding:4px 6px;cursor:pointer;
}
.cp-close{
  border:none;background:transparent;color:var(--muted);
  font-size:13px;cursor:pointer;padding:4px 8px;border-radius:8px;line-height:1;
}
.cp-close:hover{background:rgba(128,136,146,.12);color:var(--text)}

.cp-box{
  flex:1 1 auto;min-height:160px;
  overflow-y:auto;
  padding:12px;
  display:flex;flex-direction:column;gap:10px;
  scrollbar-width:thin;
}
.cp-msg{display:flex;gap:8px;align-items:flex-end}
.cp-msg.is-user{flex-direction:row-reverse}
.cp-avatar{
  flex:0 0 auto;width:24px;height:24px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:var(--accent-2,#2980b9);color:#fff;font-size:11px;font-weight:700;
}
.cp-bubble{
  max-width:82%;
  border:1px solid var(--border);
  background:var(--surface-2);
  border-radius:12px;
  padding:8px 11px;
}
.cp-msg.is-user .cp-bubble{background:rgba(41,128,185,.12);border-color:rgba(41,128,185,.35)}
.cp-bubble-text{margin:0;font-size:.78rem;line-height:1.55;color:var(--text);word-break:break-word}
.cp-bubble-text code{
  font-size:.72rem;background:var(--surface);border:1px solid var(--border);
  border-radius:5px;padding:0 4px;
}
.cp-results{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:4px}
.cp-results li{
  display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;
  font-size:.74rem;color:var(--text);
  border:1px solid var(--border);border-radius:8px;padding:4px 8px;background:var(--surface);
}
.cp-results em{color:var(--muted);font-style:normal;font-size:.68rem}
.cp-time{display:block;margin-top:4px;font-size:.6rem;color:var(--muted);text-align:right}
.cp-bubble.is-typing{display:flex;gap:5px;padding:12px}
.cp-bubble.is-typing span{
  width:7px;height:7px;border-radius:50%;background:var(--muted);
  animation:cp-dot 1s ease infinite;
}
.cp-bubble.is-typing span:nth-child(2){animation-delay:.15s}
.cp-bubble.is-typing span:nth-child(3){animation-delay:.3s}
@keyframes cp-dot{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}

.cp-input{
  display:flex;gap:8px;padding:10px 12px;
  border-top:1px solid var(--border);
  background:var(--glass);
}
.cp-input input{
  flex:1;min-width:0;
  border:1px solid var(--border);
  background:var(--surface-2);
  color:var(--text);
  border-radius:10px;
  padding:8px 12px;
  font:inherit;font-size:.8rem;
}
.cp-input input:focus{outline:none;border-color:var(--accent-2,#2980b9)}
.cp-send{
  border:1px solid var(--accent-2,#2980b9);
  background:rgba(41,128,185,.14);
  color:var(--text);
  border-radius:10px;
  padding:8px 14px;
  font-size:.78rem;font-weight:600;
  cursor:pointer;white-space:nowrap;
  transition:filter .25s ease;
}
.cp-send:hover:not(:disabled){filter:brightness(1.1)}
.cp-send:disabled{opacity:.5;cursor:wait}

@media (max-width: 900px){
  .chat-pop{right:12px;left:12px;width:auto;bottom:92px}
  .chat-fab{right:16px;bottom:16px}
}
</style>
