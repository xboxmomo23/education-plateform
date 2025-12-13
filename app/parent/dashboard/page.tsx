"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { useParentChild } from "@/components/parent/ParentChildContext"
import { parentDashboardApi, type ParentDashboardData } from "@/lib/api/parent-dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle, BookOpen, ChevronRight } from "lucide-react"
import { RecentGradesWidget } from "@/components/dashboard/RecentGrades"
import { HomeworkList } from "@/components/dashboard/HomeworkSummary"
import { UpcomingLessons } from "@/components/dashboard/UpcomingLessons"
import { AttendanceStats } from "@/lib/api/attendance"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"
import { PageLoader } from "@/components/ui/page-loader"

export default function ParentDashboardPage() {
  const { fullName } = useAuth()
  const { selectedChild, parentChildren } = useParentChild()
  const { settings } = useEstablishmentSettings()
  const child = selectedChild ?? null
  const studentId = child?.id ?? null

  const [dashboard, setDashboard] = useState<ParentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!studentId) {
      setDashboard(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    parentDashboardApi
      .getDashboard(studentId, controller.signal)
      .then((response) => {
        if (response.success) {
          setDashboard(response.data)
        } else {
          setError(response.error || "Impossible de charger le tableau de bord")
        }
      })
      .catch((err: any) => {
        if (err.name === "AbortError") return
        setError(err.message || "Impossible de charger le tableau de bord")
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [studentId, refreshKey])

  const handleRefresh = () => setRefreshKey((key) => key + 1)

  if (!parentChildren || parentChildren.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold">Tableau de bord parent</h2>
          <p className="text-muted-foreground">
            Bienvenue {fullName ?? "parent"}.
            {settings?.schoolYear && ` Année scolaire ${settings.schoolYear}.`}
          </p>
        </div>
        <Alert>
          <AlertTitle>Enfant introuvable</AlertTitle>
          <AlertDescription>
            Aucun enfant n&apos;est associé à ce compte.
            {settings?.contactEmail
              ? ` Contactez ${settings.contactEmail} si vous pensez qu'il s'agit d'une erreur.`
              : " Contactez l'administration si vous pensez qu'il s'agit d'une erreur."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const attendance = dashboard?.attendance_stats

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">
            {settings?.displayName ? `Espace parent · ${settings.displayName}` : "Espace parent"}
          </h2>
          <p className="text-muted-foreground">
            Bonjour {fullName ?? "parent"} — suivi de {child?.full_name ?? "votre enfant"}.
            {settings?.schoolYear && ` Année scolaire ${settings.schoolYear}.`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button size="sm" onClick={handleRefresh}>
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <PageLoader label="Chargement des dernières informations..." />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Enfant suivi</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xl font-semibold">{dashboard?.student.full_name ?? child?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  Numéro d&apos;élève : {dashboard?.student.student_number || child?.student_number || "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Classe : {dashboard?.student.class_label || child?.class_name || "non renseignée"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <QuickLinkButton href="/parent/notes" label="Notes" />
                <QuickLinkButton href="/parent/devoirs" label="Devoirs" />
                <QuickLinkButton href="/parent/emploi-du-temps" label="Emploi du temps" />
                <QuickLinkButton href="/parent/absences" label="Assiduité" />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle>Statistiques assiduité</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance ? (
                  <AttendanceStatsGrid stats={attendance} />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
                    <BookOpen className="h-8 w-8 opacity-60" />
                    <span>Données d&apos;assiduité indisponibles.</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Dernières notes</CardTitle>
                  <Link
                    href="/parent/notes"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Voir toutes les notes
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <RecentGradesWidget grades={dashboard?.recent_grades ?? []} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <HomeworkList
              homework={dashboard?.upcoming_homework ?? []}
              title="Devoirs à venir"
              emptyMessage="Aucun devoir à venir pour cet enfant."
              viewAllLink="/parent/devoirs"
              role="student"
              showClass={false}
            />
            <UpcomingLessons
              lessons={dashboard?.next_sessions ?? []}
              title="Prochaines séances"
              emptyMessage="Aucune séance planifiée dans les prochains jours."
              viewAllLink="/parent/emploi-du-temps"
              role="student"
            />
          </div>
        </>
      )}
    </div>
  )
}

function QuickLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <Button variant="outline" size="sm">
        {label}
      </Button>
    </Link>
  )
}

function AttendanceStatsGrid({ stats }: { stats: AttendanceStats }) {
  const items = [
    { label: "Présences", value: stats.present, color: "text-emerald-600" },
    { label: "Absences", value: stats.absent, color: "text-red-600" },
    { label: "Retards", value: stats.late, color: "text-amber-600" },
    { label: "Excusés", value: stats.excused, color: "text-blue-600" },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p className={`text-2xl font-semibold ${item.color}`}>{item.value}</p>
        </div>
      ))}
      <div className="sm:col-span-2 rounded-lg border bg-muted/40 p-3">
        <p className="text-sm text-muted-foreground">Taux de présence</p>
        <p className="text-2xl font-semibold">{stats.rate ?? 0}%</p>
      </div>
    </div>
  )
}
