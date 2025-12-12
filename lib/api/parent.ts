import { apiCallWithAbort } from "./client"

export const parentApi = {
  async getStudentSummary(studentId: string, signal?: AbortSignal) {
    return apiCallWithAbort(`/parent/students/${studentId}/summary`, {}, signal)
  },
}
