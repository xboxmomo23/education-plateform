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
import { useI18n } from "@/components/providers/i18n-provider"

export default function ParentDashboardPage() {
  const { fullName } = useAuth()
  const { selectedChild, parentChildren } = useParentChild()
  const { settings } = useEstablishmentSettings()
  const { t } = useI18n()
  const child = selectedChild ?? null
  const studentId = child?.id ?? null

  const [dashboard, setDashboard] = useState<ParentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const schoolYearText = settings?.schoolYear ? t("parent.dashboard.common.schoolYear", { year: settings.schoolYear }) : ""
  const parentName = fullName ?? t("parent.defaultName")
  const childName = child?.full_name ?? t("parent.dashboard.childFallback")

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
          setError(response.error || t("parent.dashboard.errors.load"))
        }
      })
      .catch((err: any) => {
        if (err.name === "AbortError") return
        setError(err.message || t("parent.dashboard.errors.load"))
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [studentId, refreshKey])

  const handleRefresh = () => setRefreshKey((key) => key + 1)

  if (!parentChildren || parentChildren.length === 0) {
    const contactInfo = settings?.contactEmail
      ? t("parent.dashboard.noChild.contactEmail", { email: settings.contactEmail })
      : t("parent.dashboard.noChild.contactDefault")
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold">{t("parent.dashboard.noChild.title")}</h2>
          <p className="text-muted-foreground">
            {t("parent.dashboard.noChild.subtitle", {
              name: parentName,
              schoolYear: schoolYearText,
            })}
          </p>
        </div>
        <Alert>
          <AlertTitle>{t("parent.dashboard.noChild.alertTitle")}</AlertTitle>
          <AlertDescription>
            {t("parent.dashboard.noChild.alertDescription", { contact: contactInfo })}
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
            {settings?.displayName
              ? t("parent.dashboard.header.withSchool", { school: settings.displayName })
              : t("parent.dashboard.header.default")}
          </h2>
          <p className="text-muted-foreground">
            {t("parent.dashboard.header.subtitle", {
              name: parentName,
              child: childName,
            })}
            {schoolYearText ? ` ${schoolYearText}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("common.actions.refresh")}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>{t("parent.dashboard.errors.title")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button size="sm" onClick={handleRefresh}>
              {t("common.actions.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <PageLoader label={t("parent.dashboard.loader")} />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("parent.dashboard.studentCard.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xl font-semibold">{dashboard?.student.full_name ?? child?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {t("parent.dashboard.studentCard.studentNumber", {
                    value: dashboard?.student.student_number || child?.student_number || "—",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("parent.dashboard.studentCard.classLabel", {
                    value: dashboard?.student.class_label || child?.class_name || t("parent.dashboard.studentCard.classFallback"),
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <QuickLinkButton href="/parent/notes" label={t("parent.dashboard.quickLinks.notes")} />
                <QuickLinkButton href="/parent/devoirs" label={t("parent.dashboard.quickLinks.assignments")} />
                <QuickLinkButton href="/parent/emploi-du-temps" label={t("parent.dashboard.quickLinks.timetable")} />
                <QuickLinkButton href="/parent/absences" label={t("parent.dashboard.quickLinks.attendance")} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle>{t("parent.dashboard.attendanceStats.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance ? (
                  <AttendanceStatsGrid stats={attendance} />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
                    <BookOpen className="h-8 w-8 opacity-60" />
                    <span>{t("parent.dashboard.attendanceStats.empty")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>{t("parent.dashboard.grades.title")}</CardTitle>
                  <Link
                    href="/parent/notes"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {t("parent.dashboard.grades.viewAll")}
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
              title={t("parent.dashboard.homework.title")}
              emptyMessage={t("parent.dashboard.homework.empty")}
              viewAllLink="/parent/devoirs"
              role="student"
              showClass={false}
            />
            <UpcomingLessons
              lessons={dashboard?.next_sessions ?? []}
              title={t("parent.dashboard.lessons.title")}
              emptyMessage={t("parent.dashboard.lessons.empty")}
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
  const { t } = useI18n()
  const items = [
    { label: t("parent.dashboard.attendanceStats.present"), value: stats.present, color: "text-emerald-600" },
    { label: t("parent.dashboard.attendanceStats.absent"), value: stats.absent, color: "text-red-600" },
    { label: t("parent.dashboard.attendanceStats.late"), value: stats.late, color: "text-amber-600" },
    { label: t("parent.dashboard.attendanceStats.excused"), value: stats.excused, color: "text-blue-600" },
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
        <p className="text-sm text-muted-foreground">{t("parent.dashboard.attendanceStats.rate")}</p>
        <p className="text-2xl font-semibold">{stats.rate ?? 0}%</p>
      </div>
    </div>
  )
}
