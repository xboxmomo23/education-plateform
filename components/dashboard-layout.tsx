"use client"

import type React from "react"
import { useEffect, useState } from "react"
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
import Link from "next/link"


interface DashboardLayoutProps {
  children: React.ReactNode
  requiredRole: UserRole
}

export function DashboardLayout({ children, requiredRole }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
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

  // ✨ MODIFIÉ: getMenuItems avec Messages et badge
  const getMenuItems = () => {
    switch (requiredRole) {
      case "student":
        return [
          { icon: BookOpen, label: "Tableau de bord", href: "/dashboard-eleve" },
          { icon: FileText, label: "Devoirs", href: "/eleve/devoirs" },
          { icon: Calendar, label: "Emploi du temps", href: "/eleve/emplois-du-temps" },
          { icon: ClipboardCheck, label: "Assiduité", href: "/eleve/assiduite" },
          { icon: BarChart, label: "Notes", href: "/eleve/notes" },
          { icon: Mail, label: "Messages", href: "/eleve/messages", badge: unreadCount > 0 ? unreadCount : undefined },  // ✨ NOUVEAU
        ]
      case "teacher":
        return [
          { icon: BookOpen, label: "Tableau de bord", href: "/dashboard-professeur" },
          { icon: ClipboardCheck, label: "Présence", href: "/professeur/presence" },
          { icon: BarChart, label: "Notes", href: "/professeur/notes" },
          { icon: FileText, label: "Devoirs", href: "/professeur/devoirs" },
          { icon: Calendar, label: "Emploi du temps", href: "/professeur/emplois-du-temps" },
          { icon: Mail, label: "Messages", href: "/professeur/messages", badge: unreadCount > 0 ? unreadCount : undefined },  // ✨ NOUVEAU
          { icon: BookOpen, label: "Mes classes", href: "#" },
          { icon: Users, label: "Élèves", href: "#" },
        ]
      case "staff":
        return [
          { icon: BookOpen, label: "Tableau de bord", href: "/dashboard-staff" },
          { icon: AlertCircle, label: "Absences", href: "/staff/absences" },
          { icon: Calendar, label: "Emplois du temps", href: "/staff/emplois-du-temps" },
          { icon: Layers, label: "Cours", href: "/staff/cours" },
          { icon: BarChart, label: "Notes", href: "/staff/notes" },
          { icon: Mail, label: "Messages", href: "/staff/messages", badge: unreadCount > 0 ? unreadCount : undefined },  // ✨ NOUVEAU
          { icon: Users, label: "Bulletins", href: "/staff/bulletins" },
          { icon: Users, label: "Periodes", href: "/staff/periodes" },
          { icon: Settings, label: "Paramètres", href: "/staff/parametres" },
        ]
      case "admin":
        return [
          { icon: BookOpen, label: "Tableau de bord", href: "/dashboard-admin" },
          { icon: Users, label: "Utilisateurs", href: "#" },
          { icon: GraduationCap, label: "Professeurs", href: "#" },
          { icon: BookOpen, label: "Cours", href: "#" },
          { icon: Mail, label: "Messages", href: "/admin/messages", badge: unreadCount > 0 ? unreadCount : undefined },  // ✨ NOUVEAU
          { icon: BarChart, label: "Statistiques", href: "#" },
          { icon: Settings, label: "Paramètres", href: "#" },
        ]
    }
  }

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
        return "Espace Élève"
      case "teacher":
        return "Espace Professeur"
      case "staff":
        return "Espace staff"
      case "admin":
        return "Espace Administrateur"
    }
  }

  const menuItems = getMenuItems()
  const isResponsiveRole = requiredRole === "student" || requiredRole === "teacher"

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-6">
        {getRoleIcon()}
        <h1 className="text-lg font-semibold">{getRoleLabel()}</h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
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
        <div className="border-t p-4">
          <div className="mb-3 rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{user.full_name || user.email}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" className="w-full bg-transparent" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Chargement...</p>
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
          <div className="container py-8">{children}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="hidden w-64 border-r bg-card md:block md:flex-shrink-0">
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 md:hidden">
          <div className="flex flex-1 items-center gap-3">
            {getRoleIcon()}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{getRoleLabel()}</p>
              <p className="truncate text-sm font-semibold">
                {user?.full_name || user?.email || "Mon espace"}
              </p>
            </div>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container py-6 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
