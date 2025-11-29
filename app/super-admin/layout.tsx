"use client"

import type { ReactNode } from "react"
import { RequireRole } from "@/components/auth/RequireRole"

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole allowedRoles={["super_admin"]} redirectTo="/login-super-admin">
      {children}
    </RequireRole>
  )
}
