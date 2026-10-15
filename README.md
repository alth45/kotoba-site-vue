# 🌸 Kotoba — Kosakata Jepang untuk Pemula

Situs belajar bahasa Jepang interaktif berbasis **Vue 3 + Vite** dengan **backend Node.js tanpa framework** — data benar-benar tersimpan di file JSON lokal (bukan hanya di browser).

> Terdiri dari **6 halaman utama**: beranda, kelola kosakata, peta pola kalimat, catatan kaya format, chatbot, dan pustaka resource belajar.

---

## ✨ Fitur

### Halaman
| Halaman | Route | Deskripsi |
|---|---|---|
| **Beranda** | `/` | Landing page 5-panel dengan transisi scroll (wheel/touch/keyboard), tema light/dark, menu melayang Ctrl+M |
| **Kosakata** | `/kosakata` | Tabel CRUD kosakata — count di atas tabel, tambah/ubah/hapus (dialog konfirmasi bertema), **paginasi 10/halaman**, lazy-load + **cache 3 halaman (LRU)**, **pencarian popup (Ctrl+K)** dengan highlight kata & loncat ke halaman |
| **Peta Kalimat** | `/peta` | Kanvas drag & drop untuk memetakan struktur kalimat Jepang — palet bentuk, peran tata bahasa (主語/目的語/述語/助詞…), partikel cepat, template pola (S+V, S+O+V…), garis bezier berlabel, inspector properti, auto-save |
| **Catatan** | `/catatan` | Notepad kaya format — 7 font (termasuk UD Digi Kyokasho & font Jepang), ukuran 12–48px, warnai/sorot teks terblok, **insert gambar (upload + resize)**, undo, auto-save |
| **Chat** | `/chat` | Chatbot "Koto" 2 mode: **Lokal** (aturan + pencarian kosakata, tanpa jaringan) & **AI** (model TokenHarbor via proxy), riwayat persisten, indikator mengetik |
| **Resource** | `/resource` | Pustaka tautan belajar Jepang — 20 preset (kamus, berita, JLPT…), filter kategori, pin, tambah/hapus tautan sendiri |

### Fitur global
- 🎨 **Tema light/dark** — ikon toggle di menu, tersimpan di localStorage, ikut `prefers-color-scheme`
- ⌨️ **Shortcut**: `Ctrl+M` buka/tutup menu · `Esc` tutup · `↑↓ PgUp PgDn Home End` navigasi panel (beranda) · `Ctrl+K` pencarian (halaman kosakata) · `Del` hapus elemen terpilih (peta)
- 💾 **Persistensi file JSON** — semua data tersimpan di folder `data/`, aman dari reset browser
- 🧩 **Dialog konfirmasi kustom** — menggantikan `window.confirm` bawaan, mengikuti token tema

---

## 🛠 Tech Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | Vue 3.5 (Composition API, SFC) · Vue Router 4.6 · Vite 7.3 · TypeScript 5.7 (`vue-tsc`) |
| Backend | Node.js murni (`node:http`) tanpa framework, ditulis dalam TypeScript — `server/index.ts` (dijalankan via `tsx`) |
| AI (opsional) | SDK `openai` 6.x → TokenHarbor (`deepseek-v4.1-flash:free`) — **hanya di server** |
| Data | File JSON di `data/` (vocab, peta, catatan, upload gambar) |

---

## 🚀 Cara Menjalankan

**Prasyarat:** Node.js ≥ 20.19 (diuji di v24) + npm.

```bash
npm install          # instal dependensi
npm run dev          # API (port 3000) + Vite dev (port 5173) bersamaan
```

Buka `http://localhost:5173`.

```bash
npm run typecheck    # vue-tsc --noEmit — pemeriksaan tipe seluruh src/
npm run build        # vue-tsc + vite build → dist/
npm start            # produksi: server menyajikan dist/ + API di port 3000
```

### Mengaktifkan mode AI (opsional)

Mode chat AI membutuhkan kunci API. **Kunci hanya disimpan di server** — tidak pernah sampai ke browser.

