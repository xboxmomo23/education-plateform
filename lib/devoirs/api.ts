import type { Devoir } from "./types"
import { MOCK_DEVOIRS, MOCK_COURSES, MOCK_CLASSES } from "./mockDevoirs"

// In-memory storage (simulates database)
const devoirs: Devoir[] = [...MOCK_DEVOIRS]

// TODO: Replace with fetch('/api/devoirs/by-author?email=...')
export async function getDevoirsByAuthor(email: string): Promise<Devoir[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = devoirs.filter((d) => d.authorEmail === email)
      resolve(filtered)
    }, 100)
  })
}

// TODO: Replace with fetch('/api/devoirs/by-class?classId=...')
export async function getDevoirsByClass(classId: string): Promise<Devoir[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = devoirs.filter((d) => d.classIds.includes(classId) && d.status === "published")
      resolve(filtered)
    }, 100)
  })
}

// TODO: Replace with fetch('/api/devoirs/:id')
export async function getDevoir(id: string): Promise<Devoir | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const devoir = devoirs.find((d) => d.id === id)
      resolve(devoir || null)
    }, 100)
  })
}

// TODO: Replace with fetch('/api/devoirs', { method: 'POST', body: JSON.stringify(data) })
export async function createDevoir(data: Omit<Devoir, "id" | "createdAt" | "history">): Promise<Devoir> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newDevoir: Devoir = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        history: [
          {
            by: data.authorName,
            role: "teacher",
            when: new Date().toISOString(),
            changes: `Devoir créé${data.status === "published" ? " et publié" : " (brouillon)"}`,
          },
        ],
      }
      devoirs.push(newDevoir)
      resolve(newDevoir)
    }, 100)
  })
}

// TODO: Replace with fetch('/api/devoirs/:id', { method: 'PUT', body: JSON.stringify(updates) })
export async function updateDevoir(
  id: string,
  updates: Partial<Devoir>,
  modifiedBy: string,
  modifiedRole: string,
): Promise<Devoir | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = devoirs.findIndex((d) => d.id === id)
      if (index === -1) {
        resolve(null)
        return
      }

      const oldDevoir = devoirs[index]
      const changes: string[] = []

      if (updates.title && updates.title !== oldDevoir.title) {
        changes.push(`Titre modifié`)
      }
      if (updates.description && updates.description !== oldDevoir.description) {
        changes.push(`Description modifiée`)
      }
      if (updates.dueDate && updates.dueDate !== oldDevoir.dueDate) {
        changes.push(`Date de remise modifiée`)
      }
      if (updates.status && updates.status !== oldDevoir.status) {
        changes.push(`Statut changé: ${oldDevoir.status} → ${updates.status}`)
      }

      const updatedDevoir: Devoir = {
        ...oldDevoir,
        ...updates,
        history: [
          ...oldDevoir.history,
          {
            by: modifiedBy,
            role: modifiedRole,
            when: new Date().toISOString(),
            changes: changes.join(", ") || "Devoir modifié",
          },
        ],
      }

      devoirs[index] = updatedDevoir
      resolve(updatedDevoir)
    }, 100)
  })
}

// TODO: Replace with fetch('/api/devoirs/:id', { method: 'DELETE' })
export async function deleteDevoir(id: string): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = devoirs.findIndex((d) => d.id === id)
      if (index === -1) {
        resolve(false)
        return
      }
      devoirs.splice(index, 1)
      resolve(true)
    }, 100)
  })
}

// Helper to get courses for a teacher
export async function getCoursesByTeacher(email: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const courses = MOCK_COURSES.filter((c) => c.teacherEmail === email)
      resolve(courses)
    }, 50)
  })
}

// Helper to get all classes
export async function getAllClasses() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_CLASSES)
    }, 50)
  })
}
