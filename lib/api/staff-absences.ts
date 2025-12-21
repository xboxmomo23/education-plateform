import { apiCall } from "./base"
import { API_BASE_URL } from "./config"
import type { AttendanceStatus } from "./attendance"

export interface StaffAbsenceHistoryParams {
  q?: string
  classId?: string
  status?: "absent" | "late" | "excused" | "all"
  justified?: "true" | "false" | "all"
  from?: string
  to?: string
  page?: number
  limit?: number
  sort?: "date_desc" | "date_asc" | "student_asc" | "class_asc"
}

export interface StaffAbsenceHistoryItem {
  id: string
  student_id: string
  student_name: string
  student_number: string | null
  class_id: string
  class_label: string
  status: AttendanceStatus
  justified: boolean
  session_date: string
  start_time: string
  end_time: string
  subject_name: string
  subject_color: string | null
  teacher_name: string | null
  comment: string | null
  justification: string | null
  justified_at: string | null
  created_at: string
  updated_at: string | null
  late_minutes: number | null
  school_year: string
}

export interface StaffAbsenceHistoryResponse {
  items: StaffAbsenceHistoryItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function buildQuery(params: StaffAbsenceHistoryParams = {}) {
  const query = new URLSearchParams()
  if (params.q) query.set("q", params.q)
  if (params.classId && params.classId !== "all") query.set("classId", params.classId)
  if (params.status && params.status !== "all") query.set("status", params.status)
  if (params.justified && params.justified !== "all") query.set("justified", params.justified)
  if (params.from) query.set("from", params.from)
  if (params.to) query.set("to", params.to)
  if (params.page && params.page > 1) query.set("page", String(params.page))
  if (params.limit && params.limit !== 50) query.set("limit", String(params.limit))
  if (params.sort && params.sort !== "date_desc") query.set("sort", params.sort)
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ""
}

async function fetchBlob(endpoint: string) {
  const token = localStorage.getItem("auth_token")
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || "Erreur export")
  }

  const blob = await response.blob()
  const disposition = response.headers.get("Content-Disposition")
  let filename: string | undefined
  if (disposition) {
    const match = /filename\*?=(?:UTF-8''|")?([^;\n"]+)/i.exec(disposition)
    if (match && match[1]) {
      filename = decodeURIComponent(match[1].replace(/"/g, "").trim())
    }
  }

  return { blob, filename }
}

export const staffAbsencesApi = {
  async getHistory(params: StaffAbsenceHistoryParams = {}) {
    return apiCall<StaffAbsenceHistoryResponse>(`/staff/absences/history${buildQuery(params)}`)
  },

  async exportCsv(params: StaffAbsenceHistoryParams = {}) {
    return fetchBlob(`${API_BASE_URL}/staff/absences/export.csv${buildQuery(params)}`)
  },

  async exportPdf(params: StaffAbsenceHistoryParams = {}) {
    return fetchBlob(`${API_BASE_URL}/staff/absences/export.pdf${buildQuery(params)}`)
  },
}
