"use client"

import { useState, useEffect } from "react"
import { X, Save, Loader2, User, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { reportCardApi } from "@/lib/api/reportCard"
import { gradesApi } from "@/lib/api/grade"

interface Student {
  id: string
  fullName: string
  appreciation: string
}

interface AppreciationsModalProps {
  courseId: string
  termId: string
  courseName: string
  className: string
  onClose: () => void
}

export function AppreciationsModal({
  courseId,
  termId,
  courseName,
  className,
  onClose,
}: AppreciationsModalProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStudents()
  }, [courseId, termId])

  const loadStudents = async () => {
    try {
        setIsLoading(true)
        setError(null)

        const response = await gradesApi.getCourseStudents(courseId)

        if (!response.success || !response.data) {
          setError(response.error || "Erreur lors du chargement des élèves")
          setStudents([])
          return
        }

        const studentsList: Student[] = (response.data || []).map((s: any) => ({
          id: s.student_id || s.id,
          fullName: s.student_name || s.full_name || s.fullName || "Élève",
          appreciation: "",
        }))

        const withAppreciations = await Promise.all(
          studentsList.map(async (student) => {
            try {
              const appreciationsResponse = await reportCardApi.getStudentAppreciations(
                student.id,
                termId
              )
              if (appreciationsResponse.success && appreciationsResponse.data) {
                const subjectApp = appreciationsResponse.data.subjectAppreciations.find(
                  (a) => a.courseId === courseId
                )
                if (subjectApp) {
                  return { ...student, appreciation: subjectApp.appreciation }
                }
              }
            } catch (err) {
              console.warn(
                "Erreur chargement appréciations élève",
                student.id,
                err
              )
            }
            return student
          })
        )

        withAppreciations.sort((a, b) => a.fullName.localeCompare(b.fullName))
        setStudents(withAppreciations)
    } catch (err) {
        console.error("Erreur chargement élèves:", err)
        setError("Impossible de charger les élèves")
    } finally {
        setIsLoading(false)
    }
}


  const handleAppreciationChange = (studentId: string, value: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, appreciation: value } : s))
    )
  }

  const handleSaveAppreciation = async (student: Student) => {
    try {
      setSavingStudentId(student.id)

      const response = await reportCardApi.setSubjectAppreciation(
        student.id,
        termId,
        courseId,
        student.appreciation
      )

      if (!response.success) {
        alert(response.error || "Erreur lors de l'enregistrement")
      }
    } catch (err) {
      console.error("Erreur sauvegarde:", err)
      alert("Erreur lors de l'enregistrement")
    } finally {
      setSavingStudentId(null)
    }
  }

  const handleSaveAll = async () => {
    for (const student of students) {
      if (student.appreciation.trim()) {
        await handleSaveAppreciation(student)
      }
    }
    alert("Toutes les appréciations ont été enregistrées")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Appréciations
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {courseName} - {className}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <Button onClick={loadStudents} className="mt-4">
                Réessayer
              </Button>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Aucun élève trouvé pour ce cours.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Les élèves apparaîtront ici une fois qu'ils auront des notes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {students.map((student) => (
                <Card key={student.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar / Nom */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium">{student.fullName}</p>
                        </div>
                      </div>

                      {/* Textarea appréciation */}
                      <div className="flex-1">
                        <textarea
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                          rows={2}
                          placeholder="Saisir une appréciation..."
                          value={student.appreciation}
                          onChange={(e) =>
                            handleAppreciationChange(student.id, e.target.value)
                          }
                        />
                      </div>

                      {/* Bouton sauvegarder */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveAppreciation(student)}
                        disabled={savingStudentId === student.id}
                      >
                        {savingStudentId === student.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-slate-50">
          <p className="text-sm text-muted-foreground">
            {students.length} élève{students.length > 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button onClick={handleSaveAll} disabled={students.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              Tout enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
