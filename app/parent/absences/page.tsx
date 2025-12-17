"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { parentAttendanceApi } from "@/lib/api/parent-attendance"
import { type AttendanceHistoryItem, type AttendanceStats } from "@/lib/api/attendance"
import {
  AlertCircle,
  Calendar,
  Clock,
  Info,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { useParentChild } from "@/components/parent/ParentChildContext"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"
import { useI18n } from "@/components/providers/i18n-provider"

export default function ParentAbsencesPage() {
  const { selectedChild } = useParentChild()
  const { settings } = useEstablishmentSettings()
  const child = selectedChild ?? null
  const studentId = child?.id ?? null
  const { t, locale } = useI18n()

  const [history, setHistory] = useState<AttendanceHistoryItem[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (targetStudentId: string, signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError(null)
      const currentYear = getCurrentSchoolYear()
      const response = await parentAttendanceApi.getHistory(
        targetStudentId,
        {
          startDate: currentYear.start,
          endDate: currentYear.end,
          limit: 100,
        },
        signal
      )

      if (response.success) {
        setHistory(response.data.history)
        setStats(response.data.stats)
      } else {
        setError(response.error || t("parent.attendance.errors.load"))
      }
    } catch (err: any) {
      if (err.name === "AbortError") return
      console.error("Erreur chargement assiduité parent:", err)
      setError(err.message || t("parent.attendance.errors.generic"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    loadData(studentId, controller.signal)
    return () => controller.abort()
  }, [studentId, loadData])

  const absencesAndLates = useMemo(
    () => history.filter((h) => h.status === "absent" || h.status === "late" || h.status === "excused"),
    [history]
  )

  if (!child || !studentId) {
    const contactInfo = settings?.contactEmail
      ? t("parent.attendance.noChild.contactEmail", { email: settings.contactEmail })
      : t("parent.attendance.noChild.contactDefault")
    return (
      <div className="min-h-[60vh] bg-gray-50">
        <div className="mx-auto max-w-2xl p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t("parent.attendance.title")}</h1>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("parent.attendance.noChild.description", { contact: contactInfo })}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t("parent.attendance.states.loading")}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => studentId && loadData(studentId)}>{t("common.actions.retry")}</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("parent.attendance.childTitle", { child: child.full_name })}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("parent.attendance.subtitle", {
              year: getCurrentSchoolYearLabel(),
              className: child.class_name || t("parent.attendance.classFallback"),
            })}
          </p>
        </div>

        {stats && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-8">
                <AttendanceDonut stats={stats} centerLabel={t("parent.attendance.donut.label")} />
                <div className="space-y-3">
                  <LegendItem color="bg-green-500" label={t("parent.attendance.legend.present")} value={stats.present} />
                  <LegendItem color="bg-red-500" label={t("parent.attendance.legend.absent")} value={stats.absent} />
                  <LegendItem color="bg-orange-500" label={t("parent.attendance.legend.late")} value={stats.late} />
                  <LegendItem color="bg-blue-500" label={t("parent.attendance.legend.excused")} value={stats.excused} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("parent.attendance.list.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {absencesAndLates.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-gray-600 font-medium">{t("parent.attendance.list.emptyTitle")}</p>
                <p className="text-sm text-gray-400 mt-1">{t("parent.attendance.list.emptySubtitle")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {absencesAndLates.map((item) => (
                  <AbsenceItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700">
            {t("parent.attendance.info")}
          </p>
        </div>
      </div>
    </div>
  )
}

function AttendanceDonut({ stats, centerLabel }: { stats: AttendanceStats; centerLabel: string }) {
  const total = stats.total || 1
  const presentPercent = (stats.present / total) * 100
  const absentPercent = (stats.absent / total) * 100
  const latePercent = (stats.late / total) * 100
  const excusedPercent = (stats.excused / total) * 100

  const radius = 60
  const circumference = 2 * Math.PI * radius

  const presentOffset = 0
  const absentOffset = (presentPercent / 100) * circumference
  const lateOffset = ((presentPercent + absentPercent) / 100) * circumference
  const excusedOffset = ((presentPercent + absentPercent + latePercent) / 100) * circumference

  const rate = stats.rate || 0

  return (
    <div className="relative flex items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={radius} stroke="#e5e7eb" strokeWidth="18" fill="none" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#22c55e"
          strokeWidth="18"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (presentPercent / 100) * circumference}
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#ef4444"
          strokeWidth="18"
          fill="none"
          strokeDasharray={(absentPercent / 100) * circumference}
          strokeDashoffset={circumference - absentOffset}
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#f97316"
          strokeWidth="18"
          fill="none"
          strokeDasharray={(latePercent / 100) * circumference}
          strokeDashoffset={circumference - lateOffset}
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#3b82f6"
          strokeWidth="18"
          fill="none"
          strokeDasharray={(excusedPercent / 100) * circumference}
          strokeDashoffset={circumference - excusedOffset}
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-3xl font-bold text-gray-900">{rate}%</p>
        <p className="text-sm text-gray-500">{centerLabel}</p>
      </div>
    </div>
  )
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  const { t } = useI18n()
  const plural = value > 1 ? "s" : ""
  return (
    <div className="flex items-center gap-3">
      <span className={cn("h-3 w-3 rounded-full", color)} />
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">
          {t("parent.attendance.legend.sessions", { count: value, plural })}
        </p>
      </div>
    </div>
  )
}

function AbsenceItem({ item }: { item: AttendanceHistoryItem }) {
  const { t, locale } = useI18n()
  const date = new Date(item.session_date)
  const dateFormatter = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const config = getStatusConfig(item.status, t)
  const isJustified = item.status === "excused"

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-gray-900 capitalize">{item.subject_name}</p>
        <p className="text-xs text-gray-500">{dateFormatter.format(date)}</p>

        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {item.class_label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {item.status === "late" && item.late_minutes && (
          <span className="text-xs text-orange-600 font-medium">
            {t("parent.attendance.status.lateMinutes", { minutes: item.late_minutes })}
          </span>
        )}

        <Badge variant="outline" className={cn("text-xs", config.text, config.border, config.bg)}>
          {config.label}
          {isJustified && <ShieldCheck className="h-3 w-3 ml-1" />}
        </Badge>
      </div>
    </div>
  )
}

function getCurrentSchoolYear(): { start: string; end: string } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const startYear = currentMonth >= 8 ? currentYear : currentYear - 1
  const endYear = startYear + 1

  return {
    start: `${startYear}-09-01`,
    end: `${endYear}-07-31`,
  }
}

function getCurrentSchoolYearLabel(): string {
  const { start } = getCurrentSchoolYear()
  const startYear = parseInt(start.slice(0, 4))
  return `${startYear}-${startYear + 1}`
}

type StatusConfig = {
  label: string
  text: string
  border: string
  bg: string
}

function getStatusConfig(
  status: AttendanceHistoryItem["status"],
  t: (key: string, params?: Record<string, any>) => string
): StatusConfig {
  switch (status) {
    case "absent":
      return {
        label: t("parent.attendance.status.absent"),
        text: "text-red-600",
        border: "border-red-200",
        bg: "bg-red-50",
      }
    case "late":
      return {
        label: t("parent.attendance.status.late"),
        text: "text-orange-600",
        border: "border-orange-200",
        bg: "bg-orange-50",
      }
    case "excused":
      return {
        label: t("parent.attendance.status.excused"),
        text: "text-blue-600",
        border: "border-blue-200",
        bg: "bg-blue-50",
      }
    default:
      return {
        label: t("parent.attendance.status.present"),
        text: "text-green-600",
        border: "border-green-200",
        bg: "bg-green-50",
      }
  }
}
