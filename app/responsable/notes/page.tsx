"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  BookOpen,
  Users,
  Edit,
  Trash2,
  Clock,
  History,
  ChevronDown,
} from "lucide-react"
import { gradesApi } from "@/lib/api/grade"
import { getUserSession } from "@/lib/auth"

// Types
type Child = {
  id: string
  fullName: string
  email: string
  className: string
}

type Grade = {
  id: string
  evaluationId: string
  evaluationTitle: string
  evaluationType: string
  subjectName: string
  subjectCode: string
  className: string
  value: number | null
  absent: boolean
  coefficient: number
  maxScale: number
  normalizedValue: number | null
  evalDate: string
  comment?: string
  createdAt: string
  createdBy: string
  createdByRole: string
  classAverage?: number
  classMin?: number
  classMax?: number
}

type GradesBySubject = {
  [subjectName: string]: Grade[]
}

export default function ResponsableNotesPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [gradesBySubject, setGradesBySubject] = useState<GradesBySubject>({})
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null)

  const user = getUserSession()

  useEffect(() => {
    loadChildren()
  }, [])

  useEffect(() => {
    if (selectedChildId) {
      loadGrades(selectedChildId)
    }
  }, [selectedChildId])

  const loadChildren = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // ✅ APPEL API : Récupérer les enfants du responsable
      // Pour l'instant, mock data
      // TODO: Remplacer par gradesApi.getChildren() ou similar
      
      const mockChildren: Child[] = [
        {
          id: "alice-id",
          fullName: "Alice Dupont",
          email: "alice.dupont@student.test",
          className: "6ème A",
        },
      ]

      setChildren(mockChildren)
      if (mockChildren.length > 0) {
        setSelectedChildId(mockChildren[0].id)
      }
    } catch (err) {
      console.error("Error loading children:", err)
      setError("Impossible de charger la liste de vos enfants")
    } finally {
      setIsLoading(false)
    }
  }

  const loadGrades = async (studentId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("[API] Loading grades for child:", studentId)

      const response = await gradesApi.getStudentGrades(studentId, {})

      if (!response.success) {
        setError(response.error || "Erreur lors du chargement des notes")
        return
      }

      const gradesData = response.data?.grades || []
      setGrades(gradesData)

      // Grouper par matière
      const grouped = gradesData.reduce((acc: GradesBySubject, grade: Grade) => {
        const subject = grade.subjectName || "Autre"
        if (!acc[subject]) {
          acc[subject] = []
        }
        acc[subject].push(grade)
        return acc
      }, {})

      setGradesBySubject(grouped)
    } catch (err) {
      console.error("Error loading grades:", err)
      setError("Impossible de charger les notes")
    } finally {
      setIsLoading(false)
    }
  }

  const canEditGrade = (grade: Grade): { canEdit: boolean; reason?: string } => {
    const now = new Date()
    const createdAt = new Date(grade.createdAt)
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceCreation <= 30) {
      return { canEdit: true }
    }

    return {
      canEdit: false,
      reason: `Délai de modification dépassé (${Math.floor(daysSinceCreation)} jours écoulés, limite 30 jours)`,
    }
  }

  const handleEdit = (grade: Grade) => {
    const permission = canEditGrade(grade)
    if (!permission.canEdit) {
      alert(permission.reason)
      return
    }

    setEditingGrade(grade)
    // TODO: Ouvrir un modal d'édition
    alert(`Édition de la note ${grade.evaluationTitle} : ${grade.value}/20`)
  }

  const handleDelete = async (grade: Grade) => {
    const permission = canEditGrade(grade)
    if (!permission.canEdit) {
      alert(permission.reason)
      return
    }

    if (!confirm(`Voulez-vous vraiment supprimer cette note ?\n\n${grade.evaluationTitle}\nNote : ${grade.value}/20`)) {
      return
    }

    try {
      const response = await gradesApi.deleteGrade(grade.id)

      if (response.success) {
        alert("Note supprimée avec succès")
        loadGrades(selectedChildId!)
      } else {
        alert(`Erreur : ${response.error}`)
      }
    } catch (err) {
      console.error("Error deleting grade:", err)
      alert("Impossible de supprimer la note")
    }
  }

  const toggleSubject = (subjectName: string) => {
    const newExpanded = new Set(expandedSubjects)
    if (newExpanded.has(subjectName)) {
      newExpanded.delete(subjectName)
    } else {
      newExpanded.add(subjectName)
    }
    setExpandedSubjects(newExpanded)
  }

  const getGradeColor = (value: number): string => {
    if (value >= 16) return "text-green-600 font-bold"
    if (value >= 14) return "text-green-500"
    if (value >= 12) return "text-blue-500"
    if (value >= 10) return "text-orange-500"
    return "text-red-500 font-semibold"
  }

  const selectedChild = children.find((c) => c.id === selectedChildId)

  if (isLoading && children.length === 0) {
    return (
      <DashboardLayout requiredRole="responsable">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

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
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  if (children.length === 0) {
    return (
      <DashboardLayout requiredRole="responsable">
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun enfant associé à votre compte</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="responsable">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Notes de mes enfants</h2>
            <p className="text-muted-foreground">
              Consultez et gérez les notes de vos enfants
            </p>
          </div>
        </div>

        {/* Sélecteur d'enfant */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
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

        {/* Avertissement permissions */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6 flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">
                Permissions de modification
              </p>
              <p className="text-blue-700">
                En tant que responsable, vous pouvez modifier ou supprimer les notes pendant{" "}
                <strong>30 jours</strong> après leur création. Au-delà, contactez
                l'administration.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notes par matière */}
        {Object.entries(gradesBySubject).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {selectedChild?.fullName} n'a pas encore de notes
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(gradesBySubject).map(([subjectName, subjectGrades]) => {
              const isExpanded = expandedSubjects.has(subjectName)

              return (
                <Card key={subjectName}>
                  <button
                    onClick={() => toggleSubject(subjectName)}
                    className="w-full text-left hover:bg-slate-50 transition-colors"
                  >
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                        <div>
                          <CardTitle className="text-lg">{subjectName}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {subjectGrades.length} note{subjectGrades.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                  </button>

                  {isExpanded && (
                    <CardContent className="border-t pt-4">
                      <div className="space-y-3">
                        {subjectGrades.map((grade) => {
                          const permission = canEditGrade(grade)

                          return (
                            <div
                              key={grade.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium">{grade.evaluationTitle}</h4>
                                  <Badge variant="outline">Coef. {grade.coefficient}</Badge>
                                  {!permission.canEdit && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Verrouillé
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>
                                    {new Date(grade.evalDate).toLocaleDateString("fr-FR")}
                                  </span>
                                  {grade.classAverage && (
                                    <span>Moy. classe : {grade.classAverage.toFixed(2)}</span>
                                  )}
                                  <span className="text-xs">
                                    Créé le{" "}
                                    {new Date(grade.createdAt).toLocaleDateString("fr-FR")}
                                  </span>
                                </div>

                                {grade.comment && (
                                  <p className="text-sm text-muted-foreground mt-2 italic">
                                    💬 {grade.comment}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-3 ml-4">
                                {/* Note */}
                                <div className="text-right">
                                  {grade.absent ? (
                                    <Badge variant="destructive">Absent</Badge>
                                  ) : grade.value !== null ? (
                                    <p className={`text-3xl font-bold ${getGradeColor(grade.normalizedValue || 0)}`}>
                                      {grade.value}
                                      <span className="text-lg text-muted-foreground">
                                        /{grade.maxScale}
                                      </span>
                                    </p>
                                  ) : (
                                    <Badge variant="outline">Non noté</Badge>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(grade)}
                                    disabled={!permission.canEdit}
                                    title={
                                      permission.canEdit
                                        ? "Modifier la note"
                                        : permission.reason
                                    }
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(grade)}
                                    disabled={!permission.canEdit}
                                    title={
                                      permission.canEdit
                                        ? "Supprimer la note"
                                        : permission.reason
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}