import { apiCallWithAbort } from "./client"
import type { AttendanceHistoryItem, AttendanceStats } from "./attendance"

type HistoryOptions = {
  startDate?: string
  endDate?: string
  limit?: number
}

export const parentAttendanceApi = {
  async getHistory(
    studentId: string,
    options?: HistoryOptions,
    signal?: AbortSignal
  ) {
    const params = new URLSearchParams()

    if (options?.startDate) params.append("startDate", options.startDate)
    if (options?.endDate) params.append("endDate", options.endDate)
    if (options?.limit) params.append("limit", options.limit.toString())

    const queryString = params.toString()
    const url = `/parent/students/${studentId}/attendance${queryString ? `?${queryString}` : ""}`

    return apiCallWithAbort<{
      success: boolean
      data: { history: AttendanceHistoryItem[]; stats: AttendanceStats }
      error?: string
    }>(url, {}, signal)
  },
}
