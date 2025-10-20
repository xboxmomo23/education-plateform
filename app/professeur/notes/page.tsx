"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Plus, Edit, Trash2, AlertTriangle, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import { EditNoteModal } from "@/components/notes/EditNoteModal"
import { GradeEntryModal } from "@/components/notes/GradeEntryModal"
import { gradesApi } from "@/lib/api/grade"

// Types
interface Grade {
  id: string
  studentId: string
  value: number
  date: string
  type: "Contrôle" | "Devoir" | "Participation" | "Examen"
  coefficient: number
  subject: string
  enteredBy: string
  enteredAt: string
  modifiedBy?: string
  modifiedAt?: string
  isLocked: boolean
}

export default function ProfesseurNotesPage() {
  const [selectedClass, setSelectedClass] = useState<string>("Terminale A")
  const [selectedSubject, setSelectedSubject] = useState<string>("Mathématiques")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [grades, setGrades] = useState<Grade[]>([])
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  
  // États pour le chargement et les erreurs
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null)

  // ✅ NOUVEAU : États pour le modal de saisie de notes
  const [showGradeEntryModal, setShowGradeEntryModal] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // Charger les évaluations au montage
  useEffect(() => {
    loadEvaluations()
  }, [selectedClass, selectedSubject])

  // Charger les notes quand une évaluation est sélectionnée
  useEffect(() => {
    if (selectedEvaluationId) {
      loadGradesForEvaluation(selectedEvaluationId)
    }
  }, [selectedEvaluationId])

  // Fonction : Charger les évaluations du professeur
  const loadEvaluations = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await gradesApi.getEvaluations({
        type: selectedType !== "all" ? selectedType : undefined,
      })

      if (response.success) {
        setEvaluations(response.data || [])
        
        if (response.data && response.data.length > 0) {
          setSelectedEvaluationId(response.data[0].id)
        }
      } else {
        setError("Erreur lors du chargement des évaluations")
      }
    } catch (err) {
      console.error("Erreur chargement évaluations:", err)
      setError("Impossible de charger les évaluations")
    } finally {
      setIsLoading(false)
    }
  }

  // Fonction : Charger les notes d'une évaluation
  const loadGradesForEvaluation = async (evaluationId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await gradesApi.getEvaluation(evaluationId)

      if (response.success) {
        const evaluation = response.data.evaluation
        const gradesData = response.data.grades

        const transformedGrades: Grade[] = gradesData.map((g: any) => ({
          id: g.id,
          studentId: g.student_id,
          value: g.value || 0,
          date: evaluation.eval_date,
          type: mapEvaluationType(evaluation.type),
          coefficient: evaluation.coefficient,
          subject: evaluation.course_subject_name || selectedSubject,
          enteredBy: g.created_by,
          enteredAt: g.created_at,
          isLocked: !canModifyGrade({ created_at: g.created_at }),
        }))

        setGrades(transformedGrades)
      } else {
        setError("Erreur lors du chargement des notes")
      }
    } catch (err) {
      console.error("Erreur chargement notes:", err)
      setError("Impossible de charger les notes")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper : Mapper les types d'évaluation
  const mapEvaluationType = (type: string): Grade["type"] => {
    const mapping: Record<string, Grade["type"]> = {
      controle: "Contrôle",
      devoir: "Devoir",
      participation: "Participation",
      examen: "Examen",
    }
    return mapping[type] || "Contrôle"
  }

  // Fonction : Vérifier si une note peut être modifiée (48h)
  function canModifyGrade(grade: { created_at: string }): boolean {
    const enteredDate = new Date(grade.created_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - enteredDate.getTime()) / (1000 * 60 * 60)
    return hoursDiff < 48
  }

  // Fonction : Calculer les statistiques
  function calculateStats(grades: Grade[]) {
    if (grades.length === 0) return { average: 0, min: 0, max: 0 }
    const values = grades.map((g) => g.value)
    return {
      average: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    }
  }

  // Filtrer les notes
  const filteredGrades = grades.filter((grade) => {
    const matchesType = selectedType === "all" || grade.type === selectedType
    const matchesSearch = grade.studentId.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  // Calculer les statistiques
  const stats = calculateStats(filteredGrades)

  // Fonction : Supprimer une note
  const deleteGrade = async (gradeId: string) => {
    const grade = grades.find((g) => g.id === gradeId)
    if (grade && !canModifyGrade({ created_at: grade.enteredAt })) {
      alert("Cette note ne peut plus être supprimée (délai de 48h dépassé)")
      return
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      return
    }

    try {
      setIsLoading(true)

      const response = await gradesApi.deleteGrade(gradeId)

      if (response.success) {
        alert("Note supprimée avec succès !")
        setGrades(grades.filter((g) => g.id !== gradeId))
      } else {
        alert(`Erreur: ${response.error}`)
      }
    } catch (err) {
      console.error("Erreur suppression note:", err)
      alert("Impossible de supprimer la note")
    } finally {
      setIsLoading(false)
    }
  }

  // Exporter les notes
  const exportGrades = (format: "pdf" | "csv") => {
    console.log("Exporting grades as:", format)
    alert(`Export ${format.toUpperCase()} en cours de développement`)
  }

  // Alertes pour notes basses
  const lowGrades = filteredGrades.filter((g) => g.value < 8)

  const refreshGrades = async () => {
    if (selectedEvaluationId) {
      await loadGradesForEvaluation(selectedEvaluationId)
    }
    setEditingNoteId(null)
  }

  // Afficher un loader pendant le chargement
  if (isLoading && grades.length === 0) {
    return (
      <DashboardLayout requiredRole="teacher">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Chargement des notes...</p>
        </div>
      </DashboardLayout>
    )
  }

  // Afficher les erreurs
  if (error) {
    return (
      <DashboardLayout requiredRole="teacher">
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-red-500">Erreur</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => loadEvaluations()} className="w-full">
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestion des notes</h2>
            <p className="text-muted-foreground">Saisir et gérer les notes de vos élèves</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportGrades("pdf")}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportGrades("csv")}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button 
              onClick={() => {
                // TODO: Récupérer le vrai courseId depuis l'évaluation sélectionnée
                setSelectedCourseId("test-course-id") 
                setShowGradeEntryModal(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Saisir des notes
            </Button>
          </div>
        </div>

        {/* Alertes notes basses */}
        {lowGrades.length > 0 && (
          <Card className="border-red-500 bg-red-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-red-500">Alertes notes basses</CardTitle>
              </div>
              <CardDescription>
                {lowGrades.length} note{lowGrades.length > 1 ? "s" : ""} inférieure{lowGrades.length > 1 ? "s" : ""} à 8/20
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowGrades.map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between rounded-lg border p-2">
                    <span className="text-sm">Élève {grade.studentId} - {grade.type}</span>
                    <Badge variant="destructive">{grade.value}/20</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtres */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classe</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="Terminale A">Terminale A</option>
                <option value="Première B">Première B</option>
                <option value="Seconde C">Seconde C</option>
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matière</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="Mathématiques">Mathématiques</option>
                <option value="Français">Français</option>
                <option value="Histoire-Géographie">Histoire-Géographie</option>
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Type d'évaluation</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">Tous</option>
                <option value="Contrôle">Contrôle</option>
                <option value="Devoir">Devoir</option>
                <option value="Participation">Participation</option>
                <option value="Examen">Examen</option>
              </select>
            </CardContent>
          </Card>
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Moyenne</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.average.toFixed(2)}/20</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Note minimale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.min}/20</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Note maximale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.max}/20</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notes ({filteredGrades.length})</CardTitle>
                <CardDescription>Liste des notes pour la classe sélectionnée</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredGrades.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Aucune note trouvée</div>
            ) : (
              <div className="space-y-3">
                {filteredGrades.map((grade) => {
                  const canModify = canModifyGrade({ created_at: grade.enteredAt })

                  return (
                    <div key={grade.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-sm font-medium text-primary">E</span>
                          </div>
                          <div>
                            <p className="font-medium">Élève {grade.studentId}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{grade.type}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(grade.date).toLocaleDateString("fr-FR")}
                              </span>
                              {!canModify && (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  Verrouillée
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold">{grade.value}/20</div>
                          <p className="text-xs text-muted-foreground">Coef. {grade.coefficient}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={!canModify}
                            onClick={() => setEditingNoteId(grade.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={!canModify}
                            onClick={() => deleteGrade(grade.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal d'édition de note */}
        {editingNoteId && (
          <EditNoteModal noteId={editingNoteId} onClose={() => setEditingNoteId(null)} onSuccess={refreshGrades} />
        )}

        {/* ✅ NOUVEAU : Modal de saisie de notes */}
        {showGradeEntryModal && selectedEvaluationId && selectedCourseId && (
          <GradeEntryModal
            evaluationId={selectedEvaluationId}
            courseId={selectedCourseId}
            evaluationTitle="Contrôle du 20 octobre"
            maxScale={20}
            onClose={() => setShowGradeEntryModal(false)}
            onSuccess={refreshGrades}
          />
        )}
      </div>
    </DashboardLayout>
  )
}