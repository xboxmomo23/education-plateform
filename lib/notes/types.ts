// Shared types for notes system

export type EvaluationType = "Contrôle" | "Devoir" | "Participation" | "Examen"

export interface HistoryEntry {
  by: string
  role: string
  when: string
  changes: {
    [key: string]: {
      from: any
      to: any
    }
  }
}

export interface Note {
  id: string
  studentId: string
  studentName: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  value: number
  coefficient: number
  type: EvaluationType
  date: string
  comment?: string
  createdAt: string
  createdBy: string
  createdByRole: string
  history: HistoryEntry[]
}

export interface ClassStats {
  average: number
  min: number
  max: number
}
