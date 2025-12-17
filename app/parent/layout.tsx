"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ParentChildSelector } from "@/components/parent-child-selector"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { ParentChildProvider, useParentChild } from "@/components/parent/ParentChildContext"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"
import { LanguageSelector } from "@/components/language-selector"
import { useI18n } from "@/components/providers/i18n-provider"

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userRole, fullName } = useAuth()
  const { t } = useI18n()

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

  const isAuthorized = Boolean(user && userRole === "parent")

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
        <div className="text-center text-muted-foreground">
          {t("parent.redirect")}
        </div>
      </div>
    )
  }

  return (
    <ParentChildProvider>
      <ParentLayoutContent fullName={fullName} pathname={pathname}>
        {children}
      </ParentLayoutContent>
    </ParentChildProvider>
  )
}

function ParentLayoutContent({
  fullName,
  pathname,
  children,
}: {
  fullName?: string | null
  pathname: string
  children: React.ReactNode
}) {
  const { accountDisabled } = useParentChild()
  const { settings } = useEstablishmentSettings()
  const { t } = useI18n()
  const navItems = useMemo(
    () => [
      { href: "/parent/dashboard", label: t("navigation.dashboard") },
      { href: "/parent/notes", label: t("navigation.grades") },
      { href: "/parent/devoirs", label: t("navigation.assignments") },
      { href: "/parent/absences", label: t("navigation.absences") },
      { href: "/parent/emploi-du-temps", label: t("navigation.schedule") },
      { href: "/parent/contact", label: t("navigation.contact") },
    ],
    [t]
  )
  const contactMessage = settings?.contactEmail
    ? t("parent.accountDisabledContactEmail", { email: settings.contactEmail })
    : t("parent.accountDisabledContact")

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase text-muted-foreground">
                {settings?.displayName ?? t("parent.spaceLabel")}
              </p>
              <h1 className="text-2xl font-semibold">{fullName ?? t("parent.defaultName")}</h1>
              {settings?.schoolYear && (
                <p className="text-xs text-muted-foreground">
                  {t("parent.schoolYear")} {settings.schoolYear}
                </p>
              )}
            </div>
            <LanguageSelector compact />
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          {accountDisabled && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              <p>{t("parent.accountDisabled")}</p>
              <p>{contactMessage}</p>
            </div>
          )}
          <ParentChildSelector />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
