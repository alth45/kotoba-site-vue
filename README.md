# 🌸 Kotoba — Kosakata Jepang untuk Pemula

Situs belajar bahasa Jepang interaktif berbasis **Vue 3 + Vite (TypeScript)** dengan **backend Node.js tanpa framework** — data benar-benar tersimpan di file JSON lokal (bukan hanya di browser).

> Terdiri dari **8 halaman/route utama**: beranda, kelola kosakata, peta pola kalimat, catatan kaya format, chatbot, pustaka resource belajar, kumpulan situs Jepang & anime (SitusGroup), serta penampil internal SitusGroup.

---

## ✨ Fitur

### Halaman
| Halaman | Route | Deskripsi |
|---|---|---|
| **Beranda** | `/` | Landing page 5-panel dengan transisi scroll (wheel/touch/keyboard), tema light/dark, menu melayang Ctrl+M |
| **Kosakata** | `/kosakata` | Tabel CRUD kosakata — count di atas tabel, tambah/ubah/hapus (dialog konfirmasi bertema), **paginasi 10/halaman**, lazy-load + **cache 3 halaman (LRU)**, **pencarian popup (Ctrl+K)** dengan highlight kata & loncat ke halaman |
| **Peta Kalimat** | `/peta` | Kanvas drag & drop untuk memetakan struktur kalimat Jepang — palet bentuk, peran tata bahasa (主語/目的語/述語/助詞…), partikel cepat, template pola (S+V, S+O+V…), garis bezier berlabel, inspector properti, zoom, **export PNG** (html2canvas), auto-save |
| **Catatan** | `/catatan` | Notepad kaya format — 7 font (termasuk UD Digi Kyokasho & font Jepang), ukuran 12–48px, warnai/sorot teks terblok, **insert gambar (upload + resize)**, undo, auto-save |
| **Chat** | `/chat` | Chatbot "Koto" 2 mode: **Lokal** (aturan + pencarian kosakata, tanpa jaringan) & **AI** (model TokenHarbor via proxy), riwayat persisten, indikator mengetik |
| **Resource** | `/resource` | Pustaka tautan belajar Jepang — 20 preset (kamus, berita, JLPT…), filter kategori, pin, tambah/hapus tautan sendiri |
| **SitusGroup** | `/situsgroup` | Kumpulan situs berdomain Jepang (.jp / .co.jp / .or.jp / .go.jp) & platform anime/manga/komik/game gratis — 40+ preset terkategorisasi, filter, pin, tambah/hapus link sendiri, dibuka **internal** (tanpa tab baru) |
| **SitusGroup Viewer** | `/situsgroup/view` | Penampil internal link SitusGroup lewat iframe — toolbar back/reload/open, favicon & domain, fallback `sessionStorage` agar tahan refresh |

### Fitur global
- 🎨 **Tema light/dark** — ikon toggle di menu, tersimpan di localStorage, ikut `prefers-color-scheme`
- ⌨️ **Shortcut**: `Ctrl+M` buka/tutup menu · `Esc` tutup · `↑↓ PgUp PgDn Home End` navigasi panel (beranda) · `Ctrl+K` pencarian (halaman kosakata) · `Del` hapus elemen terpilih (peta)
- 💾 **Persistensi file JSON** — semua data tersimpan di folder `data/`, aman dari reset browser
- 🔒 **Tulis aman & bebas race** — operasi tulis JSON diserialisasi dengan write-lock per berkas dan penulisan atomik (temp → fsync → rename)
- 🧩 **Dialog konfirmasi kustom** — menggantikan `window.confirm` bawaan, mengikuti token tema

---

## 🛠 Tech Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | Vue 3.5 (Composition API, SFC, TypeScript) · Vue Router 4.6 · Vite 7.3 · vue-tsc |
| Backend | Node.js murni (`node:http`) tanpa framework — `server/index.ts`, dijalankan via `tsx` |
| AI (opsional) | SDK `openai` 6.x → TokenHarbor (`deepseek-v4.1-flash:free`) — **hanya di server** |
| Ekspor gambar | `html2canvas` 1.4 (export PNG peta kalimat) |
| Data | File JSON di `data/` (vocab, peta, catatan, upload gambar) |

---

## 🚀 Cara Menjalankan

**Prasyarat:** Node.js ≥ 20.19 (diuji di v24) + npm.

```bash
npm install          # instal dependensi
npm run dev          # API (port 3000, via tsx) + Vite dev (port 5173) bersamaan
```

Buka `http://localhost:5173`.

