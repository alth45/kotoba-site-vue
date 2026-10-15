/**
 * Data statis untuk halaman Kotoba.
 * Dipisah dari komponen agar mudah dikelola dan diganti.
 */

export const navItems = [
  { label: 'Beranda', target: 0 },
  { label: 'Dasar', target: 1 },
  { label: 'Kosakata', page: '/kosakata' },
  { label: 'Peta Kalimat', page: '/peta' },
  { label: 'Catatan', page: '/catatan' },
  { label: 'Chat', page: '/chat' },
  { label: 'Resource', page: '/resource' },
  { label: 'FAQ', target: 3 },
  { label: 'Kontak', target: 4 },
]

export const heroStats = [
  { value: '8 Kata', label: 'Kosakata dasar' },
  { value: 'N5', label: 'Level pemula' },
  { value: '5 Menit', label: 'Latihan harian' },
]

/**
 * Kartu pada panel "Dasar".
 * `paths` berisi isi element <path> dari ikon SVG-nya.
 */
export const featureCards = [
  {
    title: 'Kelompokkan per tema',
    text: 'Salam, angka, kata kerja — mengelompokkan kosakata membuat otak lebih cepat mengingatnya.',
    color: 'var(--accent)',
    paths: ['M4 5h16v14H4z', 'M8 9h8M8 13h5'],
  },
  {
    title: 'Dengar pelafalannya',
    text: 'Romaji membantu memulai, tetapi telinga tetap perlu berlatih mendengar bunyi aslinya.',
    color: 'var(--accent-2)',
    paths: ['M12 3v18M5 8v8M19 8v8'],
  },
  {
    title: 'Ulangi secara bertahap',
    text: 'Cukup lima menit sehari. Lebih baik sering dan singkat daripada lama tapi jarang.',
    color: 'var(--accent-4)',
    paths: ['M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Z', 'M9 12l2 2 4-4'],
  },
]

/**
 * Catatan: daftar kosakata kini tersimpan di file JSON (data/vocab.json)
 * dan diakses lewat API /api/vocab — lihat server/index.js.
 */

/**
 * Item FAQ. `answerHtml` boleh memuat tag sederhana seperti <strong>.
 * Konten berasal dari file HTML asli, sehingga v-html aman dipakai di sini.
 */
export const faqItems = [
  {
    question: 'Apakah perlu hafal hiragana dulu?',
    answerHtml:
      'Tidak harus. Kamu bisa mulai dengan romaji dulu agar cepat praktik, lalu pelan-pelan mengenali hiragana seiring waktu. Dua-duanya berjalan berdampingan.',
  },
  {
    question: 'Berapa lama untuk hafal 8 kata ini?',
    answerHtml:
      'Dengan latihan lima menit sehari, sebagian besar pemula sudah nyaman dalam tiga sampai lima hari. Kuncinya adalah pengulangan, bukan durasi.',
  },
  {
    question: 'Kata mana yang paling penting dulu?',
    answerHtml:
      'Mulailah dari <strong>こんにちは</strong> dan <strong>ありがとう</strong>. Keduanya paling sering muncul dalam percakapan sehari-hari, sehingga cepat terasa berguna.',
  },
  {
    question: 'Apakah kosakata ini cukup untuk percakapan?',
    answerHtml:
      'Delapan kata ini adalah fondasi. Setelah nyaman, kamu bisa lanjut ke angka, kata tunjuk, dan kata kerja dasar untuk membentuk kalimat sederhana.',
  },
  {
    question: 'Bagaimana cara membuka menu?',
    answerHtml:
      'Tekan <strong>Ctrl + M</strong> di mana saja. Menu bar akan melayang turun dari atas layar. Tekan Esc atau klik area kosong untuk menutupnya kembali.',
  },
]

/**
 * Kolom link footer. `target` (bila ada) adalah indeks panel tujuan.
 */
export const footerColumns = [
  {
    title: 'Belajar',
    links: [
      { label: 'Dasar', target: 1 },
      { label: 'Kosakata', target: 2 },
      { label: 'FAQ', target: 3 },
    ],
  },
  {
    title: 'Kategori',
    links: [{ label: 'Salam' }, { label: 'Angka' }, { label: 'Kata kerja' }],
  },
  {
    title: 'Dukungan',
    links: [{ label: 'Pusat bantuan' }, { label: 'Kontak' }, { label: 'Status' }],
  },
]
