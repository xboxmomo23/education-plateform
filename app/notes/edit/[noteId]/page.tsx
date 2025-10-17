"use client"

import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NoteForm, type NoteFormData } from "@/components/notes/NoteForm"
import type { Note, ClassStats } from "@/lib/notes/types"
import { getNote, updateNote, getClassAverages, getBestWorst, getStudents, getSubjects } from "@/lib/notes/api"
import { getUserSession, type UserRole } from "@/lib/auth"
import { Clock, TrendingUp, TrendingDown, History, ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"

// Calculate if user can edit based on role and time
function canEditNote(note: Note, userRole: UserRole): { canEdit: boolean; reason?: string } {
  const now = new Date()
  const createdAt = new Date(note.createdAt)
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  const daysSinceCreation = hoursSinceCreation / 24

  if (userRole === "admin") {
    return { canEdit: true }
  }

  if (userRole === "teacher") {
    if (hoursSinceCreation <= 48) {
      return { canEdit: true }
    }
    return {
      canEdit: false,
      reason: `Modification dépassée (${Math.floor(hoursSinceCreation)}h écoulées, limite 48h). Contactez le responsable pour modifier cette note.`,
    }
  }

  if (userRole === "responsable") {
    if (daysSinceCreation <= 30) {
      return { canEdit: true }
    }
    return {
      canEdit: false,
      reason: `Modification verrouillée (${Math.floor(daysSinceCreation)} jours écoulés, limite 30 jours). Seul un administrateur peut modifier cette note.`,
    }
  }

  return { canEdit: false, reason: "Vous n'avez pas les permissions pour modifier cette note." }
}

export default function EditNotePage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.noteId as string

  const [note, setNote] = useState<Note | null>(null)
  const [stats, setStats] = useState<ClassStats | null>(null)
  const [bestWorst, setBestWorst] = useState<{ best: number; worst: number } | null>(null)
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([])
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState<string | undefined>()

  const user = getUserSession()

  useEffect(() => {
    loadData()
  }, [noteId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("[v0] Loading note:", noteId)

      // Load note
      const noteData = await getNote(noteId)
      if (!noteData) {
        setError("Note introuvable")
        return
      }
      setNote(noteData)

      console.log("[v0] Note loaded:", noteData)

      // Check permissions
      if (user) {
        const permission = canEditNote(noteData, user.role)
        setCanEdit(permission.canEdit)
        setPermissionMessage(permission.reason)
        console.log("[v0] Permission check:", permission)
      }

      // Load stats
      const [statsData, bestWorstData, studentsData, subjectsData] = await Promise.all([
        getClassAverages(noteData.subjectId, noteData.type),
        getBestWorst(noteData.subjectId),
        getStudents(),
        getSubjects(),
      ])

      setStats(statsData)
      setBestWorst(bestWorstData)
      setStudents(studentsData)
      setSubjects(subjectsData)

      console.log("[v0] Stats loaded:", { stats: statsData, bestWorst: bestWorstData })
    } catch (err) {
      console.error("[v0] Error loading note:", err)
      setError("Erreur lors du chargement de la note")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (formData: NoteFormData) => {
    if (!note || !user || !canEdit) return

    try {
      setIsSaving(true)
      setError(null)

      console.log("[v0] Updating note with data:", formData)

      // Update the note
      const updatedNote = await updateNote(
        noteId,
        {
          value: formData.value,
          coefficient: formData.coefficient,
          type: formData.type,
          date: formData.date,
          comment: formData.comment,
        },
        user.email,
        user.role,
      )

      console.log("[v0] Note updated successfully:", updatedNote)

      // Reload stats
      const [statsData, bestWorstData] = await Promise.all([
        getClassAverages(updatedNote.subjectId, updatedNote.type),
        getBestWorst(updatedNote.subjectId),
      ])

      setStats(statsData)
      setBestWorst(bestWorstData)
      setNote(updatedNote)

      // Show success
      alert("Note modifiée avec succès!")

      // Navigate back
      router.back()
    } catch (err) {
      console.error("[v0] Error updating note:", err)
      setError("Erreur lors de la modification de la note")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="teacher">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !note) {
    return (
      <DashboardLayout requiredRole="teacher">
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle className="text-red-500">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || "Note introuvable"}</p>
            <Button onClick={() => router.back()} className="w-full">
              Retour
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Modifier la note</h2>
            <p className="text-muted-foreground">
              {note.studentName} - {note.subjectName}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form - 2 columns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Informations de la note</CardTitle>
                <CardDescription>Modifiez les détails de l'évaluation</CardDescription>
              </CardHeader>
              <CardContent>
                <NoteForm
                  note={note}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isLoading={isSaving}
                  students={students}
                  subjects={subjects}
                  readOnly={!canEdit}
                  showPermissionMessage={permissionMessage}
                />
              </CardContent>
            </Card>
          </div>

          {/* Stats and History - 1 column */}
          <div className="space-y-4">
            {/* Time info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Créée le</p>
                  <p className="font-medium">
                    {new Date(note.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Par</p>
                  <p className="font-medium">{note.createdBy}</p>
                </div>
                {!canEdit && (
                  <Badge variant="secondary" className="mt-2">
                    <Clock className="h-3 w-3 mr-1" />
                    Verrouillée
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Class stats */}
            {stats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Statistiques de la classe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Moyenne</span>
                    <span className="text-lg font-bold">{stats.average.toFixed(2)}/20</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Note min</span>
                    <span className="text-lg font-medium text-red-500">{stats.min}/20</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Note max</span>
                    <span className="text-lg font-medium text-green-500">{stats.max}/20</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Best/Worst in subject */}
            {bestWorst && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Dans la matière</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Meilleure
                    </span>
                    <span className="text-lg font-medium text-green-500">{bestWorst.best}/20</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" />
                      Plus basse
                    </span>
                    <span className="text-lg font-medium text-red-500">{bestWorst.worst}/20</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History */}
            {note.history.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Historique ({note.history.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {note.history.slice(-3).map((entry, i) => (
                      <div key={i} className="text-sm border-l-2 border-primary pl-3 py-1">
                        <p className="font-medium">{entry.by}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.when).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="mt-1 space-y-1">
                          {Object.entries(entry.changes).map(([key, change]) => (
                            <p key={key} className="text-xs">
                              <span className="text-muted-foreground">{key}:</span>{" "}
                              <span className="line-through">{String(change.from)}</span> →{" "}
                              <span className="font-medium">{String(change.to)}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
