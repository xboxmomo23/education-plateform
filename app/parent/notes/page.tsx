"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, BookOpen, Calendar, ChevronDown, Download, FileText, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { NotesSummaryCard } from "@/components/notes/NotesSummaryCard"
import { SubjectSummTable } from "@/components/notes/SubjectSummTable"
import { SubjectNotesAccordion } from "@/components/notes/SubjectNotesAccordion"
import { StatsPanel } from "@/components/notes/StatsPanel"
import { termsApi, reportsApi, type Term, type GradesSummary } from "@/lib/api/term"
import { reportCardApi, type ReportCardStatus } from "@/lib/api/reportCard"
import { useAuth } from "@/hooks/useAuth"
import { useParentChild } from "@/components/parent/ParentChildContext"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"
import { PageLoader } from "@/components/ui/page-loader"
import { ListSkeleton } from "@/components/ui/list-skeleton"

const getCurrentAcademicYear = (): number => {
  const now = new Date()
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
}

type Evaluation = {
  gradeId: string
  evaluationId: string
  title: string
  date: string
  coefficient: number
  gradeStudent: number | null
  absent: boolean
  avgClass?: number
  min?: number
  max?: number
  appreciation?: string
}

type SubjectNotes = {
  subjectId: string
  subjectName: string
  subjectCoeffTotal: number
  subjectAvgStudent: number
  subjectAvgClass?: number
  subjectMin?: number
  subjectMax?: number
  appreciation?: string
  evaluations: Evaluation[]
}

type StudentNotesResponse = {
  generalAverage: number
  subjects: SubjectNotes[]
}

function transformSummaryToUI(summary: GradesSummary): StudentNotesResponse {
  const subjects: SubjectNotes[] = summary.subjects.map((subject) => ({
    subjectId: subject.subjectId,
    subjectName: subject.subjectName,
    subjectCoeffTotal: subject.coefTotal,
    subjectAvgStudent: subject.studentAverage20,
    subjectAvgClass: subject.classAverage20 ?? undefined,
    subjectMin: subject.min ?? undefined,
    subjectMax: subject.max ?? undefined,
    appreciation: subject.appreciation,
    evaluations: summary.evaluations
      .filter((e) => e.subjectId === subject.subjectId)
      .map((e) => ({
        gradeId: e.evaluationId,
        evaluationId: e.evaluationId,
        title: e.title,
        date: e.date,
        coefficient: e.coefficient,
        gradeStudent: e.normalizedValue,
        absent: e.absent,
        avgClass: undefined,
        min: undefined,
        max: undefined,
        appreciation: e.comment ?? undefined,
      })),
  }))

  return {
    generalAverage: summary.overallAverage,
    subjects,
  }
}

