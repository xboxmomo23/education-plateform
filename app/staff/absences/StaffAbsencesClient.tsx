"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { cn } from "@/lib/utils"
import {
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Download,
  ChevronDown,
  Loader2,
  Eye,
  FileText,
  RotateCcw,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ListSkeleton } from "@/components/ui/list-skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { notify } from "@/lib/toast"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  attendanceApi,
  type AbsenceRecord,
  type ClassOption,
  type AttendanceStatus,
  getStatusColor,
  getStatusLabel,
} from "@/lib/api/attendance"
import { staffAbsencesApi, type StaffAbsenceHistoryItem } from "@/lib/api/staff-absences"

type StaffAbsenceRecord = AbsenceRecord & { teacher_name?: string | null }

const DEFAULT_LIMIT = 50

function deriveSchoolYear(date: string) {
  const current = new Date(date)
  const year = current.getFullYear()
  const month = current.getMonth() + 1
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function buildDownloadFilename(prefix: string, extension: "csv" | "pdf") {
  const today = new Date().toISOString().split("T")[0]
  return `${prefix}_${today}.${extension}`
}

export function StaffAbsencesClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { settings } = useEstablishmentSettings()

  const currentFilters = useMemo(() => {
    const get = (key: string, defaultValue: string = "") =>
      searchParams.get(key) ?? defaultValue

    return {
      q: get("q"),
      classId: get("classId", "all"),
      status: get("status", "all"),
      justified: get("justified", "all"),
      from: get("from"),
      to: get("to"),
      sort: get("sort", "date_desc"),
      page: Math.max(1, parseInt(get("page", "1"), 10) || 1),
    }
  }, [searchParams])

  const [searchInput, setSearchInput] = useState(currentFilters.q)
  const [absences, setAbsences] = useState<StaffAbsenceRecord[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 1,
  })
  const [selectedAbsence, setSelectedAbsence] = useState<StaffAbsenceRecord | null>(null)
  const [justifyModalOpen, setJustifyModalOpen] = useState(false)
  const [justifying, setJustifying] = useState(false)
  const [changeStatusModalOpen, setChangeStatusModalOpen] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null)

  useEffect(() => {
    setSearchInput(currentFilters.q)
  }, [currentFilters.q])

  const historyParams = useMemo(() => {
    return {
      q: currentFilters.q || undefined,
      classId: currentFilters.classId === "all" ? undefined : currentFilters.classId,
      status: currentFilters.status,
      justified: currentFilters.justified,
      from: currentFilters.from || undefined,
      to: currentFilters.to || undefined,
      sort: currentFilters.sort,
      page: currentFilters.page,
      limit: DEFAULT_LIMIT,
    }
  }, [currentFilters])

  const applySearch = () => {
    const value = searchInput.trim()
    setQueryParam("q", value || undefined)
  }

  const setQueryParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === "" || value === "all" || (key === "sort" && value === "date_desc")) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    if (key !== "page") {
      params.delete("page")
    }

    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  const resetFilters = () => {
    router.replace(pathname, { scroll: false })
  }

  const fetchClasses = useCallback(async () => {
    try {
      const response = await attendanceApi.getAccessibleClasses()
      if (response.success) {
        setClasses(response.data)
      }
    } catch (error) {
      console.error("Erreur chargement classes:", error)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const mapToRecord = (item: StaffAbsenceHistoryItem): StaffAbsenceRecord => ({
    id: item.id,
    student_id: item.student_id,
    student_name: item.student_name,
    student_number: item.student_number,
    class_id: item.class_id,
    class_label: item.class_label,
    subject_name: item.subject_name,
    subject_color: item.subject_color || "#0ea5e9",
    session_date: item.session_date,
    start_time: item.start_time,
    end_time: item.end_time,
    status: item.status,
    late_minutes: item.late_minutes,
    comment: item.comment,
    justified: item.justified,
    justification: item.justification,
    justified_at: item.justified_at,
    school_year: item.school_year || deriveSchoolYear(item.session_date),
    teacher_name: item.teacher_name,
  })

  const loadAbsences = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await staffAbsencesApi.getHistory(historyParams)
      if (response.success) {
        const data = response.data
        setAbsences(data.items.map(mapToRecord))
        setPagination(data.pagination)
      }
    } catch (err: any) {
      console.error("Erreur chargement absences:", err)
      setError(err.message || "Impossible de charger les absences")
      notify.error("Impossible de charger les absences", err.message || "Merci de réessayer.")
      setAbsences([])
    } finally {
      setLoading(false)
    }
  }, [historyParams])

  useEffect(() => {
    loadAbsences()
  }, [loadAbsences])

  const stats = useMemo(() => {
    const absent = absences.filter((a) => a.status === "absent").length
    const late = absences.filter((a) => a.status === "late").length
    const excused = absences.filter((a) => a.status === "excused").length
    const notJustified = absences.filter(
      (a) => !a.justified && (a.status === "absent" || a.status === "late")
    ).length

    return {
      total: pagination.total,
      absent,
      late,
      excused,
      notJustified,
    }
  }, [absences, pagination])

  const handleJustify = async (justification: string) => {
    if (!selectedAbsence) return

    setJustifying(true)
    try {
      const response = await attendanceApi.justifyAbsence(selectedAbsence.id, justification)
      if (response.success) {
        notify.success("Absence justifiée", `${selectedAbsence.student_name} est désormais justifié(e).`)
        setJustifyModalOpen(false)
        setSelectedAbsence(null)
        await loadAbsences()
      }
    } catch (error: any) {
      console.error("Erreur justification:", error)
      notify.error("Erreur lors de la justification", error.message || "Veuillez réessayer.")
    } finally {
      setJustifying(false)
    }
  }

  const handleChangeStatus = async (newStatus: AttendanceStatus) => {
    if (!selectedAbsence) return

    setChangingStatus(true)
    try {
      const response = await attendanceApi.updateRecordStatus(selectedAbsence.id, newStatus)
      if (response.success) {
        notify.success("Statut mis à jour", "La présence a été mise à jour.")
        setChangeStatusModalOpen(false)
        setSelectedAbsence(null)
        await loadAbsences()
      }
    } catch (error: any) {
      console.error("Erreur changement statut:", error)
      notify.error("Erreur lors du changement de statut", error.message || "Veuillez réessayer.")
    } finally {
      setChangingStatus(false)
    }
  }

  const handleExport = async (type: "csv" | "pdf") => {
    try {
      setExporting(type)
      const requestParams = {
        q: currentFilters.q || undefined,
        classId: currentFilters.classId === "all" ? undefined : currentFilters.classId,
        status: currentFilters.status,
        justified: currentFilters.justified,
        from: currentFilters.from || undefined,
        to: currentFilters.to || undefined,
        sort: currentFilters.sort,
      }

      const { blob, filename } =
        type === "csv"
          ? await staffAbsencesApi.exportCsv(requestParams)
          : await staffAbsencesApi.exportPdf(requestParams)

      const link = document.createElement("a")
      const blobUrl = URL.createObjectURL(blob)
      link.href = blobUrl
      link.download = filename || buildDownloadFilename("absences", type)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)

      notify.success("Export lancé", `Le fichier ${type.toUpperCase()} a été généré.`)
    } catch (error: any) {
      console.error("Erreur export:", error)
      notify.error("Export impossible", error.message || "Veuillez réessayer plus tard.")
    } finally {
      setExporting(null)
    }
  }

  const renderContent = () => {
    if (loading) {
      return <ListSkeleton />
    }

    if (error) {
      return (
        <EmptyState
          icon={AlertCircle}
          title="Impossible de charger les absences"
          description={error}
          action={
            <Button onClick={() => loadAbsences()} variant="outline">
              Réessayer
            </Button>
          }
        />
      )
    }

    if (absences.length === 0) {
      return (
        <EmptyState
          icon={Calendar}
          title="Aucune absence trouvée"
          description="Aucun résultat ne correspond aux filtres sélectionnés."
        />
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-4">
          {absences.map((absence) => (
            <AbsenceCard
              key={absence.id}
              absence={absence}
              onView={() => {
                setSelectedAbsence(absence)
                setChangeStatusModalOpen(false)
                setJustifyModalOpen(false)
              }}
              onJustify={() => {
                setSelectedAbsence(absence)
                setJustifyModalOpen(true)
              }}
              onChangeStatus={() => {
                setSelectedAbsence(absence)
                setChangeStatusModalOpen(true)
              }}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} sur {pagination.totalPages} — {pagination.total} résultat(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQueryParam("page", String(pagination.page - 1))}
              disabled={pagination.page <= 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQueryParam("page", String(pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout requiredRole="staff">
      <div className="container mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">📋 Gestion des absences</h1>
            <p className="text-muted-foreground">
              Consultez et gérez les absences de l&apos;établissement {settings?.displayName ? `· ${settings.displayName}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={exporting === "csv" || loading}
            >
              {exporting === "csv" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="ml-2">Exporter CSV</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("pdf")}
              disabled={exporting === "pdf" || loading}
            >
              {exporting === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="ml-2">Exporter PDF</span>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un élève, une classe, une matière..."
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applySearch()
                  }}
                />
              </div>
              <Button variant="secondary" onClick={applySearch}>
                <Filter className="mr-2 h-4 w-4" />
                Appliquer
              </Button>
              <Button variant="ghost" onClick={resetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Réinitialiser
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Classe</p>
                <Select
                  defaultValue={currentFilters.classId}
                  onValueChange={(value) => setQueryParam("classId", value === "all" ? undefined : value)}
                  value={currentFilters.classId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map((classe) => (
                      <SelectItem key={classe.id} value={classe.id}>
                        {classe.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Statut</p>
                <Select
                  value={currentFilters.status}
                  onValueChange={(value) => setQueryParam("status", value === "all" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="absent">Absents</SelectItem>
                    <SelectItem value="late">Retards</SelectItem>
                    <SelectItem value="excused">Excusés</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Justification</p>
                <Select
                  value={currentFilters.justified}
                  onValueChange={(value) => setQueryParam("justified", value === "all" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="false">Non justifiées</SelectItem>
                    <SelectItem value="true">Justifiées</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tri</p>
                <Select
                  value={currentFilters.sort}
                  onValueChange={(value) => setQueryParam("sort", value === "date_desc" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tri" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Date décroissante</SelectItem>
                    <SelectItem value="date_asc">Date croissante</SelectItem>
                    <SelectItem value="student_asc">Élève (A→Z)</SelectItem>
                    <SelectItem value="class_asc">Classe (A→Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">À partir du</p>
                <Input
                  type="date"
                  value={currentFilters.from}
                  onChange={(e) => setQueryParam("from", e.target.value || undefined)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Jusqu&apos;au</p>
                <Input
                  type="date"
                  value={currentFilters.to}
                  onChange={(e) => setQueryParam("to", e.target.value || undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total résultats"
              value={stats.total}
              icon={<Users className="h-4 w-4 text-primary" />}
              helper="Tous statuts confondus"
            />
            <StatCard
              label="Absents"
              value={stats.absent}
              icon={<AlertCircle className="h-4 w-4 text-destructive" />}
              helper="Sur cette page"
            />
            <StatCard
              label="Retards"
              value={stats.late}
              icon={<Clock className="h-4 w-4 text-amber-500" />}
              helper="Sur cette page"
            />
            <StatCard
              label="Non justifiées"
              value={stats.notJustified}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
              helper="À traiter"
            />
          </CardContent>
        </Card>

        {renderContent()}
      </div>

      <AbsenceDetailsDialog
        absence={selectedAbsence}
        open={!!selectedAbsence && !justifyModalOpen && !changeStatusModalOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedAbsence(null)
        }}
      />

      <JustifyAbsenceDialog
        open={justifyModalOpen}
        onOpenChange={setJustifyModalOpen}
        absence={selectedAbsence}
        loading={justifying}
        onSubmit={handleJustify}
      />

      <ChangeStatusDialog
        open={changeStatusModalOpen}
        onOpenChange={setChangeStatusModalOpen}
        absence={selectedAbsence}
        loading={changingStatus}
        onSubmit={handleChangeStatus}
      />
    </DashboardLayout>
  )
}

function StatCard({
  label,
  value,
  icon,
  helper,
}: {
  label: string
  value: number
  icon: React.ReactNode
  helper?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function AbsenceCard({
  absence,
  onView,
  onJustify,
  onChangeStatus,
}: {
  absence: StaffAbsenceRecord
  onView: () => void
  onJustify: () => void
  onChangeStatus: () => void
}) {
  const date = new Date(absence.session_date)
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">{absence.student_name}</p>
            <Badge variant="outline">{absence.class_label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {date.toLocaleDateString("fr-FR")} • {absence.start_time.slice(0, 5)} -{" "}
            {absence.end_time.slice(0, 5)}
          </p>
          {absence.teacher_name && (
            <p className="text-xs text-muted-foreground">Professeur : {absence.teacher_name}</p>
          )}
        </div>
        <Badge className={cn(getStatusColor(absence.status))}>
          {getStatusLabel(absence.status)}
          {absence.status === "late" && absence.late_minutes && (
            <span className="ml-1">(+{absence.late_minutes} min)</span>
          )}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span
          className="inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: absence.subject_color }}
        />
        <span className="font-medium">{absence.subject_name}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {absence.justified ? (
          <Badge variant="secondary" className="gap-1 text-emerald-700">
            <ShieldCheck className="h-3 w-3" />
            Justifié
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            À justifier
          </Badge>
        )}

        {absence.comment && (
          <Badge variant="outline" className="text-xs">
            Commentaire ajouté
          </Badge>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onView}>
          <Eye className="mr-1 h-4 w-4" />
          Détails
        </Button>
        {!absence.justified && (
          <Button variant="secondary" size="sm" onClick={onJustify}>
            <CheckCircle className="mr-1 h-4 w-4" />
            Justifier
          </Button>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              Actions
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onChangeStatus()}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Modifier le statut
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

function AbsenceDetailsDialog({
  absence,
  open,
  onOpenChange,
}: {
  absence: StaffAbsenceRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!absence) return null
  const date = new Date(absence.session_date)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Détails de l&apos;absence</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <p className="text-lg font-semibold text-foreground">{absence.student_name}</p>
              <Badge variant="outline">{absence.class_label}</Badge>
              <Badge className={cn(getStatusColor(absence.status))}>{getStatusLabel(absence.status)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {date.toLocaleDateString("fr-FR")} — {absence.start_time.slice(0, 5)} à{" "}
              {absence.end_time.slice(0, 5)}
            </p>
            {absence.teacher_name && (
              <p className="text-xs text-muted-foreground">Professeur : {absence.teacher_name}</p>
            )}
          </div>

          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Matière</p>
            <p className="font-medium">{absence.subject_name}</p>
          </div>

          <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Statut</p>
              <p className="font-medium">
                {getStatusLabel(absence.status)}
                {absence.status === "late" && absence.late_minutes && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (+{absence.late_minutes} min)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Justification</p>
              {absence.justified ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  Justifié
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  Non justifié
                </div>
              )}
            </div>
            {absence.justification && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Commentaire justification</p>
                <p className="text-sm text-muted-foreground">{absence.justification}</p>
              </div>
            )}
            {absence.comment && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Commentaire interne</p>
                <p className="text-sm text-muted-foreground">{absence.comment}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function JustifyAbsenceDialog({
  open,
  onOpenChange,
  absence,
  loading,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  absence: StaffAbsenceRecord | null
  loading: boolean
  onSubmit: (justification: string) => void
}) {
  const [justification, setJustification] = useState("")

  useEffect(() => {
    if (!open) setJustification("")
  }, [open])

  if (!absence) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justifier l&apos;absence</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm">
            Vous allez justifier l&apos;absence de <strong>{absence.student_name}</strong> ({absence.class_label}).
          </p>
          <Textarea
            placeholder="Motif ou commentaire"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={() => onSubmit(justification)} disabled={loading || !justification.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Justifier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChangeStatusDialog({
  open,
  onOpenChange,
  absence,
  loading,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  absence: StaffAbsenceRecord | null
  loading: boolean
  onSubmit: (status: AttendanceStatus) => void
}) {
  if (!absence) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le statut</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choisissez l&apos;action pour <strong>{absence.student_name}</strong>.
        </p>
        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => onSubmit("present")}
            disabled={loading}
          >
            <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
            Marquer présent (retirer l&apos;absence)
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => onSubmit("late")}
            disabled={loading}
          >
            <Clock className="mr-2 h-4 w-4 text-amber-500" />
            Marquer en retard
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => onSubmit("excused")}
            disabled={loading}
          >
            <ShieldCheck className="mr-2 h-4 w-4 text-blue-500" />
            Marquer excusé
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
