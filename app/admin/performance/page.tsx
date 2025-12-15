"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { dashboardAdminPerformanceApi, type AdminPerformanceResponse } from "@/lib/api/dashboard-admin-performance"
import { termsApi } from "@/lib/api/term"
import { classesApi, type AdminClass } from "@/lib/api/classes"
import { PageLoader } from "@/components/ui/page-loader"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminBackButton } from "@/components/admin/AdminBackButton"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"
import { notify } from "@/lib/toast"
import { Loader2 } from "lucide-react"

interface TermOption {
  id: string
  name: string
}

export default function AdminPerformancePage() {
  const { settings } = useEstablishmentSettings()
  const [terms, setTerms] = useState<TermOption[]>([])
  const [classes, setClasses] = useState<AdminClass[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string | "all">("all")
  const [selectedClass, setSelectedClass] = useState<string | "all">("all")
  const [data, setData] = useState<AdminPerformanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadFilters = useCallback(async () => {
    try {
      const [termsResponse, classesResponse] = await Promise.all([
        termsApi.getTerms().then((res) => res.data ?? res),
        classesApi.list(),
      ])
      if (Array.isArray(termsResponse)) {
        setTerms(termsResponse.map((term) => ({ id: term.id, name: term.name })))
      }
      if (classesResponse.success) {
        setClasses(classesResponse.data)
      }
    } catch (err: any) {
      console.error("Erreur chargement filtres performance:", err)
      notify.error(err.message || "Impossible de charger les filtres")
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await dashboardAdminPerformanceApi.getPerformance({
        termId: selectedTerm !== "all" ? selectedTerm : undefined,
        classId: selectedClass,
      })
      if (response.success) {
        setData(response.data)
      } else {
        setError(response.error || "Impossible de charger les performances")
      }
    } catch (err: any) {
      console.error("Erreur chargement performance admin:", err)
      setError(err.message || "Erreur lors du chargement des performances")
    } finally {
      setLoading(false)
    }
  }, [selectedClass, selectedTerm])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await loadData()
    } finally {
      setRefreshing(false)
    }
  }

  const distribution = data?.distribution ?? {
    lt10: 0,
    b10_12: 0,
    b12_14: 0,
    b14_16: 0,
    gte16: 0,
  }

  const totalDistribution = useMemo(() => {
    return (
      distribution.lt10 +
      distribution.b10_12 +
      distribution.b12_14 +
      distribution.b14_16 +
      distribution.gte16
    )
  }, [distribution])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AdminBackButton className="mb-4" />
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Performance scolaire</h1>
          <p className="text-sm text-muted-foreground">
            Analyse des moyennes et de la distribution des résultats.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {settings?.displayName} {settings?.schoolYear ? `· ${settings.schoolYear}` : ""}
        </div>
      </header>

      <section className="mb-6 rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Période</label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner une période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Année complète</SelectItem>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Classe</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Toutes les classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleRefresh} disabled={refreshing} className="w-full">
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualisation…
                </>
              ) : (
                "Actualiser"
              )}
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <PageLoader label="Chargement des performances..." />
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : !data ? (
        <EmptyState
          Icon={Loader2}
          title="Aucune donnée"
          description="Aucune performance disponible pour le moment."
        />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <KpiCard title="Moyenne établissement" value={data.establishment.avg.toFixed(2)} suffix="/20" />
            <KpiCard title="Taux ≥ 10" value={`${data.establishment.passRate.toFixed(1)}%`} />
            <KpiCard title="Élèves pris en compte" value={data.establishment.studentCount} />
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-base font-semibold">Distribution des notes</h2>
            </div>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "< 10", value: distribution.lt10 },
                { label: "10 - 12", value: distribution.b10_12 },
                { label: "12 - 14", value: distribution.b12_14 },
                { label: "14 - 16", value: distribution.b14_16 },
                { label: "≥ 16", value: distribution.gte16 },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-semibold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalDistribution > 0 ? ((item.value / totalDistribution) * 100).toFixed(1) : "0.0"}%
                  </p>
                </div>
              ))}
            </CardContent>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-base font-semibold">Moyennes par classe</h2>
            </div>
            {data.classes.length === 0 ? (
              <EmptyState
                Icon={Loader2}
                title="Aucune classe"
                description="Aucune moyenne disponible pour les classes sélectionnées."
                className="border-0"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Classe</TableHead>
                    <TableHead>Effectif</TableHead>
                    <TableHead>Moyenne</TableHead>
                    <TableHead>Taux ≥ 10</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.classes.map((cls) => (
                    <TableRow key={cls.class_id}>
                      <TableCell className="font-medium">{cls.class_label}</TableCell>
                      <TableCell>{cls.student_count}</TableCell>
                      <TableCell>{cls.avg.toFixed(2)}</TableCell>
                      <TableCell>{`${cls.passRate.toFixed(1)}%`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-base font-semibold">Top 10 élèves</h2>
            </div>
            {data.topStudents.length === 0 ? (
              <EmptyState
                Icon={Loader2}
                title="Aucun élève"
                description="Aucune note disponible pour les élèves."
                className="border-0"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Moyenne</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topStudents.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>{student.class_label}</TableCell>
                      <TableCell>{student.avg.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

function KpiCard({ title, value, suffix }: { title: string; value: number | string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold">
          {value}
          {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
        </p>
      </CardContent>
    </Card>
  )
}
