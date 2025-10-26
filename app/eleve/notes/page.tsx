"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, BookOpen } from "lucide-react"
import { gradesApi } from "@/lib/api/grade"
import { getUserSession } from "@/lib/auth"

// ✅ Import des composants (noms corrigés)
import { NotesSummaryCard } from "@/components/notes/NotesSummaryCard"
import { SubjectSummTable } from "@/components/notes/SubjectSummTable"
import { SubjectNotesAccordion } from "@/components/notes/SubjectNotesAccordion"
import { StatsPanel } from "@/components/notes/StatsPanel"

// ============================================
// TYPES
// ============================================

type Evaluation = {
  evaluationId: string
  title: string
  date: string
  coefficient: number
  gradeStudent: number | null  // ✅ CORRIGÉ : Peut être null
  absent: boolean  // ✅ AJOUTÉ
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
// TYPES BACKEND (ce que ton API retourne)
// ============================================

interface BackendGrade {
  id: string
  evaluationId: string
  evaluationTitle: string
  evaluationType: string
  subjectName: string
  subjectCode: string
  value: number | null
  absent: boolean
  coefficient: number
  maxScale: number
  normalizedValue: number | null
  evalDate: string
  comment?: string
  classAverage?: number
  classMin?: number
  classMax?: number
}

// ============================================
// FONCTION DE TRANSFORMATION DES DONNÉES
// ============================================

function transformBackendData(backendGrades: BackendGrade[]): StudentNotesResponse {
  // Grouper par matière
  const gradesBySubject = backendGrades.reduce((acc, grade) => {
    const subject = grade.subjectName || "Autre"
    if (!acc[subject]) {
      acc[subject] = []
    }
    acc[subject].push(grade)
    return acc
  }, {} as Record<string, BackendGrade[]>)

  // Calculer les moyennes par matière
  const subjects: SubjectNotes[] = Object.entries(gradesBySubject).map(
    ([subjectName, grades]) => {
      // ✅ CORRIGÉ : Filtrer les absences et notes nulles
      const validGrades = grades.filter((g) => !g.absent && g.normalizedValue !== null)

      let subjectAvgStudent = 0
      let totalCoeff = 0

      if (validGrades.length > 0) {
        // Calculer la moyenne pondérée
        let totalPoints = 0
        validGrades.forEach((grade) => {
          const normalized = Number(grade.normalizedValue) || 0
          const coef = grade.coefficient || 1
          totalPoints += normalized * coef
          totalCoeff += coef
        })
        subjectAvgStudent = totalCoeff > 0 ? totalPoints / totalCoeff : 0
      }

      // Calculer min/max de la matière (seulement notes valides)
      const allStudentGrades = validGrades.map((g) => Number(g.normalizedValue) || 0)
      const subjectMin = allStudentGrades.length > 0 ? Math.min(...allStudentGrades) : undefined
      const subjectMax = allStudentGrades.length > 0 ? Math.max(...allStudentGrades) : undefined

      // ✅ CORRIGÉ : Transformer les évaluations en gardant le champ absent
      const evaluations: Evaluation[] = grades.map((grade) => ({
        evaluationId: grade.evaluationId,
        title: grade.evaluationTitle,
        date: grade.evalDate,
        coefficient: grade.coefficient,
        gradeStudent: grade.normalizedValue,  // ✅ Garde null si absent
        absent: grade.absent,  // ✅ IMPORTANT : Garde le statut absent
        avgClass: grade.classAverage,
        min: grade.classMin,
        max: grade.classMax,
        appreciation: grade.comment,
      }))

      return {
        subjectId: grades[0].subjectCode || subjectName,
        subjectName,
        subjectCoeffTotal: totalCoeff,
        subjectAvgStudent,
        subjectAvgClass: undefined, // Calculé si dispo dans le backend
        subjectMin,
        subjectMax,
        appreciation: undefined,
        evaluations,
      }
    }
  )

  // Calculer la moyenne générale (moyenne de toutes les matières)
  const validSubjects = subjects.filter((s) => s.evaluations.some(e => !e.absent))
  const generalAverage =
    validSubjects.length > 0
      ? validSubjects.reduce((acc, s) => acc + s.subjectAvgStudent, 0) / validSubjects.length
      : 0

  return {
    generalAverage,
    subjects,
  }
}

// ============================================
// COMPOSANT PAGE
// ============================================

export default function StudentNotesPage() {
  const [data, setData] = useState<StudentNotesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const user = getUserSession()

  useEffect(() => {
    if (user?.id) {
      loadNotes()
    } else {
      setError("Utilisateur non connecté")
      setIsLoading(false)
    }
  }, [user?.id])

  const loadNotes = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      console.log("[API] Loading grades for student:", user.id)

      // ✅ APPEL API RÉEL
      const response = await gradesApi.getStudentGrades(user.id, {})

      console.log("[API] Response:", response)

      if (!response.success) {
        setError(response.error || "Erreur lors du chargement des notes")
        return
      }

      const backendGrades = response.data?.grades || []
      console.log("[API] Backend grades:", backendGrades)

      // ✅ TRANSFORMER les données backend vers le format UI
      const transformedData = transformBackendData(backendGrades)
      console.log("[API] Transformed data:", transformedData)

      setData(transformedData)
    } catch (err) {
      console.error("[API] Error loading notes:", err)
      setError("Impossible de charger les notes")
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
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
          {/* Header */}
          <div className="border-b pb-6">
            <h1 className="text-4xl font-bold text-slate-900">Mes notes</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Consultez vos résultats, moyennes et appréciations.
            </p>
          </div>

          {/* Empty state */}
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Aucune note disponible</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Vos notes apparaîtront ici dès qu'elles seront saisies par vos professeurs.
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
        {/* HEADER */}
        {/* ============================================ */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Mes notes</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Consultez vos résultats, moyennes et appréciations.
              </p>
            </div>
            <Button onClick={loadNotes} variant="outline" size="sm">
              Actualiser
            </Button>
          </div>
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

          {/* RIGHT COLUMN: Stats panel */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <StatsPanel generalAverage={data.generalAverage} subjects={data.subjects} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}