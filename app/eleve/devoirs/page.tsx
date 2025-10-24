"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EditNoteModal } from "@/components/notes/EditNoteModal"
import { NotesSummaryCard } from "@/components/notes/NotesSummaryCard"
import { SubjectSummTable } from "@/components/notes/SubjectSummTable"
import { SubjectNotesAccordion } from "@/components/notes/SubjectNotesAccordion"
import { StatsPanel } from "@/components/notes/StatsPanel"
import {
  AlertCircle,
  Users,
  Clock,
  RefreshCw,
  Filter,
  Calendar,
  BookOpen,
} from "lucide-react"
import { gradesApi } from "@/lib/api/grade"
import { getUserSession } from "@/lib/auth"

// ============================================
// TYPES
// ============================================

type Child = {
  id: string
  fullName: string
  email: string
  className: string
  studentNo?: string
}

type Grade = {
  id: string
  evaluationId: string
  evaluationTitle: string
  evaluationType: string
  subjectName: string
  subjectCode: string
  className?: string
  value: number | null
  absent: boolean
  coefficient: number
  maxScale: number
  normalizedValue: number | null
  evalDate: string
  comment?: string
  createdAt: string
  createdBy?: string
  createdByRole?: string
  classAverage?: number
  classMin?: number
  classMax?: number
}

// Type pour les composants existants
type SubjectNotes = {
  subjectId: string
  subjectName: string
  subjectCoeffTotal: number
  subjectAvgStudent: number
  subjectAvgClass?: number
  subjectMin?: number
  subjectMax?: number
  appreciation?: string
  evaluations: {
    evaluationId: string
    title: string
    date: string
    coefficient: number
    gradeStudent: number
    avgClass?: number
    min?: number
    max?: number
    appreciation?: string
  }[]
}

// ============================================
// HELPER: Conversion sécurisée en nombre
// ============================================

function toNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number') return value
  if (value === null || value === undefined) return defaultValue
  const parsed = parseFloat(String(value))
  return isNaN(parsed) ? defaultValue : parsed
}

// ============================================
// HELPER: Transformation des données backend
// ============================================

function transformBackendData(backendGrades: any[]): Grade[] {
  return backendGrades.map((g) => ({
    id: g.id,
    evaluationId: g.evaluation_id || g.evaluationId,
    evaluationTitle: g.evaluation_title || g.evaluationTitle || "Sans titre",
    evaluationType: g.evaluation_type || g.evaluationType || "Contrôle",
    subjectName: g.subject_name || g.subjectName || "Matière inconnue",
    subjectCode: g.subject_code || g.subjectCode || "",
    className: g.class_name || g.className,
    value: toNumber(g.value),
    absent: g.absent === true || g.absent === "true",
    coefficient: toNumber(g.coefficient, 1),
    maxScale: toNumber(g.max_scale || g.maxScale, 20),
    normalizedValue: toNumber(g.normalized_value || g.normalizedValue),
    evalDate: g.eval_date || g.evalDate || new Date().toISOString(),
    comment: g.comment || undefined,
    createdAt: g.created_at || g.createdAt || new Date().toISOString(),
    createdBy: g.created_by || g.createdBy,
    createdByRole: g.created_by_role || g.createdByRole,
    classAverage: g.class_average !== undefined ? toNumber(g.class_average) : undefined,
    classMin: g.class_min !== undefined ? toNumber(g.class_min) : undefined,
    classMax: g.class_max !== undefined ? toNumber(g.class_max) : undefined,
  }))
}

// ============================================
// HELPER: Transformer les notes en SubjectNotes[]
// ============================================