```bash
npm run build        # type-check (vue-tsc) + build produksi ke dist/
npm start            # produksi: server menyajikan dist/ + API di port 3000
npm run typecheck    # hanya pengecekan tipe TypeScript
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
| `KOTOBA_DATA_DIR` | `data/` *(folder data, bisa dialihkan untuk test/dev)* |

Tanpa kunci, mode AI tampil nonaktif di dropdown dan chatbot tetap jalan penuh dalam mode Lokal.


---

## 📁 Struktur Project

```
kotoba-site/
├── index.html                 # entry Vite
├── vite.config.ts             # proxy /api & /uploads → :3000
├── tsconfig.json              # konfigurasi TypeScript (strict)
├── package.json               # scripts: dev / dev:server / build / preview / start / typecheck
├── server/                    # backend TypeScript (dijalankan dengan tsx)
│   ├── index.ts               # perangkai server HTTP + routing
│   ├── config.ts              # path, port, parameter env
│   ├── types.ts               # tipe bersama (VocabItem, DTO peta, dll.)
│   ├── static.ts              # penyajian dist/ (SPA) & /uploads/
│   ├── lib/
│   │   ├── http.ts            # HttpError & sendJson
│   │   ├── body.ts            # pembacaan body JSON & multipart gambar
│   │   └── writeLock.ts       # kunci tulis per-berkas + penulisan atomik
│   └── routes/
│       ├── vocab.ts           # GET/POST/PUT/DELETE /api/vocab
│       ├── map.ts             # GET/PUT /api/map
│       ├── note.ts            # GET/PUT /api/note & POST /api/note/image
│       └── chat.ts            # /api/chat/status & /api/chat (proxy AI)
├── scripts/
│   └── dev.js                 # launcher dev (API + Vite bersamaan)
├── data/                      # ← semua data tersimpan di sini
│   ├── vocab.json             # daftar kosakata (sumber kebenaran)
│   ├── map.json               # dokumen peta pola kalimat
│   ├── notes.json             # konten catatan (HTML)
│   └── uploads/               # gambar hasil upload catatan (di-gitignore)
├── src/                       # frontend Vue 3 + TypeScript
│   ├── main.ts                # bootstrap Vue + router
│   ├── App.vue                # layout global: menu, router-view, dialog
│   ├── types.ts               # tipe bersama frontend
│   ├── router/index.ts        # 8 route halaman
│   ├── style.css              # token tema + seluruh CSS global
│   ├── data/content.ts        # data statis (nav, kartu, FAQ, footer)
│   ├── composables/           # useNavigation, useTheme, useVocabStore,
│   │                          # useVocabPages, useMapStore, useNoteStore,
│   │                          # useChatAgent, useConfirm
│   ├── core/                  # logika murni yang dapat dites:
│   │   │                      # mapGeometry, vocabPagination, renderRich,
│   │   │                      # noteFormat/noteOptions, resourceLinks,
│   │   │                      # situsGroup + useSitusGroup, useMapExport,
│   │   │                      # useKosakataCrud, useSearchDialog, dll.
│   ├── pages/                 # HomePage, KosakataPage, PetaPage, NotePage,
│   │                          # ChatPage, ResourcePage, SitusGroupPage,
│   │                          # SitusViewerPage
│   └── components/            # MenuBar, DotsNav, SearchDialog, ConfirmDialog,
│                              # panel/*, map/*
├── bak/                       # cadangan HTML asli (referensi desain)
└── dist/                      # hasil build (tidak di-commit)
```

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

- `npm run typecheck` — TypeScript strict mode (`vue-tsc --noEmit`) tanpa error
- `npm run build` — type-check + build produksi Vite sukses, tanpa error
- Test API live: CRUD kosakata roundtrip, paginasi `offset/limit`, pencarian `?q=`, sanitasi peta & catatan, upload gambar (magic-byte), endpoint chat status
- Konkurensi tulis diverifikasi dengan `_repro_race.mjs` (POST `/api/vocab` paralel → tidak ada lost update / id duplikat berkat write-lock)
- Output build: `dist/index.html` + bundle JS/CSS

---

## 📝 Catatan

- Seluruh kode (frontend & backend) kini memakai **TypeScript**; server dijalankan langsung via `tsx` tanpa langkah build terpisah.
- File di folder `bak/` adalah versi HTML asli (referensi desain) — sengaja dipertahankan, tidak dijalankan Vite.
- Folder `data/uploads/` masuk `.gitignore` (file gambar lokal).
- Halaman Resource dan SitusGroup menyimpan tautan user di `localStorage` (client-side), sementara data utama lainnya (kosakata, peta, catatan) tersimpan di file JSON via API.
- Link SitusGroup dibuka lewat halaman Viewer internal (`/situsgroup/view`) menggunakan iframe; sebagian situs besar memblokir framing (X-Frame-Options), sehingga tersedia tombol buka di tab baru sebagai fallback.
