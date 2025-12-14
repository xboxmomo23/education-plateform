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

export default function AdminAuditPage() {
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
            Historique des actions sensibles de votre établissement.
          </p>
        </div>
        <Button onClick={handleExport} disabled={exporting || loading} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exporter CSV
        </Button>
      </header>

      <Card className="mb-6">
        <CardContent className="space-y-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Recherche</label>
              <div className="mt-1 flex gap-2">
                <Input
                  placeholder="Email, action, ID..."
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && applySearch()}
                />
                <Button onClick={applySearch}>Rechercher</Button>
              </div>
            </div>
            <Button variant="ghost" onClick={resetFilters} className="self-end">
              Réinitialiser
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Action</label>
              <Select
                value={currentFilters.action || "all"}
                onValueChange={(value) =>
                  setQueryParam("action", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {ACTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value || "all"} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Rôle acteur</label>
              <Select
                value={currentFilters.actorRole || "all"}
                onValueChange={(value) =>
                  setQueryParam("actorRole", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Tous les rôles" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value || "all"} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type d&apos;entité</label>
              <Select
                value={currentFilters.entityType || "all"}
                onValueChange={(value) =>
                  setQueryParam("entityType", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Toutes les entités" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value || "all"} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">ID entité</label>
              <Input
                className="mt-1"
                placeholder="UUID..."
                defaultValue={currentFilters.entityId}
                onBlur={(event) => setQueryParam("entityId", event.target.value || undefined)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date de début</label>
              <Input
                type="date"
                className="mt-1"
                value={currentFilters.from}
                onChange={(event) => setQueryParam("from", event.target.value || undefined)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date de fin</label>
              <Input
                type="date"
                className="mt-1"
                value={currentFilters.to}
                onChange={(event) => setQueryParam("to", event.target.value || undefined)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-sm text-muted-foreground">
          <div>
            {pagination.total > 0 ? (
              <>
                {pagination.total} entrées · Page {pagination.page}/{pagination.totalPages}
              </>
            ) : (
              "Aucun résultat"
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1}>
              Précédent
            </Button>
            <Button variant="outline" size="sm" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
              Suivant
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <ListSkeleton lines={6} />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              Icon={ShieldAlert}
              title="Aucune entrée"
              description="Aucun événement ne correspond aux filtres sélectionnés."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horodatage</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Acteur</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Métadonnées</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="min-w-[160px] text-sm">
                      <div className="font-medium">{log.actor_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{log.actor_role || "N/A"}</div>
                    </TableCell>
                    <TableCell className="min-w-[160px] text-sm">
                      <div>{log.entity_type || "—"}</div>
                      <div className="font-mono text-xs text-muted-foreground break-all">{log.entity_id || "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">{log.ip_address || "—"}</TableCell>
                    <TableCell>
                      <pre className="max-h-32 overflow-auto rounded bg-muted/50 p-2 text-[11px] leading-4">
                        {safeStringify(log.metadata)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  )
}
