/**
 * core/vocabPagination.ts
 * Util murni untuk daftar kosakata (KosakataPage):
 * pemotongan jendela nomor halaman pada pagination.
 */
export type PageEntry = number | '…'

/** Nomor halaman yang ditampilkan (dengan "…" bila terlalu banyak). */
export function pageWindow(totalPages: number, current: number): PageEntry[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages: PageEntry[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(totalPages - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < totalPages - 2) pages.push('…')
  pages.push(totalPages)
  return pages
}

/** Daftar opsi kategori default (+ turunan dari data tidak ditangani di sini). */
export const BASE_KATEGORI = ['Salam', 'Sopan', 'Dasar', 'Angka', 'Kata kerja']

/** Gabungkan kategori default dengan kategori baru yang muncul di item/draft. */
export function buildKategoriOptions(
  items: Array<{ kategori?: string }>,
  ...extra: Array<string | undefined>
): string[] {
  const options = [...BASE_KATEGORI]
  items.forEach((item) => {
    if (item.kategori && !options.includes(item.kategori)) options.push(item.kategori)
  })
  extra.forEach((k) => {
    if (k && !options.includes(k)) options.push(k)
  })
  return options
}
