"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  AlertCircle, 
  BookOpen, 
  Download, 
  Calendar,
  FileText,
  RefreshCw,
  ChevronDown
} from "lucide-react"
import { gradesApi } from "@/lib/api/grade"
import { termsApi, reportsApi, type Term, type GradesSummary } from "@/lib/api/term"
import { getUserSession } from "@/lib/auth"

// ✅ Import des composants
import { NotesSummaryCard } from "@/components/notes/NotesSummaryCard"
import { SubjectSummTable } from "@/components/notes/SubjectSummTable"
import { SubjectNotesAccordion } from "@/components/notes/SubjectNotesAccordion"
import { StatsPanel } from "@/components/notes/StatsPanel"

const getCurrentAcademicYear = (): number => {
  const now = new Date()
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
}

// ============================================
// TYPES
// ============================================

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

// ============================================
// TRANSFORMATION DES DONNÉES SUMMARY -> UI
// ============================================

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
        gradeId: e.evaluationId, // Utiliser evaluationId comme clé unique
        evaluationId: e.evaluationId,
        title: e.title,
        date: e.date,
        coefficient: e.coefficient,
        gradeStudent: e.normalizedValue,
        absent: e.absent,
        avgClass: undefined, // Les stats par évaluation sont dans les subjects
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

// ============================================
// COMPOSANT PAGE
// ============================================

