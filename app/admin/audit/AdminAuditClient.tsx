"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AdminBackButton } from "@/components/admin/AdminBackButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ListSkeleton } from "@/components/ui/list-skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { notify } from "@/lib/toast"
import { auditApi, type AuditLogItem } from "@/lib/api/audit"
import { Download, ShieldAlert } from "lucide-react"

const LIMIT = 50

const ACTION_OPTIONS = [
  { value: "all", label: "Toutes les actions" },
  { value: "AUTH_LOGIN_SUCCESS", label: "Connexion réussie" },
  { value: "AUTH_LOGIN_FAILED", label: "Connexion échouée" },
  { value: "AUTH_RESET_REQUESTED", label: "Reset demandé" },
  { value: "AUTH_RESET_COMPLETED", label: "Reset confirmé" },
  { value: "AUTH_INVITE_SENT", label: "Invitation envoyée" },
  { value: "AUTH_INVITE_ACCEPTED", label: "Invitation acceptée" },
  { value: "STUDENT_CREATED", label: "Création élève" },
  { value: "STUDENT_STATUS_UPDATED", label: "Statut élève" },
  { value: "PARENT_CREATED", label: "Création parent" },
  { value: "PARENT_LINKED_TO_STUDENT", label: "Lien parent/élève" },
  { value: "TEACHER_CREATED", label: "Création professeur" },
  { value: "STAFF_CREATED", label: "Création staff" },
  { value: "ASSIGNMENT_CREATED", label: "Devoir créé" },
  { value: "ASSIGNMENT_UPDATED", label: "Devoir modifié" },
  { value: "ASSIGNMENT_DELETED", label: "Devoir archivé" },
  { value: "EVALUATION_CREATED", label: "Évaluation créée" },
  { value: "EVALUATION_UPDATED", label: "Évaluation modifiée" },
  { value: "EVALUATION_DELETED", label: "Évaluation supprimée" },
  { value: "GRADE_CREATED", label: "Notes enregistrées" },
  { value: "GRADE_UPDATED", label: "Note modifiée" },
  { value: "GRADE_DELETED", label: "Note supprimée" },
  { value: "ATTENDANCE_JUSTIFIED", label: "Absence justifiée" },
  { value: "ATTENDANCE_STATUS_CHANGED", label: "Statut absence" },
  { value: "ATTENDANCE_REMOVED", label: "Absence supprimée" },
  { value: "TIMETABLE_PDF_EXPORTED", label: "Export EDT" },
  { value: "STAFF_ABSENCES_EXPORT_CSV", label: "Export absences CSV" },
  { value: "STAFF_ABSENCES_EXPORT_PDF", label: "Export absences PDF" },
]

const ROLE_OPTIONS = [
  { value: "all", label: "Tous les rôles" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
  { value: "staff", label: "Staff" },
  { value: "teacher", label: "Professeur" },
  { value: "parent", label: "Parent" },
  { value: "student", label: "Élève" },
]

const ENTITY_OPTIONS = [
  { value: "all", label: "Toutes les entités" },
  { value: "user", label: "Utilisateur" },
  { value: "assignment", label: "Devoir" },
  { value: "evaluation", label: "Évaluation" },
  { value: "grade", label: "Note" },
  { value: "attendance_record", label: "Absence" },
  { value: "timetable", label: "Emploi du temps" },
]

function formatDate(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date)
}

function safeStringify(metadata: Record<string, any> | null) {
  try {
    if (!metadata) return "{}"
    return JSON.stringify(metadata, null, 2)
  } catch {
    return "{}"
  }
}

