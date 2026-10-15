/**
 * core/useMapExport.ts
 * Ekspor kanvas peta menjadi PNG (html2canvas), dengan reset zoom sementara
 * agar hasil selalu full-resolution.
 */
import { nextTick, ref } from 'vue'
import html2canvas from 'html2canvas'
import { CANVAS_W, CANVAS_H } from '../composables/useMapStore.ts'

export function useMapExport(
  canvasEl: () => HTMLElement | null,
  zoom: { value: number },
) {
  const exporting = ref(false)

  async function exportToPng() {
    const el = canvasEl()
    if (exporting.value || !el) return
    exporting.value = true

    // Simpan zoom saat ini, lalu reset ke 1 agar hasil export full-resolution
    const prevZoom = zoom.value
    zoom.value = 1

    // Tunggu DOM selesai render ulang setelah zoom di-reset
    await nextTick()
    // Beri sedikit waktu agar browser menyelesaikan paint
    await new Promise((r) => setTimeout(r, 80))

    try {
      const canvas = await html2canvas(el, {
        backgroundColor: null,   // transparan → ambil dari element
        scale: 2,                // 2× untuk hasil crisp di layar HiDPI
        useCORS: true,
        logging: false,
        // Paksa ukuran canvas logis (bukan ukuran terscale)
        width: CANVAS_W,
        height: CANVAS_H,
        scrollX: 0,
        scrollY: 0,
      })

      // Download
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      link.download = `peta-kalimat-${timestamp}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('[export] Gagal mengekspor:', err)
    } finally {
      // Kembalikan zoom ke nilai sebelumnya
      zoom.value = prevZoom
      exporting.value = false
    }
  }

  return { exporting, exportToPng }
}
