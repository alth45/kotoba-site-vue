/**
 * Konkurensi: kunci tulis per-berkas (mutex antrean) + penulisan atomik.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'

/** Kunci antrean tulis per-berkas. */
export const LOCK_VOCAB = 'vocab'
export const LOCK_MAP = 'map'
export const LOCK_NOTE = 'note'

const writeQueues = new Map<string, Promise<unknown>>()

function noop(): void {}

/**
 * Jalankan `task` secara eksklusif untuk `key` (write queue / mutex).
 *
 * Semua siklus "baca seluruh file → ubah di memori → tulis ulang" WAJIB lewat
 * sini. Tanpa ini dua request paralel bisa membaca state lama yang sama lalu
 * saling menimpa: item hilang (lost update), id duplikat, `index` kacau, atau
 * file JSON korup.
 *
 * PENTING: jangan memanggil `withWriteLock()` dengan `key` yang sama dari dalam
 * `task` yang sedang berjalan — tugas itu akan mengantre di belakang dirinya
 * sendiri dan menggantung selamanya.
 */
export function withWriteLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(key) ?? Promise.resolve()
  // `then(task, task)` → tugas tetap dijalankan walau operasi sebelumnya gagal.
  const run = previous.then(task, task)
  // Rantai antrean tidak boleh menyimpan rejection agar tidak "macet".
  const tail = run.then(noop, noop)
  writeQueues.set(key, tail)
  // Bersihkan entri bila sudah tidak ada penerus (mencegah kebocoran memori).
  void tail.then(() => {
    if (writeQueues.get(key) === tail) writeQueues.delete(key)
  })
  return run
}

/**
 * Tulis file secara atomik: tulis ke berkas temporer di folder yang sama,
 * `fsync`, lalu `rename()`. `rename` bersifat atomik di POSIX sehingga pembaca
 * hanya melihat isi lama atau isi baru — tidak pernah setengah jadi.
 */
export async function writeFileAtomic(filePath: string, data: string | Uint8Array): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}.tmp`,
  )
  try {
    const handle = await fs.open(tmp, 'w')
    try {
      await handle.writeFile(data)
      await handle.sync()
    } finally {
      await handle.close()
    }
    await fs.rename(tmp, filePath)
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {})
    throw err
  }
}
