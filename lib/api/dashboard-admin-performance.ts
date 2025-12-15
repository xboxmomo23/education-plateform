import { apiCall } from "./base"

export interface AdminPerformanceRequest {
  termId?: string
  classId?: string
}

export interface AdminPerformanceResponse {
  period: {
    termId?: string | null
    label: string
    from?: string
    to?: string
  }
  establishment: {
    avg: number
    studentCount: number
    passRate: number
  }
  distribution: {
    lt10: number
    b10_12: number
    b12_14: number
    b14_16: number
    gte16: number
  }
  classes: Array<{
    class_id: string
    class_label: string
    student_count: number
    avg: number
    passRate: number
  }>
  topStudents: Array<{
    student_id: string
    full_name: string
    class_label: string
    avg: number
  }>
}

export const dashboardAdminPerformanceApi = {
  async getPerformance(params: AdminPerformanceRequest = {}) {
    const query = new URLSearchParams()
    if (params.termId) query.set("termId", params.termId)
    if (params.classId && params.classId !== "all") query.set("classId", params.classId)
    if (params.classId === "all") query.set("classId", "all")
    const qs = query.toString()
    return apiCall<AdminPerformanceResponse>(`/dashboard/admin/performance${qs ? `?${qs}` : ""}`)
  },
}
