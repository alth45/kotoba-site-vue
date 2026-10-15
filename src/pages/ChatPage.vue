<script setup lang="ts">
// =====================================================================
// ChatPage.vue — render teks dipindah ke src/core/renderRich.ts.
// =====================================================================
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChatAgent } from '../composables/useChatAgent.ts'
import type { ChatMode } from '../types.ts'
import { renderRich } from '../core/renderRich.ts'

const router = useRouter()
const { messages, typing, mode, aiReady, aiModel, setMode, init, send, clear, suggestionChips } =
  useChatAgent()

const draft = ref('')
const boxEl = ref<HTMLDivElement | null>(null)
const chips = suggestionChips()

function scrollBottom(smooth = true) {
  nextTick(() => {
    boxEl.value?.scrollTo({ top: boxEl.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  })
}

async function onSend(text: string) {
  const route = await send(text)
  draft.value = ''
  scrollBottom()
  if (route) {
    setTimeout(() => router.push(route), 700)
  }
}

watch([messages, typing], () => scrollBottom(), { deep: true })

onMounted(() => {
  init()
  scrollBottom(false)
})
</script>

<template>
  <main class="chat-page">
    <header class="chat-head">
      <div class="chat-head-text">
        <RouterLink class="back" to="/">← Kembali ke beranda</RouterLink>
        <span class="eyebrow">Asisten Belajar</span>
        <h1>Chat dengan Koto.</h1>
        <p class="lead">
          <template v-if="mode === 'ai'">
            Terhubung ke model AI online — tanya apa pun seputar bahasa Jepang.
          </template>
          <template v-else>
            Agen chat lokal — tanya arti kata dari daftar kosakatamu,
            atau ketik <code>bantuan</code> untuk melihat kemampuannya.
          </template>
        </p>
      </div>
      <div class="chat-head-actions">
        <label class="mode-picker" title="Pilih sumber jawaban">
          <span class="mode-label">Mode</span>
          <select
            class="mode-select"
            :value="mode"
            :disabled="typing"
            @change="setMode(($event.target as HTMLSelectElement).value as ChatMode)"
          >
            <option value="local">Lokal — tanpa jaringan AI</option>
            <option value="ai" :disabled="!aiReady">
              AI — model online{{ aiModel ? ` (${aiModel})` : '' }}{{ aiReady ? '' : ' (belum aktif)' }}
            </option>
          </select>
        </label>
        <span v-if="mode === 'ai'" class="save-pill"><span class="dot"></span>AI — via TokenHarbor</span>
        <span v-else class="save-pill"><span class="dot"></span>Lokal — tanpa AI eksternal</span>
        <button class="btn ghost" type="button" @click="clear">Bersihkan riwayat</button>
      </div>
    </header>
    <section class="chat-shell" aria-live="polite">
      <div ref="boxEl" class="chat-box">
        <div
          v-for="m in messages"
          :key="m.id"
          class="msg"
          :class="m.role === 'user' ? 'is-user' : 'is-agent'"
        >
          <span v-if="m.role === 'agent'" class="avatar" aria-hidden="true">言</span>
          <div class="bubble">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p class="bubble-text" v-html="renderRich(m.text)"></p>
            <RouterLink v-if="m.link" class="bubble-link" :to="m.link">
              Buka {{ m.link }} →
            </RouterLink>
            <ul v-if="m.results?.length" class="bubble-results">
              <li v-for="r in m.results" :key="r.id">
                <strong>{{ r.jp }}</strong>
                <em>{{ r.romaji }}</em>
                <span>{{ r.arti }}</span>
              </li>
            </ul>
            <span class="bubble-time">{{ m.time }}</span>
          </div>
        </div>

        <div v-if="typing" class="msg is-agent">
          <span class="avatar" aria-hidden="true">言</span>
          <div class="bubble is-typing" aria-label="Koto sedang mengetik">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <div class="chat-chips">
        <button
          v-for="c in chips"
          :key="c"
          class="chip"
          type="button"
          :disabled="typing"
          @click="onSend(c)"
        >
          {{ c }}
        </button>
      </div>

      <form class="chat-input" @submit.prevent="onSend(draft)">
        <input
          v-model="draft"
          type="text"
          placeholder="Tulis pesan… mis. apa arti arigatou?"
          aria-label="Tulis pesan ke Koto"
          maxlength="300"
          autocomplete="off"
        />
        <button class="btn primary" type="submit" :disabled="!draft.trim() || typing">
          {{ typing ? '…' : 'Kirim' }}
        </button>
      </form>
    </section>
  </main>
</template>

   

<style scoped>
.chat-page{
  position:fixed;inset:0;
  display:flex;flex-direction:column;
  overflow-y:auto;
  padding:clamp(20px,4vh,40px) clamp(16px,3vw,36px) clamp(24px,4vh,44px);
  gap:14px;
  scrollbar-width:none;
}
.chat-page::-webkit-scrollbar{display:none}

/* ---------- Header ---------- */
.chat-head{
  display:flex;align-items:flex-end;justify-content:space-between;
  gap:18px;flex-wrap:wrap;
}
.chat-head-text{max-width:620px}
.back{
  display:inline-flex;align-items:center;
  font-size:.8rem;color:var(--muted);margin-bottom:12px;
  transition:color .3s ease;
}
.back:hover{color:var(--text)}
.chat-head h1{
  font-size:clamp(1.4rem,3vw,2.1rem);
  letter-spacing:-.03em;
  margin-bottom:8px;
}
.chat-head .lead{font-size:.86rem;max-width:none}
.chat-head .lead code{
  font-size:.78rem;background:var(--surface-2);
  border:1px solid var(--border);border-radius:6px;padding:1px 6px;
}
.chat-head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px}
.mode-picker{
  display:inline-flex;align-items:center;gap:8px;
  border:1px solid var(--border);background:var(--surface);
  border-radius:999px;padding:6px 8px 6px 14px;
  font-size:.78rem;color:var(--muted);
}
.mode-label{letter-spacing:.06em;text-transform:uppercase;font-size:.68rem}
.mode-select{
  border:1px solid var(--border);background:var(--surface-2);
  color:var(--text);border-radius:999px;
  font:inherit;font-size:.78rem;
  padding:6px 10px;max-width:280px;cursor:pointer;
}
.mode-select:focus{outline:none;border-color:var(--border-strong)}
.mode-select:disabled{opacity:.6;cursor:not-allowed}
.save-pill{
  display:inline-flex;align-items:center;gap:8px;
  font-size:.74rem;color:var(--muted);
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:999px;
  padding:7px 14px;
}
.save-pill .dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}

