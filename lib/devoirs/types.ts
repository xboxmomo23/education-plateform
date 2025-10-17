export type DevoirStatus = "draft" | "published"

export interface DevoirHistory {
  by: string
  role: string
  when: string
  changes: string
}

export interface Devoir {
  id: string
  title: string
  description: string
  courseId: string
  courseName: string
  classIds: string[]
  classNames: string[]
  authorEmail: string
  authorName: string
  createdAt: string
  dueDate: string
  status: DevoirStatus
  resourceUrl?: string
  history: DevoirHistory[]
  priority?: "high" | "medium" | "low"
}

export interface Course {
  id: string
  name: string
  teacherEmail: string
}

export interface Class {
  id: string
  name: string
}
