"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Edit2, Calendar, BookOpen } from "lucide-react"
import { useState, useEffect } from "react"
import { CreateEvaluationModal } from "@/components/notes/CreateEvaluationModal"
import { GradeEntryModal } from "@/components/notes/GradeEntryModal"
import { gradesApi } from "@/lib/api/grade"
import { coursesApi, type Course } from "@/lib/api/course"

interface Evaluation {
  id: string
  courseId: string
  title: string
  type: string
  coefficient: number
  maxScale: number
  evalDate: string
  description?: string
}

export default function ProfesseurNotesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showCreateEvalModal, setShowCreateEvalModal] = useState(false)
  const [showGradeEntryModal, setShowGradeEntryModal] = useState(false)
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null)

  // Charger les cours au montage
  useEffect(() => {
    loadCourses()
  }, [])

  // Charger les évaluations quand le cours change
  useEffect(() => {
    if (selectedCourseId) {
      loadEvaluations()
    }
  }, [selectedCourseId])

  const loadCourses = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await coursesApi.getMyCourses()

      if (response.success && response.data) {
        setCourses(response.data)
        
        // Sélectionner le premier cours par défaut
        if (response.data.length > 0) {
          setSelectedCourseId(response.data[0].id)
        }
      } else {
        setError(response.error || "Erreur lors du chargement des cours")
      }
    } catch (err) {
      console.error("Erreur chargement cours:", err)
      setError("Impossible de charger vos cours")
    } finally {
      setIsLoading(false)
    }
  }

  const loadEvaluations = async () => {
    if (!selectedCourseId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await gradesApi.getEvaluations({ courseId: selectedCourseId })

      if (response.success) {
        setEvaluations(response.data || [])
      } else {
        setError(response.error || "Erreur lors du chargement")
      }
    } catch (err) {
      console.error("Erreur chargement évaluations:", err)
      setError("Impossible de charger les évaluations")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateEvaluation = () => {
    if (!selectedCourseId) {
      alert("Veuillez sélectionner un cours")
      return
    }
    setShowCreateEvalModal(true)
  }

  const handleEvaluationCreated = (evaluationId: string) => {
    loadEvaluations()
  }

  const handleOpenGradeEntry = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation)
    setShowGradeEntryModal(true)
  }

  const handleGradeEntryClosed = () => {
    setShowGradeEntryModal(false)
    setSelectedEvaluation(null)
  }

  const handleGradesSaved = () => {
    loadEvaluations()
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      controle: "Contrôle",
      devoir: "Devoir",
      participation: "Participation",
      examen: "Examen",
    }
    return labels[type] || type
  }

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      controle: "bg-blue-100 text-blue-700",
      devoir: "bg-green-100 text-green-700",
      participation: "bg-purple-100 text-purple-700",
      examen: "bg-red-100 text-red-700",
    }
    return colors[type] || "bg-gray-100 text-gray-700"
  }

  // Trouver le cours sélectionné
  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  if (isLoading && courses.length === 0) {
    return (
      <DashboardLayout requiredRole="teacher">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error && courses.length === 0) {
    return (
      <DashboardLayout requiredRole="teacher">
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-red-500">Erreur</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadCourses} className="w-full">
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (courses.length === 0) {
    return (
      <DashboardLayout requiredRole="teacher">
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Aucun cours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Vous n'avez pas encore de cours assignés. Contactez l'administrateur.
              </p>
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
            <h2 className="text-3xl font-bold tracking-tight">Mes évaluations</h2>
            <p className="text-muted-foreground">Gérer les évaluations et saisir les notes</p>
          </div>
          <Button onClick={handleCreateEvaluation} disabled={!selectedCourseId}>
            <Plus className="mr-2 h-4 w-4" />
            Créer une évaluation
          </Button>
        </div>

        {/* Sélecteur de cours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Sélectionner un cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full max-w-2xl rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedCourseId || ""}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.subject_name} - {course.class_label} ({course.academic_year})
                </option>
              ))}
            </select>
            
            {selectedCourse && (
              <div className="mt-3 flex gap-2">
                <Badge variant="outline">{selectedCourse.subject_name}</Badge>
                <Badge variant="outline">{selectedCourse.class_label}</Badge>
                <Badge variant="secondary">{selectedCourse.academic_year}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des évaluations */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Évaluations ({evaluations.length})
          </h3>

          {evaluations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Aucune évaluation pour ce cours
                </p>
                <Button onClick={handleCreateEvaluation}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer ma première évaluation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {evaluations.map((evaluation) => (
                <Card key={evaluation.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{evaluation.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {evaluation.description || "Pas de description"}
                        </CardDescription>
                      </div>
                      <Badge className={getTypeBadgeColor(evaluation.type)}>
                        {getTypeLabel(evaluation.type)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(evaluation.evalDate).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Coefficient</span>
                      <Badge variant="outline">{evaluation.coefficient}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Barème</span>
                      <Badge variant="outline">/{evaluation.maxScale}</Badge>
                    </div>

                    <Button
                      className="w-full mt-4"
                      onClick={() => handleOpenGradeEntry(evaluation)}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Saisir les notes
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Modal de création d'évaluation */}
        {showCreateEvalModal && selectedCourseId && (
          <CreateEvaluationModal
            courseId={selectedCourseId}
            onClose={() => setShowCreateEvalModal(false)}
            onSuccess={handleEvaluationCreated}
          />
        )}

        {/* Modal de saisie de notes */}
        {showGradeEntryModal && selectedEvaluation && (
          <GradeEntryModal
            evaluationId={selectedEvaluation.id}
            courseId={selectedEvaluation.courseId}
            evaluationTitle={selectedEvaluation.title}
            maxScale={selectedEvaluation.maxScale}
            onClose={handleGradeEntryClosed}
            onSuccess={handleGradesSaved}
          />
        )}
      </div>
    </DashboardLayout>
  )
}