function transformToSubjectNotes(grades: Grade[]): SubjectNotes[] {
  // Grouper par matière
  const gradesBySubject = grades.reduce((acc, grade) => {
    const subject = grade.subjectName || "Autre"
    if (!acc[subject]) {
      acc[subject] = []
    }
    acc[subject].push(grade)
    return acc
  }, {} as { [key: string]: Grade[] })

  // Transformer en SubjectNotes[]
  return Object.entries(gradesBySubject).map(([subjectName, subjectGrades]) => {
    const validGrades = subjectGrades.filter(g => !g.absent && g.normalizedValue !== null)
    
    // Calculer moyenne de l'élève
    let totalPoints = 0
    let totalCoeff = 0
    validGrades.forEach(g => {
      totalPoints += toNumber(g.normalizedValue) * toNumber(g.coefficient, 1)
      totalCoeff += toNumber(g.coefficient, 1)
    })
    const subjectAvgStudent = totalCoeff > 0 ? totalPoints / totalCoeff : 0

    // Calculer moyenne de classe
    const gradesWithClassAvg = validGrades.filter(g => g.classAverage !== undefined)
    const subjectAvgClass = gradesWithClassAvg.length > 0
      ? gradesWithClassAvg.reduce((sum, g) => sum + toNumber(g.classAverage || 0), 0) / gradesWithClassAvg.length
      : undefined

    // Min et Max de la classe
    const classAverages = validGrades
      .filter(g => g.classAverage !== undefined)
      .map(g => toNumber(g.classAverage || 0))
    const subjectMin = classAverages.length > 0 ? Math.min(...classAverages) : undefined
    const subjectMax = classAverages.length > 0 ? Math.max(...classAverages) : undefined

    // Transformer les évaluations
    const evaluations = subjectGrades.map(g => ({
      evaluationId: g.evaluationId,
      title: g.evaluationTitle,
      date: g.evalDate,
      coefficient: g.coefficient,
      gradeStudent: toNumber(g.normalizedValue),
      avgClass: g.classAverage,
      min: g.classMin,
      max: g.classMax,
      appreciation: g.comment,
    }))

    return {
      subjectId: subjectName.toLowerCase().replace(/\s+/g, '-'),
      subjectName,
      subjectCoeffTotal: totalCoeff,
      subjectAvgStudent,
      subjectAvgClass,
      subjectMin,
      subjectMax,
      appreciation: undefined,
      evaluations,
    }
  })
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ResponsableNotesPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [subjects, setSubjects] = useState<SubjectNotes[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal d'édition
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null)

  // Filtres
  const [filterPeriod, setFilterPeriod] = useState<string>("all")
  const [filterSubject, setFilterSubject] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  const user = getUserSession()

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  useEffect(() => {
    loadChildren()
  }, [])

  useEffect(() => {
    if (selectedChildId) {
      loadGrades(selectedChildId)
    }
  }, [selectedChildId, filterPeriod, filterSubject])

  const loadChildren = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await gradesApi.getChildrenGrades()

      if (response.success && response.data) {
        const childrenMap = new Map<string, Child>()
        
        response.data.forEach((item: any) => {
          if (item.student && !childrenMap.has(item.student.id)) {
            childrenMap.set(item.student.id, {
              id: item.student.id,
              fullName: item.student.name || "Élève",
              email: item.student.email || "",
              className: item.grades[0]?.className || "Classe inconnue",
              studentNo: item.student.studentNo || "",
            })
          }
        })

        const childrenList = Array.from(childrenMap.values())
        setChildren(childrenList)
        
        if (childrenList.length > 0) {
          setSelectedChildId(childrenList[0].id)
        }
      } else {
        setError(response.error || "Impossible de charger les enfants")
      }
    } catch (err) {
      console.error("Error loading children:", err)
      setError("Erreur lors du chargement des enfants")
    } finally {
      setIsLoading(false)
    }
  }

  const loadGrades = async (studentId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const filters: any = {}
      
      // Filtre par période
      if (filterPeriod !== "all") {
        const now = new Date()
        if (filterPeriod === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          filters.startDate = weekAgo.toISOString()
        } else if (filterPeriod === "month") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          filters.startDate = monthAgo.toISOString()
        }
      }

      const response = await gradesApi.getStudentGrades(studentId, filters)

      if (!response.success) {
        setError(response.error || "Erreur lors du chargement des notes")
        return
      }

      let gradesData = transformBackendData(response.data?.grades || [])

      // Filtre par matière
      if (filterSubject !== "all") {
        gradesData = gradesData.filter((g: Grade) => g.subjectName === filterSubject)
      }

      setGrades(gradesData)

      // Transformer en SubjectNotes[]
      const subjectsData = transformToSubjectNotes(gradesData)
      setSubjects(subjectsData)

    } catch (err) {
      console.error("Error loading grades:", err)
      setError("Impossible de charger les notes")
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // STATISTIQUES
  // ============================================

  const calculateGeneralAverage = (): number => {
    if (subjects.length === 0) return 0
    
    let totalPoints = 0
    let totalCoeff = 0
    
    subjects.forEach(subject => {
      totalPoints += subject.subjectAvgStudent * subject.subjectCoeffTotal
      totalCoeff += subject.subjectCoeffTotal
    })
    
    return totalCoeff > 0 ? totalPoints / totalCoeff : 0
  }

  const generalAverage = calculateGeneralAverage()
  const totalSubjects = subjects.length
  const totalEvaluations = subjects.reduce((sum, s) => sum + s.evaluations.length, 0)
  const selectedChild = children.find((c) => c.id === selectedChildId)
  const availableSubjects = Array.from(new Set(grades.map(g => g.subjectName)))

  // ============================================
  // HANDLERS
  // ============================================

  const handleRefresh = () => {
    if (selectedChildId) {
      loadGrades(selectedChildId)
    }
  }

  const handleEditNote = (gradeId: string) => {
    setEditingGradeId(gradeId)
  }

  const handleCloseEditModal = () => {
    setEditingGradeId(null)
  }

  const handleEditSuccess = () => {
    if (selectedChildId) {
      loadGrades(selectedChildId)
    }
  }

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoading && children.length === 0) {
    return (
      <DashboardLayout requiredRole="responsable">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground font-medium">Chargement des données...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error && children.length === 0) {
    return (
      <DashboardLayout requiredRole="responsable">
        <Card className="max-w-md mx-auto mt-8 border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold">Erreur</h3>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
              <Button onClick={loadChildren} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  // ============================================
  // EMPTY STATE
  // ============================================

  if (children.length === 0) {
    return (
      <DashboardLayout requiredRole="responsable">
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun enfant associé</h3>
            <p className="text-sm text-muted-foreground">
              Aucun élève n'est actuellement lié à votre compte responsable.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <DashboardLayout requiredRole="responsable">
      <div className="space-y-6 pb-8">
        {/* ========================================== */}
        {/* HEADER */}
        {/* ========================================== */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Notes de mes enfants</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Suivi et gestion des résultats scolaires
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* SÉLECTEUR D'ENFANT */}
        {/* ========================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sélectionner un enfant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full max-w-2xl rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedChildId || ""}
              onChange={(e) => setSelectedChildId(e.target.value)}
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.fullName} - {child.className}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* ========================================== */}
        {/* FILTRES */}
        {/* ========================================== */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Période
                  </label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                  >
                    <option value="all">Toutes les périodes</option>
                    <option value="week">7 derniers jours</option>
                    <option value="month">30 derniers jours</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">
                    <BookOpen className="h-4 w-4 inline mr-1" />
                    Matière
                  </label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                  >
                    <option value="all">Toutes les matières</option>
                    {availableSubjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================== */}
        {/* AVERTISSEMENT PERMISSIONS */}
        {/* ========================================== */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6 flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Permissions de modification</p>
              <p className="text-blue-700">
                Vous pouvez modifier ou supprimer les notes pendant <strong>30 jours</strong> après
                leur création. Au-delà, seul un administrateur peut intervenir.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ========================================== */}
        {/* STATISTIQUES - Composants existants */}
        {/* ========================================== */}
        {grades.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Colonne principale (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Carte résumé */}
              <NotesSummaryCard
                generalAverage={generalAverage}
                totalSubjects={totalSubjects}
                totalEvaluations={totalEvaluations}
              />

              {/* Tableau par matière */}
              <SubjectSummTable subjects={subjects} />

              {/* Accordéon des notes détaillées */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes détaillées</CardTitle>
                  <CardDescription>
                    Cliquez sur une matière pour voir toutes les évaluations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SubjectNotesAccordion subjects={subjects} />
                </CardContent>
              </Card>
            </div>

            {/* Panel latéral (1/3) */}
            <div>
              <StatsPanel
                generalAverage={generalAverage}
                subjects={subjects}
              />
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {selectedChild?.fullName} n'a pas encore de notes
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL D'ÉDITION */}
      {/* ========================================== */}
      {editingGradeId && (
        <EditNoteModal
          noteId={editingGradeId}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}
    </DashboardLayout>
  )
}