```cmd
set TOKENHARBOR_API_KEY=kunci-kamu-disini
npm run dev
```

Variabel opsional:

| Env | Default |
|---|---|
| `TOKENHARBOR_API_KEY` | *(wajib untuk mode AI)* |
| `TOKENHARBOR_MODEL` | `deepseek-v4.1-flash:free` |
| `TOKENHARBOR_BASE_URL` | `https://tokenharbor.ai/v1` |
| `PORT` | `3000` |

Tanpa kunci, mode AI tampil nonaktif di dropdown dan chatbot tetap jalan penuh dalam mode Lokal.


---

## 📁 Struktur Project

```
kotoba-site/
├── index.html                 # entry Vite
├── vite.config.ts             # proxy /api & /uploads → :3000
├── package.json               # scripts: dev / build / typecheck / preview / start
├── server/
│   └── index.ts               # backend: API + upload + statis + proxy AI
├── scripts/
│   └── dev.js                 # launcher dev (API + Vite bersamaan)
├── data/                      # ← semua data tersimpan di sini
│   ├── vocab.json             # daftar kosakata (sumber kebenaran)
│   ├── map.json               # dokumen peta pola kalimat
│   ├── notes.json             # konten catatan (HTML)
│   └── uploads/               # gambar hasil upload catatan (di-gitignore)
├── src/
│   ├── main.ts                # bootstrap Vue + router
│   ├── App.vue                # layout global: menu, router-view, dialog
│   ├── types.ts               # tipe domain bersama (MapNode, MapEdge, VocabItem, …)
│   ├── router/index.ts        # 6 route halaman
│   ├── style.css              # token tema + seluruh CSS global
│   ├── data/content.ts        # data statis (nav, kartu, FAQ, footer)
│   ├── composables/           # store/state layer (API-facing):
│   │   ├── useNavigation.ts   # state panel + wheel/touch/keyboard
│   │   ├── useTheme.ts        # tema light/dark
│   │   ├── useVocabStore.ts   # API kosakata (preview + CRUD)
│   │   ├── useVocabPages.ts   # lazy-load + cache 3 halaman (LRU)
│   │   ├── useMapStore.ts     # store peta kalimat + auto-save
│   │   ├── useNoteStore.ts    # store catatan
│   │   ├── useChatAgent.ts    # agen chat lokal + mode AI
│   │   └── useConfirm.ts      # dialog konfirmasi global
│   ├── core/                  # ★ logika murni — tanpa DOM-logic di komponen (.vue)
│   │   ├── mapGeometry.ts     # fungsi murni: rect seleksi, clamp, koordinat kanvas, path bezier
│   │   ├── useMapZoom.ts      # zoom in/out/reset (MIN/MAX/STEP)
│   │   ├── useMapSelection.ts # pilih/hover node & edge, seleksi kotak, Delete
│   │   ├── useMapCanvasInteractions.ts # drag node, resize, connect, temp-edge
│   │   ├── useMapNodePlacement.ts      # drop dari palet → node baru
│   │   ├── useMapPaletteDrag.ts        # ghost drag dari palet ke kanvas
│   │   ├── useMapInspector.ts          # properti node/edge terpilih
│   │   ├── useMapTemplate.ts           # template pola (S+V, S+O+V, …)
│   │   ├── useMapStatus.ts             # status simpan/auto-save
│   │   ├── useMapClear.ts              # bersihkan kanvas (+konfirmasi)
│   │   ├── useMapExport.ts             # ekspor PNG via html2canvas
│   │   ├── useKosakataCrud.ts          # form tambah/ubah/hapus kosakata
│   │   ├── useSearchDialog.ts          # popup Ctrl+K + highlight segmen
│   │   ├── vocabPagination.ts          # jendela nomor halaman + opsi kategori
│   │   ├── noteFormat.ts               # range/sorot/font, validasi & upload gambar
│   │   ├── noteOptions.ts              # konstanta editor (font, ukuran, warna, preset)
│   │   ├── useNoteEditor.ts            # editor kaya-format (undo, auto-save)
│   │   ├── useNoteSidebar.ts           # sidebar catatan
│   │   ├── useNoteChat.ts              # kirim catatan ke chatbot
│   │   ├── renderRich.ts               # teks → HTML (markdown ringan, dipakai chat)
│   │   ├── resourceLinks.ts            # preset + normalisasi link resource
│   │   ├── useResourceLinks.ts         # state resource (pin, tambah, hapus)
│   │   └── useChatDraft.ts             # draft input chat + submit/enter
│   ├── pages/                 # HomePage, KosakataPage, PetaPage,
│   │                          # NotePage, ChatPage, ResourcePage
│   └── components/            # MenuBar, DotsNav, SearchDialog,
│                              # ConfirmDialog, panel/*, map/*
└── dist/                      # hasil build (tidak di-commit)
```

