"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { getUserSession, clearUserSession, type User, type UserRole } from "@/lib/auth-new"
import { messagesApi } from "@/lib/api/messages"
import {
  BookOpen,
  Users,
  Settings,
  BarChart,
  FileText,
  Calendar,
  LogOut,
  GraduationCap,
  UserCircle,
  Shield,
  ClipboardCheck,
  UserCog,
  AlertCircle,
  Layers,
  Mail,
  Menu,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/components/providers/i18n-provider"
import { LanguageSelector } from "@/components/language-selector"


interface DashboardLayoutProps {
  children: React.ReactNode
  requiredRole: UserRole
}

type DashboardRole = "student" | "teacher" | "staff" | "admin"

type MenuDefinition = {
  icon: LucideIcon
  labelKey: string
  href: string
  withBadge?: boolean
}

const dashboardMenu: Record<DashboardRole, MenuDefinition[]> = {
  student: [
    { icon: BookOpen, labelKey: "navigation.dashboard", href: "/dashboard-eleve" },
    { icon: FileText, labelKey: "navigation.assignments", href: "/eleve/devoirs" },
    { icon: Calendar, labelKey: "navigation.schedule", href: "/eleve/emplois-du-temps" },
    { icon: ClipboardCheck, labelKey: "navigation.attendance", href: "/eleve/assiduite" },
    { icon: BarChart, labelKey: "navigation.grades", href: "/eleve/notes" },
    { icon: Mail, labelKey: "navigation.messages", href: "/eleve/messages", withBadge: true },
  ],
  teacher: [
    { icon: BookOpen, labelKey: "navigation.dashboard", href: "/dashboard-professeur" },
    { icon: ClipboardCheck, labelKey: "navigation.presence", href: "/professeur/presence" },
    { icon: BarChart, labelKey: "navigation.grades", href: "/professeur/notes" },
    { icon: FileText, labelKey: "navigation.assignments", href: "/professeur/devoirs" },
    { icon: Calendar, labelKey: "navigation.schedule", href: "/professeur/emplois-du-temps" },
    { icon: Mail, labelKey: "navigation.messages", href: "/professeur/messages", withBadge: true },
    { icon: BookOpen, labelKey: "navigation.classes", href: "/professeur/classes" },
  ],
  staff: [
    { icon: BookOpen, labelKey: "navigation.dashboard", href: "/dashboard-staff" },
    { icon: AlertCircle, labelKey: "navigation.absences", href: "/staff/absences" },
    { icon: Calendar, labelKey: "navigation.schedule", href: "/staff/emplois-du-temps" },
    { icon: Layers, labelKey: "navigation.courses", href: "/staff/cours" },
    { icon: BarChart, labelKey: "navigation.grades", href: "/staff/notes" },
    { icon: Mail, labelKey: "navigation.messages", href: "/staff/messages", withBadge: true },
    { icon: Users, labelKey: "navigation.bulletins", href: "/staff/bulletins" },
    { icon: Users, labelKey: "navigation.periods", href: "/staff/periodes" },
  ],
  admin: [
    { icon: BookOpen, labelKey: "navigation.dashboard", href: "/admin" },
    { icon: BarChart, labelKey: "navigation.performance", href: "/admin/performance" },
    { icon: Users, labelKey: "navigation.users", href: "#" },
    { icon: GraduationCap, labelKey: "navigation.teachers", href: "#" },
    { icon: BookOpen, labelKey: "navigation.courses", href: "#" },
    { icon: Mail, labelKey: "navigation.messages", href: "/admin/messages", withBadge: true },
    { icon: BarChart, labelKey: "navigation.statistics", href: "#" },
    { icon: Settings, labelKey: "navigation.settings", href: "#" },
  ],
}

export function DashboardLayout({ children, requiredRole }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useI18n()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)  // ✨ NOUVEAU: compteur messages non lus
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const currentUser = getUserSession()

    if (!currentUser) {
      const loginPath =
        requiredRole === "student"
          ? "eleve"
          : requiredRole === "teacher"
            ? "professeur"
            : requiredRole === "staff"
              ? "staff"
              : "admin"
      router.push(`/login-${loginPath}`)
      return
    }

    if (currentUser.role !== requiredRole) {
      const loginPath =
        requiredRole === "student"
          ? "eleve"
          : requiredRole === "teacher"
            ? "professeur"
            : requiredRole === "staff"
              ? "staff"
              : "admin"
      router.push(`/login-${loginPath}`)
      return
    }

    setUser(currentUser)
    setIsLoading(false)
  }, [router, requiredRole])

  // ✨ NOUVEAU: Récupérer le nombre de messages non lus
  useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      try {
        const res = await messagesApi.getUnreadCount()
        if (res.success) {
          setUnreadCount(res.data.count)
        }
      } catch (e) {
        console.error("Erreur récupération unreadCount messages:", e)
      }
    }

    // Fetch initial
    fetchUnreadCount()

    // Refresh périodique (toutes les 60 secondes)
    const interval = setInterval(fetchUnreadCount, 60000)

    return () => clearInterval(interval)
  }, [user])

  const handleLogout = () => {
    clearUserSession()
    const loginPath =
      requiredRole === "student"
        ? "eleve"
        : requiredRole === "teacher"
          ? "professeur"
          : requiredRole === "staff"
            ? "staff"
            : "admin"
    router.push(`/login-${loginPath}`)
  }

  const menuItems = useMemo(() => {
    const roleKey = (["student", "teacher", "staff", "admin"] as DashboardRole[]).includes(
      requiredRole as DashboardRole
    )
      ? (requiredRole as DashboardRole)
      : "student"
    return dashboardMenu[roleKey].map((item) => ({
      ...item,
      label: t(item.labelKey),
      badge: item.withBadge && unreadCount > 0 ? unreadCount : undefined,
    }))
  }, [requiredRole, t, unreadCount])

  const getRoleIcon = () => {
    switch (requiredRole) {
      case "student":
        return <UserCircle className="h-5 w-5" />
      case "teacher":
        return <GraduationCap className="h-5 w-5" />
      case "staff":
        return <UserCog className="h-5 w-5" />
      case "admin":
        return <Shield className="h-5 w-5" />
    }
  }

  const getRoleLabel = () => {
    switch (requiredRole) {
      case "student":
        return t("roles.student")
      case "teacher":
        return t("roles.teacher")
      case "staff":
        return t("roles.staff")
      case "admin":
        return t("roles.admin")
    }
  }

  const isStudent = requiredRole === "student"
  const isTeacher = requiredRole === "teacher"
  const isStaff = requiredRole === "staff"
  const showTopLanguageBar = isStudent || isTeacher || isStaff
  const isResponsiveRole = isStudent || isTeacher

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b p-6 shrink-0">
        <div className="flex items-center gap-2">
          {getRoleIcon()}
          <h1 className="text-lg font-semibold">{getRoleLabel()}</h1>
        </div>
        {requiredRole === "admin" && <LanguageSelector compact />}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => onNavigate?.()}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge
                  variant="destructive"
                  className={`ml-auto h-5 min-w-[20px] px-1.5 text-xs ${
                    isActive ? "bg-white text-primary" : ""
                  }`}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {user && (
        <div className="mt-auto border-t p-4 shrink-0">
          <div className="mb-3 rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{user.full_name || user.email}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" className="w-full bg-transparent" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t("common.actions.logout")}
          </Button>
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>{t("common.states.loading")}</p>
      </div>
    )
  }

  if (!isResponsiveRole) {
    return (
      <div className="flex h-screen bg-background">
        <aside className="w-64 border-r bg-card">
          <SidebarContent />
        </aside>
        <main className="flex-1 overflow-auto">
          {showTopLanguageBar && (
            <div className="hidden border-b bg-background md:flex">
              <div className="container flex justify-end py-3">
                <LanguageSelector compact />
              </div>
            </div>
          )}
          <div className="container py-8">{children}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="hidden w-64 border-r bg-card md:block md:flex-shrink-0 md:h-screen md:min-h-screen md:max-h-screen">
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 md:hidden">
          <div className="flex flex-1 items-center gap-3">
            {getRoleIcon()}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{getRoleLabel()}</p>
              <p className="truncate text-sm font-semibold">
                {user?.full_name || user?.email || getRoleLabel()}
              </p>
            </div>
          </div>
          <LanguageSelector compact />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex">
              <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto">
          {showTopLanguageBar && (
            <div className="hidden border-b bg-background md:flex">
              <div className="container flex justify-end py-3">
                <LanguageSelector compact />
              </div>
            </div>
          )}
          <div className="container py-6 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
