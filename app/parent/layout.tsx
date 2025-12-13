"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ParentChildSelector } from "@/components/parent-child-selector"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import type { ParentChildSummary } from "@/lib/auth-new"

const navItems = [
  { href: "/parent/dashboard", label: "Tableau de bord" },
  { href: "/parent/notes", label: "Notes" },
  { href: "/parent/devoirs", label: "Devoirs" },
  { href: "/parent/absences", label: "Absences" },
  { href: "/parent/emploi-du-temps", label: "Emploi du temps" },
  { href: "/parent/contact", label: "Contact" },
]

type ParentChildSelectionContextValue = {
  selectedChildId?: string
  selectedChild?: ParentChildSummary
  setSelectedChildId: (childId?: string) => void
}

const ParentChildSelectionContext = createContext<ParentChildSelectionContextValue | undefined>(undefined)

export function useParentChildSelection(): ParentChildSelectionContextValue {
  const ctx = useContext(ParentChildSelectionContext)
  if (!ctx) {
    throw new Error("useParentChildSelection must be used within ParentLayout")
  }
  return ctx
}

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userRole, fullName, parentChildren } = useAuth()
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!user) {
      const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null
      if (!storedUser) {
        router.replace("/login-parent")
      }
      return
    }

    if (userRole !== "parent") {
      router.replace("/login-parent")
    }
  }, [user, userRole, router])

  useEffect(() => {
    if (parentChildren && parentChildren.length > 0) {
      setSelectedChildId((current) => current ?? parentChildren[0].id)
    } else {
      setSelectedChildId(undefined)
    }
  }, [parentChildren])

  const selectedChild = useMemo(() => {
    if (!parentChildren || parentChildren.length === 0) return undefined
    return parentChildren.find((child) => child.id === selectedChildId) ?? parentChildren[0]
  }, [parentChildren, selectedChildId])

  const contextValue = useMemo<ParentChildSelectionContextValue>(
    () => ({
      selectedChildId,
      selectedChild,
      setSelectedChildId,
    }),
    [selectedChildId, selectedChild]
  )

  const isAuthorized = Boolean(user && userRole === "parent")

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
        <div className="text-center text-muted-foreground">
          Redirection vers la page de connexion parent...
        </div>
      </div>
    )
  }

  return (
    <ParentChildSelectionContext.Provider value={contextValue}>
      <div className="min-h-screen bg-muted/20">
        <header className="border-b bg-background">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase text-muted-foreground">Espace parent</p>
                <h1 className="text-2xl font-semibold">{fullName ?? "Parent"}</h1>
              </div>
              <nav className="flex flex-wrap gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <ParentChildSelector selectedChildId={selectedChildId} onChildChange={setSelectedChildId} />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </ParentChildSelectionContext.Provider>
  )
}