export default function StudentNotesPage() {
  const [data, setData] = useState<StudentNotesResponse | null>(null)
  const [summaryData, setSummaryData] = useState<GradesSummary | null>(null)
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTerms, setIsLoadingTerms] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null)


  // Calcul automatique de l'année académique
  // Règle : si on est en septembre ou après -> année en cours
  // sinon -> année précédente (année de début de l'année scolaire)
  const now = new Date()
  const currentYear =
    now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1


  // Guard pour éviter double fetch en React 18 StrictMode
  const hasFetchedRef = useRef(false)

  const user = getUserSession()

  // Charger les périodes au montage
  useEffect(() => {
    if (user?.id && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      loadTerms()
    } else if (!user?.id) {
      setError("Utilisateur non connecté")
      setIsLoading(false)
      setIsLoadingTerms(false)
    }
  }, [user?.id])

  // Charger les notes quand la période change
  useEffect(() => {
    if (user?.id && !isLoadingTerms) {
      loadNotes()
    }
  }, [selectedTermId, user?.id, isLoadingTerms])

  const loadTerms = async () => {
    try {
      setIsLoadingTerms(true)

      // On ne filtre plus par année ici → on récupère toutes les périodes
      const response = await termsApi.getTerms()

      if (response.success && response.data) {
        setTerms(response.data)

        // Sélectionner la période courante par défaut
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
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      console.log("[API] Loading grades summary for student:", user.id)
      console.log("[API] Selected term:", selectedTermId)

      // 🔹 Déterminer l'année académique à envoyer au backend
      let academicYear: number

      if (selectedTermId) {
        const selectedTerm = terms.find((t) => t.id === selectedTermId)
        // Si on a une période sélectionnée, on prend son academicYear
        academicYear = selectedTerm?.academicYear ?? getCurrentAcademicYear()
      } else {
        // Année complète → année scolaire courante
        academicYear = getCurrentAcademicYear()
      }

      const response = await reportsApi.getMyGradesSummary(
        academicYear,
        selectedTermId || undefined
      )

      console.log("[API] Summary response:", response)

      if (!response.success || !response.data) {
        setError(response.error || "Erreur lors du chargement des notes")
        return
      }

      setSummaryData(response.data)

      // Transformer les données pour les composants UI existants
      const transformedData = transformSummaryToUI(response.data)
      setData(transformedData)
    } catch (err) {
      console.error("[API] Error loading student notes:", err)
      setError("Erreur lors du chargement des notes")
    } finally {
      setIsLoading(false)
    }
  }



  const handleDownloadReport = async (termId: string) => {
    if (!user?.id) return

    // ✅ Récupérer le token depuis localStorage
    const token = localStorage.getItem('auth_token')
    
    if (!token) {
      alert("Session expirée. Veuillez vous reconnecter.")
      return
    }

    try {
      setDownloadingReport(termId)
      await reportsApi.downloadReport(user.id, termId, token)
    } catch (err) {
      console.error("Error downloading report:", err)
      alert("Erreur lors du téléchargement du bulletin")
    } finally {
      setDownloadingReport(null)
    }
  }
  const isTermPast = (term: Term) => {
    return new Date(term.endDate) < new Date()
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading || isLoadingTerms) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground font-medium">Chargement de vos notes...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Erreur de chargement</h3>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                </div>
                <Button onClick={loadNotes} className="w-full">
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // ============================================
  // EMPTY STATE
  // ============================================
  if (!data || data.subjects.length === 0) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="space-y-6">
          {/* Header avec sélecteur de période */}
          <div className="border-b pb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Mes notes</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Consultez vos résultats, moyennes et appréciations.
                </p>
              </div>
              {/* Sélecteur de période */}
              <div className="flex items-center gap-3">
                <PeriodSelector
                  terms={terms}
                  selectedTermId={selectedTermId}
                  onSelect={setSelectedTermId}
                />
                <Button onClick={loadNotes} variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Empty state */}
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Aucune note disponible</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedTermId 
                      ? "Aucune note pour cette période."
                      : "Vos notes apparaîtront ici dès qu'elles seront saisies."}
                  </p>
                </div>
                <Button onClick={loadNotes} variant="outline">
                  Actualiser
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // ============================================
  // MAIN CONTENT
  // ============================================
  const totalEvaluations = data.subjects.reduce((acc, s) => acc + s.evaluations.length, 0)

  return (
    <DashboardLayout requiredRole="student">
      <div className="space-y-6 pb-8">
        {/* ============================================ */}
        {/* HEADER avec sélecteur de période */}
        {/* ============================================ */}
        <div className="border-b pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Mes notes</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Consultez vos résultats, moyennes et appréciations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Sélecteur de période */}
              <PeriodSelector
                terms={terms}
                selectedTermId={selectedTermId}
                onSelect={setSelectedTermId}
              />
              <Button onClick={loadNotes} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Badge période sélectionnée */}
          {summaryData?.term && (
            <div className="mt-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Période : <strong>{summaryData.term.name}</strong>
                {" "}({new Date(summaryData.term.startDate).toLocaleDateString('fr-FR')} - {new Date(summaryData.term.endDate).toLocaleDateString('fr-FR')})
              </span>
            </div>
          )}
          {!selectedTermId && (
            <div className="mt-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Période : <strong>Année complète</strong>
              </span>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* MOYENNE GÉNÉRALE - HERO CARD */}
        {/* ============================================ */}
        <NotesSummaryCard
          generalAverage={data.generalAverage}
          totalSubjects={data.subjects.length}
          totalEvaluations={totalEvaluations}
        />

        {/* ============================================ */}
        {/* LAYOUT: Main content + Sidebar */}
        {/* ============================================ */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* LEFT COLUMN: Tables & Accordion */}
          <div className="space-y-6">
            {/* Synthèse par matière */}
            <SubjectSummTable subjects={data.subjects} />

            {/* Notes détaillées (Accordion) */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Notes détaillées</h2>
              <SubjectNotesAccordion subjects={data.subjects} />
            </div>
          </div>

          {/* RIGHT COLUMN: Stats panel + Bulletins */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <StatsPanel generalAverage={data.generalAverage} subjects={data.subjects} />

            {/* ============================================ */}
            {/* BLOC BULLETINS */}
            {/* ============================================ */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Bulletins
                </CardTitle>
                <CardDescription>
                  Téléchargez vos bulletins de notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {terms.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune période configurée
                  </p>
                ) : (
                  terms.map((term) => {
                    const canDownload = isTermPast(term)
                    const isDownloading = downloadingReport === term.id

                    return (
                      <div
                        key={term.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          canDownload 
                            ? 'bg-white hover:bg-slate-50' 
                            : 'bg-slate-50 opacity-60'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-sm">{term.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(term.startDate).toLocaleDateString('fr-FR')} - {new Date(term.endDate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={canDownload ? "default" : "ghost"}
                          disabled={!canDownload || isDownloading}
                          onClick={() => handleDownloadReport(term.id)}
                        >
                          {isDownloading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="ml-2 hidden sm:inline">
                            {canDownload ? "Télécharger" : "À venir"}
                          </span>
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
    </DashboardLayout>
  )
}

// ============================================
// COMPOSANT SÉLECTEUR DE PÉRIODE
// ============================================

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
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[180px] justify-between"
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {label}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          {/* Overlay pour fermer le dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-2 z-20 w-56 rounded-md border bg-white shadow-lg">
            <div className="py-1">
              {/* Option "Année complète" */}
              <button
                onClick={() => {
                  onSelect(null)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 ${
                  selectedTermId === null ? 'bg-slate-50 font-medium' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Année complète
                </div>
              </button>

              {/* Séparateur */}
              {terms.length > 0 && <div className="my-1 border-t" />}

              {/* Liste des périodes */}
              {terms.map((term) => (
                <button
                  key={term.id}
                  onClick={() => {
                    onSelect(term.id)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 ${
                    selectedTermId === term.id ? 'bg-slate-50 font-medium' : ''
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(term.startDate).toLocaleDateString('fr-FR')} - {new Date(term.endDate).toLocaleDateString('fr-FR')}
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