"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, X, Search } from "lucide-react"
import { gradesApi } from "@/lib/api/grade"

interface Student {
  student_id: string
  student_name: string
  student_no: string
  grade_id?: string
  value?: number
  absent?: boolean
  comment?: string
}

interface GradeEntryModalProps {
  evaluationId: string
  courseId: string
  evaluationTitle: string
  maxScale: number
  onClose: () => void
  onSuccess: () => void
}

export function GradeEntryModal({
  evaluationId,
  courseId,
  evaluationTitle,
  maxScale,
  onClose,
  onSuccess,
}: GradeEntryModalProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Record<string, { value: string; absent: boolean; comment: string }>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Charger les élèves au montage
  useEffect(() => {
    loadStudents()
  }, [courseId, evaluationId])

  const loadStudents = async () => {
    try {
      setIsLoading(true)
      const response = await gradesApi.getCourseStudents(courseId, evaluationId)

      if (response.success && response.data) {
        setStudents(response.data)

        // Pré-remplir les notes existantes
        const existingGrades: Record<string, any> = {}
        response.data.forEach((student: Student) => {
          existingGrades[student.student_id] = {
            value: student.value?.toString() || "",
            absent: student.absent || false,
            comment: student.comment || "",
          }
        })
        setGrades(existingGrades)
      }
    } catch (error) {
      console.error("Erreur chargement élèves:", error)
      alert("Impossible de charger la liste des élèves")
    } finally {
      setIsLoading(false)
    }
  }

  const updateGrade = (studentId: string, field: string, value: any) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }))
  }

  const handleSubmit = async () => {
    try {
      setIsSaving(true)

      // Préparer les données
      const gradesToSave = Object.entries(grades)
        .filter(([_, data]) => data.value !== "" || data.absent)
        .map(([studentId, data]) => ({
          studentId,
          value: data.absent ? null : parseFloat(data.value),
          absent: data.absent,
          comment: data.comment || null,
        }))

      if (gradesToSave.length === 0) {
        alert("Aucune note à enregistrer")
        setIsSaving(false)
        return
      }

      // Envoyer au backend
      const response = await gradesApi.createOrUpdateGrades(evaluationId, gradesToSave)

      if (response.success) {
        alert(`${gradesToSave.length} note(s) enregistrée(s) avec succès !`)
        onSuccess()
        onClose()
      } else {
        alert(`Erreur : ${response.error}`)
      }
    } catch (error) {
      console.error("Erreur sauvegarde notes:", error)
      alert("Impossible d'enregistrer les notes")
    } finally {
      setIsSaving(false)
    }
  }

  // Filtrer les élèves selon la recherche
  const filteredStudents = students.filter((student) =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_no.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Chargement des élèves...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Saisie des notes</CardTitle>
              <CardDescription>{evaluationTitle}</CardDescription>
              <Badge variant="outline" className="mt-2">
                Barème : /{maxScale}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Barre de recherche */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un élève..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Aucun élève trouvé
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => {
                const grade = grades[student.student_id] || { value: "", absent: false, comment: "" }

                return (
                  <div key={student.student_id} className="flex items-center gap-3 rounded-lg border p-3">
                    {/* Info élève */}
                    <div className="flex-1">
                      <p className="font-medium">{student.student_name}</p>
                      <p className="text-xs text-muted-foreground">N° {student.student_no}</p>
                    </div>

                    {/* Checkbox Absent */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={grade.absent}
                        onChange={(e) => updateGrade(student.student_id, "absent", e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Absent</span>
                    </label>

                    {/* Input Note */}
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        max={maxScale}
                        step="0.5"
                        placeholder={`/${maxScale}`}
                        value={grade.value}
                        onChange={(e) => updateGrade(student.student_id, "value", e.target.value)}
                        disabled={grade.absent}
                        className="text-center"
                      />
                    </div>

                    {/* Input Commentaire */}
                    <div className="w-48">
                      <Input
                        type="text"
                        placeholder="Commentaire..."
                        value={grade.comment}
                        onChange={(e) => updateGrade(student.student_id, "comment", e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    {/* Indicateur note existante */}
                    {student.grade_id && (
                      <Badge variant="secondary" className="text-xs">
                        Modif.
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>

        {/* Footer avec actions */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              {Object.values(grades).filter((g) => g.value !== "" || g.absent).length} note(s) à enregistrer
            </p>
            <p className="text-sm text-muted-foreground">
              Total : {filteredStudents.length} élève(s)
            </p>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSubmit} disabled={isSaving}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {isSaving ? "Enregistrement..." : "Enregistrer toutes les notes"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}