export default function ParentNotesPage() {
  const { fullName } = useAuth()
  const { selectedChild } = useParentChild()
  const { settings } = useEstablishmentSettings()
  const child = selectedChild ?? null
  const studentId = child?.id ?? null

  const [data, setData] = useState<StudentNotesResponse | null>(null)
  const [summaryData, setSummaryData] = useState<GradesSummary | null>(null)
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTerms, setIsLoadingTerms] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null)
  const [reportCardStatuses, setReportCardStatuses] = useState<Record<string, ReportCardStatus>>({})

  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (!studentId) {
      setIsLoading(false)
      setIsLoadingTerms(false)
      return
    }
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      loadTerms()
    }
  }, [studentId])

  useEffect(() => {
    if (!studentId || isLoadingTerms) return
    loadNotes()
    loadReportCardStatuses()
  }, [studentId, selectedTermId, isLoadingTerms, terms.length])

  const loadTerms = async () => {
    try {
      setIsLoadingTerms(true)
      const response = await termsApi.getTerms()
      if (response.success && response.data) {
        setTerms(response.data)
        const currentTerm = response.data.find((t) => t.isCurrent)
        if (currentTerm) {
          setSelectedTermId(currentTerm.id)
        }
      }
    } catch (err) {
      console.error("[API] Error loading terms:", err)
    } finally {
      setIsLoadingTerms(false)
    }
  }

  const loadNotes = async () => {
    if (!studentId) return

    try {
      setIsLoading(true)
      setError(null)

      let academicYear: number
      if (selectedTermId) {
        const selectedTerm = terms.find((t) => t.id === selectedTermId)
        academicYear = selectedTerm?.academicYear ?? getCurrentAcademicYear()
      } else {
        academicYear = getCurrentAcademicYear()
      }

      const response = await reportsApi.getStudentGradesSummary(
        studentId,
        academicYear,
        selectedTermId || undefined
      )

      if (!response.success || !response.data) {
        setError(response.error || "Erreur lors du chargement des notes")
        return
      }

      setSummaryData(response.data)
      const transformedData = transformSummaryToUI(response.data)
      setData(transformedData)
    } catch (err) {
      console.error("[API] Error loading parent student notes:", err)
      setError("Erreur lors du chargement des notes")
    } finally {
      setIsLoading(false)
    }
  }

  const loadReportCardStatuses = async () => {
    if (!studentId || terms.length === 0) return

    const statuses: Record<string, ReportCardStatus> = {}
    for (const term of terms) {
      try {
        const response = await reportCardApi.getStatus(studentId, term.id)
        if (response.success && response.data) {
          statuses[term.id] = response.data
        }
      } catch (err) {
        console.error(`Erreur chargement statut bulletin pour ${term.id}:`, err)
      }
    }

    setReportCardStatuses(statuses)
  }

  const handleDownloadReport = async (termId: string) => {
    if (!studentId) return

    const status = reportCardStatuses[termId]
    if (!status?.validated) {
      alert("Ce bulletin n'est pas encore disponible. Il sera accessible après validation par l'équipe pédagogique.")
      return
    }

    const token = localStorage.getItem("auth_token")
    if (!token) {
      alert("Session expirée. Veuillez vous reconnecter.")
      return
    }

    try {
      setDownloadingReport(termId)
      await reportsApi.downloadReport(studentId, termId, token)
    } catch (err) {
      console.error("Error downloading report:", err)
      alert("Erreur lors du téléchargement du bulletin")
    } finally {
      setDownloadingReport(null)
    }
  }

  const canDownloadReport = (term: Term): { canDownload: boolean; reason: string } => {
    const status = reportCardStatuses[term.id]

    if (status?.validated) {
      return { canDownload: true, reason: "Télécharger" }
    }

    const isPast = new Date(term.endDate) < new Date()
    if (!isPast) {
      return { canDownload: false, reason: "À venir" }
    }

    return { canDownload: false, reason: "En attente" }
  }

  if (!studentId) {
    return (
      <div className="space-y-6">
        <div className="border-b pb-6">
          <h1 className="text-4xl font-bold text-slate-900">Notes</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Aucun enfant activé n’est associé à ce compte (les invitations peuvent être en attente).
            {settings?.contactEmail
              ? ` Contactez ${settings.contactEmail} pour lier votre compte parent à un élève.`
              : " Contactez l’établissement pour lier votre compte parent à un élève."}
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || isLoadingTerms) {
    return (
      <div className="space-y-6">
        <PageLoader label={`Chargement des notes de ${child?.full_name ?? "votre enfant"}...`} />
        <ListSkeleton rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Erreur de chargement</h3>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={loadNotes} className="w-full">
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data || data.subjects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="border-b pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Notes de {child?.full_name ?? "votre enfant"}</h1>
              <p className="mt-2 text-lg text-muted-foreground">
                Consultez ses résultats, moyennes et appréciations.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto md:justify-end">
              <PeriodSelector
                terms={terms}
                selectedTermId={selectedTermId}
                onSelect={setSelectedTermId}
              />
              <Button onClick={loadNotes} variant="outline" size="icon" className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="py-16">
            <div className="space-y-4 text-center">
              <BookOpen className="mx-auto h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Aucune note disponible</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedTermId ? "Aucune note pour cette période." : "Les notes apparaîtront ici dès qu'elles seront saisies."}
                </p>
              </div>
              <Button onClick={loadNotes} variant="outline">
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalEvaluations = data.subjects.reduce((acc, s) => acc + s.evaluations.length, 0)

  return (
    <div className="space-y-6 pb-8">
      <div className="border-b pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Notes de {child?.full_name ?? "votre enfant"}</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Consultez ses résultats, moyennes et appréciations.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto md:justify-end">
            <PeriodSelector
              terms={terms}
              selectedTermId={selectedTermId}
              onSelect={setSelectedTermId}
            />
            <Button onClick={loadNotes} variant="outline" size="icon" className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {summaryData?.term && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              Période : <strong>{summaryData.term.name}</strong>{" "}
              ({new Date(summaryData.term.startDate).toLocaleDateString("fr-FR")} -{" "}
              {new Date(summaryData.term.endDate).toLocaleDateString("fr-FR")})
            </span>
          </div>
        )}
        {!selectedTermId && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              Période : <strong>Année complète</strong>
            </span>
          </div>
        )}
      </div>

      <NotesSummaryCard
        generalAverage={data.generalAverage}
        totalSubjects={data.subjects.length}
        totalEvaluations={totalEvaluations}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SubjectSummTable subjects={data.subjects} />

          <div>
            <h2 className="mb-4 text-2xl font-bold text-slate-900">Notes détaillées</h2>
            <SubjectNotesAccordion subjects={data.subjects} />
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <StatsPanel generalAverage={data.generalAverage} subjects={data.subjects} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Bulletins
              </CardTitle>
              <CardDescription>Téléchargez les bulletins validés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {terms.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Aucune période configurée</p>
              ) : (
                terms.map((term) => {
                  const { canDownload, reason } = canDownloadReport(term)
                  const isDownloading = downloadingReport === term.id
                  const status = reportCardStatuses[term.id]

                  return (
                    <div
                      key={term.id}
                      className={`flex flex-col gap-3 rounded-lg border p-3 ${
                        canDownload ? "bg-white hover:bg-slate-50" : "bg-slate-50"
                      } sm:flex-row sm:items-center sm:justify-between`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{term.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(term.startDate).toLocaleDateString("fr-FR")} -{" "}
                          {new Date(term.endDate).toLocaleDateString("fr-FR")}
                        </p>
                        {status?.validated ? (
                          <p className="mt-1 text-xs text-emerald-600">Bulletin validé</p>
                        ) : new Date(term.endDate) >= new Date() ? (
                          <p className="mt-1 text-xs text-muted-foreground">À venir</p>
                        ) : (
                          <p className="mt-1 text-xs text-orange-600">En cours de préparation</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={canDownload ? "default" : "ghost"}
                        disabled={!canDownload || isDownloading}
                        onClick={() => handleDownloadReport(term.id)}
                        className="w-full sm:w-auto"
                      >
                        {isDownloading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">{reason}</span>
                      </Button>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

interface PeriodSelectorProps {
  terms: Term[]
  selectedTermId: string | null
  onSelect: (termId: string | null) => void
}

function PeriodSelector({ terms, selectedTermId, onSelect }: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedTerm = terms.find((t) => t.id === selectedTermId)
  const label = selectedTerm ? selectedTerm.name : "Année complète"

  return (
    <div className="relative w-full sm:w-auto">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between sm:min-w-[200px]"
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {label}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-md border bg-white shadow-lg sm:left-auto sm:right-0 sm:w-56">
            <div className="py-1">
              <button
                onClick={() => {
                  onSelect(null)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 ${
                  selectedTermId === null ? "bg-slate-50 font-medium" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Année complète
                </div>
              </button>

              {terms.length > 0 && <div className="my-1 border-t" />}

              {terms.map((term) => (
                <button
                  key={term.id}
                  onClick={() => {
                    onSelect(term.id)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 ${
                    selectedTermId === term.id ? "bg-slate-50 font-medium" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{term.name}</span>
                    {term.isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        En cours
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(term.startDate).toLocaleDateString("fr-FR")} -{" "}
                    {new Date(term.endDate).toLocaleDateString("fr-FR")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
