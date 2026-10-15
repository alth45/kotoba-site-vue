import { ref } from 'vue'

/**
 * Store catatan (notepad kaya format).
 * Konten HTML disimpan di data/notes.json lewat API /api/note.
 */

const NOTE_API = '/api/note'

const content = ref('')
const loading = ref(false)
const saving = ref(false)
const saveError = ref(null)
const lastSavedAt = ref(null)

const AUTOSAVE_MS = 900
let saveTimer = null
let queuedSave = false

async function loadNote() {
  loading.value = true
  saveError.value = null
  try {
    const res = await fetch(NOTE_API)
    if (!res.ok) throw new Error(`Gagal memuat catatan (HTTP ${res.status}).`)
    const data = await res.json()
    content.value = typeof data.content === 'string' ? data.content : ''
  } catch (e) {
    saveError.value = e.message
  } finally {
    loading.value = false
  }
}

async function saveNote() {
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
    saveError.value = e.message
  } finally {
    saving.value = false
    if (queuedSave) {
      queuedSave = false
      saveNote()
    }
  }
}

function scheduleSave() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(saveNote, AUTOSAVE_MS)
}

export function useNoteStore() {
  return { content, loading, saving, saveError, lastSavedAt, loadNote, saveNote, scheduleSave }
}
