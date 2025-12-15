import { apiCall } from "./base"

export interface AdminDashboardKpis {
  students_active: number
  teachers_active: number
  staff_active: number
  parents_active: number
  absences_today_total: number
  absences_today_not_justified: number
  date: string
}

export const dashboardAdminApi = {
  async getKpis() {
    return apiCall<AdminDashboardKpis>("/dashboard/admin/kpi")
  },
}
