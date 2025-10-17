import type { Note, ClassStats, HistoryEntry } from "./types"
import { MOCK_NOTES, MOCK_STUDENTS, MOCK_SUBJECTS } from "./mockNotes"

// In-memory storage for mock data (in a real app, this would be in a database)
const notesStore = [...MOCK_NOTES]

/**
 * Get a single note by ID
 * TODO: Replace with real API call: fetch(`/api/notes/${noteId}`)
 */
export async function getNote(noteId: string): Promise<Note | null> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  const note = notesStore.find((n) => n.id === noteId)
  return note || null
}

/**
 * Update a note
 * TODO: Replace with real API call: fetch(`/api/notes/${noteId}`, { method: 'PATCH', body: JSON.stringify(updates) })
 */
export async function updateNote(
  noteId: string,
  updates: Partial<Note>,
  updatedBy: string,
  updatedByRole: string,
): Promise<Note> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const noteIndex = notesStore.findIndex((n) => n.id === noteId)
  if (noteIndex === -1) {
    throw new Error("Note not found")
  }

  const oldNote = notesStore[noteIndex]
  const changes: HistoryEntry["changes"] = {}

  // Track what changed
  Object.keys(updates).forEach((key) => {
    if (key !== "history" && updates[key as keyof Note] !== oldNote[key as keyof Note]) {
      changes[key] = {
        from: oldNote[key as keyof Note],
        to: updates[key as keyof Note],
      }
    }
  })

  // Create history entry
  const historyEntry: HistoryEntry = {
    by: updatedBy,
    role: updatedByRole,
    when: new Date().toISOString(),
    changes,
  }

  // Update the note
  const updatedNote = {
    ...oldNote,
    ...updates,
    history: [...oldNote.history, historyEntry],
  }

  notesStore[noteIndex] = updatedNote

  // Recalculate class averages (mock)
  console.log("[v0] Recalculating class averages after update")

  return updatedNote
}

/**
 * Get class statistics for a specific subject and evaluation type
 * TODO: Replace with real API call: fetch(`/api/notes/stats?subjectId=${subjectId}&type=${type}`)
 */
export async function getClassAverages(subjectId: string, evaluationType?: string): Promise<ClassStats> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200))

  const relevantNotes = notesStore.filter(
    (n) => n.subjectId === subjectId && (!evaluationType || n.type === evaluationType),
  )

  if (relevantNotes.length === 0) {
    return { average: 0, min: 0, max: 0 }
  }

  const values = relevantNotes.map((n) => n.value)
  return {
    average: values.reduce((sum, v) => sum + v, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

/**
 * Get best and worst grades for a subject
 * TODO: Replace with real API call: fetch(`/api/notes/best-worst?subjectId=${subjectId}`)
 */
export async function getBestWorst(subjectId: string): Promise<{ best: number; worst: number }> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200))

  const relevantNotes = notesStore.filter((n) => n.subjectId === subjectId)

  if (relevantNotes.length === 0) {
    return { best: 0, worst: 0 }
  }

  const values = relevantNotes.map((n) => n.value)
  return {
    best: Math.max(...values),
    worst: Math.min(...values),
  }
}

/**
 * Get all notes (for listing)
 * TODO: Replace with real API call: fetch('/api/notes')
 */
export async function getAllNotes(): Promise<Note[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return [...notesStore]
}

/**
 * Get students list
 * TODO: Replace with real API call: fetch('/api/students')
 */
export async function getStudents() {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return MOCK_STUDENTS
}

/**
 * Get subjects list
 * TODO: Replace with real API call: fetch('/api/subjects')
 */
export async function getSubjects() {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return MOCK_SUBJECTS
}