### Arsitektur `src/core` (delegasi logika)

Seluruh logika bisnis/UI berada di modul `src/core`; komponen `.vue` hanya melakukan **perakitan** — memanggil composable core lalu mendestructure hasilnya untuk template. Pola ini membuat setiap fungsi dapat diuji dan ditelusuri terpisah dari view, dan menjaga script komponen tetap tipis. Verifikasi dilakukan dengan `npm run typecheck` (`vue-tsc`) sebelum `npm run build`.

---

## 🌐 API Endpoints

Semua dijalankan oleh `server/index.ts` (port 3000, di-proxy Vite saat dev).

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/vocab?q=&offset=&limit=` | Cari/paginasi kosakata → `{ total, items }` |
| POST | `/api/vocab` | Tambah kosakata → `{ item, total }` |
| PUT/DELETE | `/api/vocab/:id` | Ubah/hapus (hapus balas `{ ok, total, index }`) |
| GET/PUT | `/api/map` | Muat/simpan dokumen peta (nodes + edges, tersanitasi) |
| GET/PUT | `/api/note` | Muat/simpan catatan (HTML disanitasi) |
| POST | `/api/note/image` | Upload gambar (multipart, magic-byte, maks 3 MB) |
| GET/POST | `/api/chat/status`, `/api/chat` | Status & proxy chat AI → TokenHarbor |
| GET | `/uploads/<nama>` | Sajikan gambar hasil upload (cache immutable) |

---

## 🗂 Struktur Data JSON

**`data/vocab.json`** — array entri sederhana:
```json
[
  { "id": 1, "jp": "こんにちは", "romaji": "konnichiwa", "arti": "Halo, selamat siang", "kategori": "Salam" }
]
```

**`data/map.json`** — dokumen peta kalimat:
```json
{
  "nodes": [{ "id": "n1", "role": "shugo", "shape": "kotak", "text": "私", "x": 470, "y": 380, "w": 150, "h": 64 }],
  "edges": [{ "id": "e1", "from": "n1", "to": "n2", "label": "は" }]
}
```

**`data/notes.json`** — konten catatan berupa HTML yang sudah disanitasi:
```json
{ "content": "<p>Latihan hari ini…</p><img src=\"/uploads/abc.png\" width=\"360\">" }
```

---

## 🧪 Validasi

- `npm run typecheck` (`vue-tsc --noEmit`) lolos tanpa error — seluruh `src/` (termasuk `core/`) bertipe ketat
- `npm run build` sukses (`vue-tsc` + `vite build` → `dist/`), tanpa error
- Seluruh logika komponen didelegasikan ke `src/core`; `.vue` hanya merakit composable
- Test API live: CRUD kosakata roundtrip, paginasi `offset/limit`, pencarian `?q=`, sanitasi peta & catatan, upload gambar (magic-byte), endpoint chat status
- Output build: `dist/index.html` + bundle JS/CSS

---

## 📝 Catatan

- File `bak/deepseek_html_20261010_5ed27e.html` adalah versi HTML asli (referensi desain) — sengaja dipertahankan di folder `bak/`, tidak dijalankan Vite.
- Folder `data/uploads/` masuk `.gitignore` (file gambar lokal).
- Halaman Resource menyimpan tautan user di `localStorage` (client-side), sementara data utama lainnya (kosakata, peta, catatan) tersimpan di file JSON via API.