export function AdminAuditClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentFilters = useMemo(() => {
    const get = (key: string, defaultValue = "") => searchParams.get(key) ?? defaultValue
    return {
      q: get("q"),
      action: get("action"),
      actorRole: get("actorRole"),
      entityType: get("entityType"),
      entityId: get("entityId"),
      from: get("from"),
      to: get("to"),
      page: Math.max(1, parseInt(get("page", "1"), 10) || 1),
    }
  }, [searchParams])

  const [searchInput, setSearchInput] = useState(currentFilters.q)
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 1 })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setSearchInput(currentFilters.q)
  }, [currentFilters.q])

  const queryParams = useMemo(() => ({
    q: currentFilters.q || undefined,
    action: currentFilters.action || undefined,
    actorRole: currentFilters.actorRole || undefined,
    entityType: currentFilters.entityType || undefined,
    entityId: currentFilters.entityId || undefined,
    from: currentFilters.from || undefined,
    to: currentFilters.to || undefined,
    page: currentFilters.page,
    limit: LIMIT,
  }), [currentFilters])

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const response = await auditApi.getLogs(queryParams, controller.signal)
        if (!response.success) {
          setError(response.error || "Impossible de charger les journaux")
          setLogs([])
          return
        }
        setLogs(response.data.items)
        setPagination(response.data.pagination)
      } catch (err: any) {
        if (controller.signal.aborted || err?.name === "AbortError" || err?.message?.toLowerCase?.().includes("aborted")) {
          return
        }
        console.error("Erreur chargement audit:", err)
        setError(err.message || "Erreur lors du chargement des journaux")
        setLogs([])
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => controller.abort()
  }, [queryParams])

  const setQueryParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value.length === 0) {
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

  const applySearch = () => {
    const value = searchInput.trim()
    setQueryParam("q", value || undefined)
  }

  const resetFilters = () => {
    router.replace(pathname, { scroll: false })
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const exportParams = { ...queryParams }
      delete (exportParams as any).page
      delete (exportParams as any).limit
      const { blob, filename } = await auditApi.exportCsv(exportParams)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename || `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error("Erreur export audit:", error)
      notify.error(error.message || "Export impossible")
    } finally {
      setExporting(false)
    }
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    setQueryParam("page", page > 1 ? String(page) : undefined)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AdminBackButton className="mb-4" />
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Journal d&apos;audit</h1>
          <p className="text-sm text-muted-foreground">
            Recherchez et exportez les actions réalisées dans l&apos;application.
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" disabled={exporting}>
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Exporter CSV
        </Button>
      </header>

      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Recherche (email, action, entité...)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
            />
            <div className="flex gap-2">
              <Button onClick={applySearch} variant="secondary">
                Rechercher
              </Button>
              <Button variant="ghost" onClick={resetFilters}>
                Réinitialiser
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Action"
              value={currentFilters.action || "all"}
              onChange={(v) => setQueryParam("action", v === "all" ? undefined : v)}
              options={ACTION_OPTIONS}
            />
            <FilterSelect
              label="Rôle"
              value={currentFilters.actorRole || "all"}
              onChange={(v) => setQueryParam("actorRole", v === "all" ? undefined : v)}
              options={ROLE_OPTIONS}
            />
            <FilterSelect
              label="Entité"
              value={currentFilters.entityType || "all"}
              onChange={(v) => setQueryParam("entityType", v === "all" ? undefined : v)}
              options={ENTITY_OPTIONS}
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">ID entité</p>
              <Input
                placeholder="ID"
                value={currentFilters.entityId || ""}
                onChange={(e) => setQueryParam("entityId", e.target.value || undefined)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Du</p>
              <Input
                type="date"
                value={currentFilters.from || ""}
                onChange={(e) => setQueryParam("from", e.target.value || undefined)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Au</p>
              <Input
                type="date"
                value={currentFilters.to || ""}
                onChange={(e) => setQueryParam("to", e.target.value || undefined)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <EmptyState
          icon={ShieldAlert}
          title="Erreur de chargement"
          description={error}
          action={<Button onClick={() => router.refresh()}>Réessayer</Button>}
        />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Aucun journal"
          description="Aucun résultat pour ces filtres."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Métadonnées</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{log.action}</span>
                        {log.ip_address && (
                          <span className="text-xs text-muted-foreground">IP: {log.ip_address}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{log.actor_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.actor_role || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{log.entity_type || "—"}</span>
                        {log.entity_id && (
                          <span className="text-xs text-muted-foreground">ID: {log.entity_id}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <pre className="max-h-24 overflow-auto rounded-md bg-muted/60 p-2 text-xs">
                        {safeStringify(log.metadata)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Page {pagination.page} sur {pagination.totalPages} — {pagination.total} entrées
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1}>
            Précédent
          </Button>
          <Button variant="outline" size="sm" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
            Suivant
          </Button>
        </div>
      </div>
    </main>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
