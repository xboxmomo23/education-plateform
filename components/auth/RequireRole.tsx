"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserSession, type User } from "@/lib/auth-new"
import type { UserRole } from "@/lib/auth-new"

interface RequireRoleProps {
  allowedRoles: UserRole[]   // ex: ["admin"] ou ["super_admin"]
  redirectTo: string         // ex: "/login-admin"
  children: React.ReactNode
}

export function RequireRole({ allowedRoles, redirectTo, children }: RequireRoleProps) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const user = getUserSession() as User | null

    if (!user) {
      router.replace(redirectTo)
      return
    }

    if (!allowedRoles.includes(user.role)) {
      // Si connecté mais pas le bon rôle → on peut aussi le déconnecter ou le renvoyer à l'accueil
      router.replace(redirectTo)
      return
    }

    setAuthorized(true)
    setChecked(true)
  }, [router, allowedRoles, redirectTo])

  if (!checked) return null

  if (!authorized) return null

  return <>{children}</>
}