/* ---------- Shell chat ---------- */
.chat-shell{
  width:100%;max-width:860px;margin:0 auto;
  border:1px solid var(--border);
  background:var(--surface);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  display:flex;flex-direction:column;
  min-height:min(64vh,660px);max-height:min(72vh,720px);
  overflow:hidden;
}
.chat-box{
  flex:1;overflow-y:auto;
  display:flex;flex-direction:column;gap:12px;
  padding:clamp(16px,3vw,26px);
}
.msg{display:flex;gap:10px;align-items:flex-end;max-width:100%}
.msg.is-user{justify-content:flex-end}
.avatar{
  flex:none;width:32px;height:32px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:.95rem;color:#fff;background:var(--accent-2);
}
.bubble{
  max-width:min(72%,560px);
  border:1px solid var(--border);
  background:var(--surface-2);
  border-radius:16px;
  padding:10px 14px 6px;
  font-size:.88rem;line-height:1.65;
}
.is-user .bubble{
  background:var(--accent-2);border-color:transparent;color:#fff;
}
.bubble-text{margin:0;white-space:normal;word-break:break-word}
.bubble-text :deep(code){
  font-size:.78rem;background:rgba(127,127,127,.18);
  border-radius:6px;padding:1px 6px;
}
.is-user .bubble-text :deep(code){background:rgba(255,255,255,.25)}
.bubble-time{display:block;font-size:.66rem;color:var(--muted);margin-top:4px;text-align:right}
.is-user .bubble-time{color:rgba(255,255,255,.75)}
.bubble-link{
  display:inline-block;margin-top:6px;font-size:.8rem;font-weight:600;
  color:var(--accent-2);text-decoration:underline;
}
.bubble-results{
  list-style:none;margin:8px 0 2px;padding:0;
  display:flex;flex-direction:column;gap:6px;
}
.bubble-results li{
  border:1px solid var(--border);border-radius:10px;
  background:var(--surface);
  padding:6px 10px;font-size:.8rem;
  display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;
}
.bubble-results strong{font-size:.95rem;letter-spacing:.02em}
.bubble-results em{color:var(--muted);font-size:.75rem}
.bubble-results span{color:var(--muted);font-size:.78rem}

/* Indikator mengetik */
.is-typing{display:flex;gap:5px;align-items:center;padding:14px 16px}
.is-typing span{
  width:7px;height:7px;border-radius:50%;background:var(--muted);
  animation:typing-bounce 1.1s ease infinite;
}
.is-typing span:nth-child(2){animation-delay:.15s}
.is-typing span:nth-child(3){animation-delay:.3s}
@keyframes typing-bounce{
  0%,100%{transform:translateY(0);opacity:.5}
  50%{transform:translateY(-4px);opacity:1}
}

/* Saran cepat */
.chat-chips{
  display:flex;gap:8px;flex-wrap:wrap;
  padding:0 clamp(16px,3vw,26px) 10px;
}
.chip{
  border:1px solid var(--border);background:var(--surface-2);
  color:var(--muted);border-radius:999px;
  font:inherit;font-size:.76rem;
  padding:6px 13px;cursor:pointer;
  transition:border-color .3s ease,color .3s ease,transform .3s var(--ease);
}
.chip:hover:not(:disabled){border-color:var(--border-strong);color:var(--text);transform:translateY(-1px)}
.chip:disabled{opacity:.5;cursor:not-allowed}

/* Input */
.chat-input{
  display:flex;gap:10px;
  padding:12px clamp(16px,3vw,26px) clamp(14px,2.5vh,20px);
  border-top:1px solid var(--border);
}
.chat-input input{
  flex:1;min-width:0;
  border:1px solid var(--border);background:var(--surface-2);
  color:var(--text);border-radius:12px;
  padding:10px 14px;font:inherit;font-size:.88rem;
}
.chat-input input:focus{outline:none;border-color:var(--border-strong)}

@media (max-width:720px){
  .bubble{max-width:88%}
}
</style>

