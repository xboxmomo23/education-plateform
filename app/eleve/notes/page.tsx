"use client"

import { useState, useEffect, useRef } from "react"
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
  gradeId: string              // ✅ AJOUTÉ - ID unique de la note
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
  // ✅ AJOUT : Support des snake_case aussi
  class_average?: number
  class_min?: number
  class_max?: number
}

// ============================================
// FONCTION DE NORMALISATION DES CHAMPS
// ============================================

/**
 * Normalise les champs backend (snake_case ou camelCase) vers camelCase
 */
function normalizeBackendGrade(grade: any): BackendGrade {
  return {
    id: grade.id,
    evaluationId: grade.evaluationId || grade.evaluation_id,
    evaluationTitle: grade.evaluationTitle || grade.evaluation_title,
    evaluationType: grade.evaluationType || grade.evaluation_type,
    subjectName: grade.subjectName || grade.subject_name,
    subjectCode: grade.subjectCode || grade.subject_code,
    value: grade.value,
    absent: grade.absent,
    coefficient: grade.coefficient,
    maxScale: grade.maxScale || grade.max_scale,
    normalizedValue: grade.normalizedValue || grade.normalized_value,
    evalDate: grade.evalDate || grade.eval_date,
    comment: grade.comment,
    // ✅ Support des deux formats pour les stats de classe
    classAverage: grade.classAverage ?? grade.class_average ?? undefined,
    classMin: grade.classMin ?? grade.class_min ?? undefined,
    classMax: grade.classMax ?? grade.class_max ?? undefined,
  }
}

// ============================================
// FONCTION DE TRANSFORMATION DES DONNÉES
// ============================================

function transformBackendData(backendGrades: any[]): StudentNotesResponse {
  // ✅ NOUVEAU : Normaliser tous les grades d'abord
  const normalizedGrades = backendGrades.map(g => normalizeBackendGrade(g))
  
  // Grouper par matière
  const gradesBySubject = normalizedGrades.reduce((acc, grade) => {
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
      // ✅ Filtrer les absences et notes nulles SEULEMENT pour le calcul de la moyenne élève
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

      // ✅ NOUVEAU : Calculer le coefficient total de TOUTES les évaluations (même absents)
      const totalCoeffAll = grades.reduce((sum, g) => sum + (g.coefficient || 1), 0)

      // ✅ NOUVEAU : Calculer les stats de classe (moyenne de toutes les moyennes de classe)
      const classAverages = grades
        .filter(g => g.classAverage != null)
        .map(g => Number(g.classAverage))
      
      console.log(`[Transform] ${subjectName} - classAverages:`, classAverages)
      
      const subjectAvgClass = classAverages.length > 0
        ? classAverages.reduce((sum, avg) => sum + avg, 0) / classAverages.length
        : undefined

      // ✅ NOUVEAU : Calculer min/max de classe (prendre le min/max parmi toutes les évaluations)
      const allClassMins = grades.filter(g => g.classMin != null).map(g => Number(g.classMin))
      const allClassMaxs = grades.filter(g => g.classMax != null).map(g => Number(g.classMax))
      const subjectClassMin = allClassMins.length > 0 ? Math.min(...allClassMins) : undefined
      const subjectClassMax = allClassMaxs.length > 0 ? Math.max(...allClassMaxs) : undefined
      
      console.log(`[Transform] ${subjectName} - Stats:`, {
        avgClass: subjectAvgClass,
        min: subjectClassMin,
        max: subjectClassMax,
      })

      // Calculer min/max de la matière pour l'élève (seulement notes valides)
      const allStudentGrades = validGrades.map((g) => Number(g.normalizedValue) || 0)
      const subjectMin = allStudentGrades.length > 0 ? Math.min(...allStudentGrades) : undefined
      const subjectMax = allStudentGrades.length > 0 ? Math.max(...allStudentGrades) : undefined

      // Transformer les évaluations en gardant le champ absent
      const evaluations: Evaluation[] = grades.map((grade) => ({
        gradeId: grade.id,  // ✅ AJOUTÉ - ID unique de la note
        evaluationId: grade.evaluationId,
        title: grade.evaluationTitle,
        date: grade.evalDate,
        coefficient: grade.coefficient,
        gradeStudent: grade.normalizedValue,
        absent: grade.absent,
        avgClass: grade.classAverage,
        min: grade.classMin,
        max: grade.classMax,
        appreciation: grade.comment,
      }))
      
      console.log(`[Transform] ${subjectName} - Evaluations:`, evaluations.map(e => ({
        title: e.title,
        gradeId: e.gradeId,  // ✅ Log du gradeId
        absent: e.absent,
        avgClass: e.avgClass,
        min: e.min,
        max: e.max,
      })))

      return {
        subjectId: grades[0].subjectCode || subjectName,
        subjectName,
        subjectCoeffTotal: totalCoeffAll,  // ✅ Tous les coefficients
        subjectAvgStudent,
        subjectAvgClass,  // ✅ Moyenne de classe
        subjectMin: subjectClassMin,  // ✅ Min de CLASSE (pas élève)
        subjectMax: subjectClassMax,  // ✅ Max de CLASSE (pas élève)
        appreciation: undefined,
        evaluations,
      }
    }
  )

  // Calculer la moyenne générale (moyenne de toutes les matières avec notes valides)
  const validSubjects = subjects.filter((s) => 
    s.subjectAvgStudent > 0 && s.evaluations.some(e => !e.absent)
  )
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

  // ✅ AJOUT : Guard pour éviter double fetch en React 18 StrictMode
  const hasFetchedRef = useRef(false)

  const user = getUserSession()

  useEffect(() => {
    if (user?.id && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      loadNotes()
    } else if (!user?.id) {
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
      console.log("[API] Backend grades (raw):", backendGrades.length, "grades")

      // ✅ DÉDUPLICATION par ID de note
      const uniqueGrades = Array.from(
        new Map(backendGrades.map((grade: any) => [grade.id, grade])).values()
      )
      
      console.log("[API] After deduplication:", uniqueGrades.length, "unique grades")
      
      if (backendGrades.length !== uniqueGrades.length) {
        console.warn(
          `[API] ⚠️ Removed ${backendGrades.length - uniqueGrades.length} duplicate grades`
        )
      }

      // ✅ TRANSFORMER les données backend vers le format UI
      const transformedData = transformBackendData(uniqueGrades)
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