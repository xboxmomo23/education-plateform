// TypeScript types for timetable system

export type WeekType = "A" | "B" | "both"
export type CourseStatus = "confirmed" | "cancelled" | "changed" | "proposed"
export type DayOfWeek = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi"

export interface TimetableEntry {
  id: string
  courseId: string
  subject: string
  teacher: string
  teacherEmail: string
  class: string
  classId: string
  room: string
  day: DayOfWeek
  startHour: string
  endHour: string
  weekType: WeekType
  status: CourseStatus
  color: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

export interface TimetableModification {
  id: string
  entryId: string
  action: "created" | "modified" | "deleted" | "moved" | "cancelled"
  user: string
  userRole: "teacher" | "responsable" | "admin"
  timestamp: Date
  details: string
  isLate: boolean
  oldValues?: Partial<TimetableEntry>
  newValues?: Partial<TimetableEntry>
}

export interface TimetableConflict {
  type: "room" | "teacher" | "student"
  severity: "error" | "warning"
  message: string
  entries: string[]
}

export interface ChangeProposal {
  id: string
  entryId: string
  proposedBy: string
  proposedByEmail: string
  timestamp: Date
  reason: string
  proposedChanges: Partial<TimetableEntry>
  status: "pending" | "approved" | "rejected"
  reviewedBy?: string
  reviewedAt?: Date
}

export interface TimetableViewMode {
  mode: "student" | "teacher" | "responsable"
  filterBy?: {
    classId?: string
    teacherEmail?: string
    room?: string
  }
}
