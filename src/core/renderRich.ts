/**
 * core/renderRich.ts
 * Render ringan **tebal**, `kode`, dan baris baru untuk bubble chat.
 * Aman: teks di-escape dulu sebelum disisipkan tag HTML.
 * Dipakai bersama oleh ChatPage dan NotePage (kotak chat cepat).
 */
export function renderRich(text: string): string {
  const esc = String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return esc
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}
