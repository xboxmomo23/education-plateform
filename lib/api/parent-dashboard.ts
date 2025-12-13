import { apiCallWithAbort } from "./client"
import type { RecentGrade, UpcomingHomework, UpcomingLesson } from "./dashboard"
import type { AttendanceStats } from "./attendance"

export interface ParentDashboardStudent {
  id: string
  full_name: string
  student_number?: string | null
  class_id?: string | null
  class_label?: string | null
}

export interface ParentDashboardData {
  student: ParentDashboardStudent
  recent_grades: RecentGrade[]
  upcoming_homework: UpcomingHomework[]
  next_sessions: UpcomingLesson[]
  attendance_stats?: AttendanceStats | null
}

export const parentDashboardApi = {
  async getDashboard(studentId: string, signal?: AbortSignal) {
    return apiCallWithAbort<{
      success: boolean
      data: ParentDashboardData
      error?: string
    }>(`/parent/students/${studentId}/dashboard`, {}, signal)
  },
}
