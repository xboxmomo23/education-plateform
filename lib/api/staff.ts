"use client";

import { apiFetch } from "@/lib/api/api-client";

export interface AdminStaffApi {
  staff_id: string;
  full_name: string;
  email: string;
  active: boolean;
  created_at: string;
  contact_email?: string | null;
  phone?: string | null;
  department?: string | null;
  employee_no?: string | null;
  must_change_password?: boolean;
  last_login?: string | null;
  assigned_class_ids?: string[] | null;
}

export const staffApi = {
  updateClasses(staffId: string, classIds: string[]) {
    return apiFetch<{ success: boolean; data?: AdminStaffApi }>(
      `/admin/staff/${staffId}/classes`,
      {
        method: "PUT",
        body: JSON.stringify({ assigned_class_ids: classIds }),
      }
    );
  },
};
