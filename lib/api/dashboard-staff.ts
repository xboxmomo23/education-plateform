import { apiCall } from "./base"
import type { AbsenceAlert, ClassSummary } from "./dashboard"

export interface StaffKpiData {
  present_today: number
  absent_today: number
  late_today: number
  not_justified_today: number
  unread_messages: number
  classes_count: number
  students_total: number
  date: string
}

export interface StaffPendingAbsenceResponse {
  id: string
  student_id: string
  student_name: string
  student_number: string | null
  class_id: string
  class_label: string
  status: "absent" | "late"
  session_date: string
  start_time: string
  end_time: string
  subject_name: string
  subject_color: string | null
  justified: boolean
  late_minutes: number | null
}

export interface StaffClassSummaryResponse {
  class_id: string
  class_label: string
  level: string | null
  students_count: number
  absent_today: number
  late_today: number
  not_justified_today: number
}

function buildParams(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.append(key, value)
  })
  const queryString = search.toString()
  return queryString ? `?${queryString}` : ""
}

export const dashboardStaffApi = {
  async getKpis(date?: string) {
    return apiCall<StaffKpiData>(`/dashboard/staff/kpi${buildParams({ date })}`)
  },

  async getPendingAbsences(limit?: number, date?: string) {
    const params: Record<string, string | undefined> = {}
    if (limit) params.limit = String(limit)
    if (date) params.date = date
    return apiCall<StaffPendingAbsenceResponse[]>(
      `/dashboard/staff/pending-absences${buildParams(params)}`
    )
  },

  async getClassesSummary(date?: string) {
    return apiCall<StaffClassSummaryResponse[]>(
      `/dashboard/staff/classes/summary${buildParams({ date })}`
    )
  },
}
