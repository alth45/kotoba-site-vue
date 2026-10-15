import { ref } from 'vue'

/**
 * Store catatan (notepad kaya format).
 * Konten HTML disimpan di data/notes.json lewat API /api/note.
 */

const NOTE_API = '/api/note'

const content = ref('')
const loading = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)
const lastSavedAt = ref<Date | null>(null)

const AUTOSAVE_MS = 900
let saveTimer: number | undefined
let queuedSave = false

async function loadNote(): Promise<void> {
  loading.value = true
  saveError.value = null
  try {
    const res = await fetch(NOTE_API)
    if (!res.ok) throw new Error(`Gagal memuat catatan (HTTP ${res.status}).`)
    const data = (await res.json()) as { content?: unknown }
    content.value = typeof data.content === 'string' ? data.content : ''
  } catch (e) {
    saveError.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function saveNote(): Promise<void> {
  if (saving.value) {
    queuedSave = true
    return
  }
  saving.value = true
  saveError.value = null
  try {
    const res = await fetch(NOTE_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.value }),
    })
    if (!res.ok) throw new Error(`Gagal menyimpan (HTTP ${res.status}).`)
    lastSavedAt.value = new Date()
  } catch (e) {
    saveError.value = (e as Error).message
  } finally {
    saving.value = false
    if (queuedSave) {
      queuedSave = false
      saveNote()
    }
  }
}

function scheduleSave(): void {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(saveNote, AUTOSAVE_MS)
}

export function useNoteStore() {
  return { content, loading, saving, saveError, lastSavedAt, loadNote, saveNote, scheduleSave }
}
