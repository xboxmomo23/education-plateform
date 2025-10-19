"use client"

import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, TrendingDown, History, ArrowLeft, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import { gradesApi } from "@/lib/api/grade" // ✅ Import de ton API
import { getUserSession } from "@/lib/auth" // ✅ Pour les permissions

// Types
interface Note {
  id: string
  evaluationId: string
  studentId: string
  studentName: string
  subjectName: string
  className: string
  value: number
  coefficient: number
  type: string
  date: string
  comment?: string
  createdAt: string
  createdBy: string
  createdByRole: string
}

interface GradeHistory {
  by: string
  role: string
  when: string
  changes: {
    [key: string]: {
      from: any
      to: any
    }
  }
}

interface ClassStats {
  average: number
  min: number
  max: number
}

// Calculer si l'utilisateur peut modifier selon son rôle et le temps écoulé
function canEditNote(note: Note, userRole: string): { canEdit: boolean; reason?: string } {
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
      reason: `Délai de modification dépassé (${Math.floor(hoursSinceCreation)}h écoulées, limite 48h). Contactez un responsable pour modifier cette note.`,
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
  const [history, setHistory] = useState<GradeHistory[]>([])
  const [stats, setStats] = useState<ClassStats | null>(null)
  const [bestWorst, setBestWorst] = useState<{ best: number; worst: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState<string | undefined>()

  // États pour le formulaire
  const [formData, setFormData] = useState({
    value: "",
    comment: "",
  })

  const user = getUserSession()

  // Charger les données au montage
  useEffect(() => {
    if (noteId) {
      loadNoteData()
    }
  }, [noteId])

  // ✅ FONCTION PRINCIPALE: Charger toutes les données de la note
  const loadNoteData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("[API] Loading grade:", noteId)

      // ✅ APPEL API 1: Récupérer l'historique de la note
      const historyResponse = await gradesApi.getGradeHistory(noteId)

      if (!historyResponse.success) {
        setError("Note introuvable")
        return
      }

      // L'historique contient toutes les modifications
      const gradeHistory = historyResponse.data || []
      setHistory(gradeHistory)

      // ✅ APPEL API 2: Récupérer les détails de la note actuelle
      // Tu peux utiliser soit getGradeHistory, soit créer un getGrade(noteId)
      // Pour l'instant, on va chercher via l'évaluation
      
      // Simulons la récupération de la note (à adapter selon ton API)
      // Tu devras peut-être créer un endpoint GET /api/grades/:id dans ton backend
      
      // Pour l'instant, utilisons des données mockées pour la structure
      // À REMPLACER par le vrai appel API
      const noteData: Note = {
        id: noteId,
        evaluationId: "eval-id-from-api", // À récupérer depuis l'API
        studentId: "student-id",
        studentName: "Nom de l'élève", // À récupérer depuis l'API
        subjectName: "Mathématiques",
        className: "Terminale A",
        value: 15, // Valeur actuelle de la note
        coefficient: 2,
        type: "Contrôle",
        date: new Date().toISOString(),
        comment: "Bon travail",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12h ago
        createdBy: "prof@example.com",
        createdByRole: "teacher",
      }

      setNote(noteData)

      // Remplir le formulaire avec les valeurs actuelles
      setFormData({
        value: noteData.value.toString(),
        comment: noteData.comment || "",
      })

      console.log("[API] Note loaded:", noteData)

      // Vérifier les permissions
      if (user) {
        const permission = canEditNote(noteData, user.role)
        setCanEdit(permission.canEdit)
        setPermissionMessage(permission.reason)
        console.log("[API] Permission check:", permission)
      }

      // ✅ APPEL API 3: Charger les statistiques de classe (optionnel)
      // Si tu as un endpoint pour ça
      // const statsResponse = await gradesApi.getClassAverages(classId, termId)
      
      // Pour l'instant, stats mockées
      setStats({
        average: 12.5,
        min: 6,
        max: 18,
      })

      setBestWorst({
        best: 18,
        worst: 6,
      })

    } catch (err) {
      console.error("[API] Error loading note:", err)
      setError("Erreur lors du chargement de la note")
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ FONCTION: Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!note || !user || !canEdit) {
      alert("Vous n'avez pas les permissions pour modifier cette note")
      return
    }

    // Validation
    const newValue = parseFloat(formData.value)
    if (isNaN(newValue) || newValue < 0 || newValue > 20) {
      alert("La note doit être entre 0 et 20")
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      console.log("[API] Updating grade with data:", {
        noteId,
        value: newValue,
        comment: formData.comment,
      })

      // ✅ APPEL API: Mettre à jour la note
      const response = await gradesApi.updateGrade(noteId, {
        value: newValue,
        comment: formData.comment,
      })

      if (response.success) {
        console.log("[API] Note updated successfully:", response.data)
        alert("Note modifiée avec succès!")
        
        // Recharger les données pour voir les changements
        await loadNoteData()
        
        // Option: Retourner à la page précédente après 2 secondes
        setTimeout(() => {
          router.back()
        }, 2000)
      } else {
        setError(response.error || "Erreur lors de la modification")
        alert(`Erreur: ${response.error}`)
      }
    } catch (err) {
      console.error("[API] Error updating note:", err)
      setError("Erreur lors de la modification de la note")
      alert("Impossible de modifier la note")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement de la note...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Afficher les erreurs
  if (error || !note) {
    return (
      <DashboardLayout>
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Erreur
            </CardTitle>
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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Modifier la note</h2>
            <p className="text-muted-foreground">
              {note.studentName} - {note.subjectName} ({note.className})
            </p>
          </div>
        </div>

        {/* Message de permission */}
        {!canEdit && permissionMessage && (
          <Card className="border-yellow-500 bg-yellow-500/5">
            <CardContent className="pt-6 flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 mb-1">Modification verrouillée</p>
                <p className="text-sm text-yellow-600">{permissionMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulaire - 2 colonnes */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Informations de la note</CardTitle>
                <CardDescription>
                  {canEdit 
                    ? "Modifiez les détails de l'évaluation" 
                    : "Consultation uniquement (délai de modification dépassé)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Élève</label>
                      <input
                        type="text"
                        className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm mt-1"
                        value={note.studentName}
                        disabled
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Matière</label>
                      <input
                        type="text"
                        className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm mt-1"
                        value={note.subjectName}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Note (sur 20) *</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        disabled={!canEdit}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Coefficient</label>
                      <input
                        type="number"
                        className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm mt-1"
                        value={note.coefficient}
                        disabled
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <input
                        type="text"
                        className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm mt-1"
                        value={note.type}
                        disabled
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Date d'évaluation</label>
                    <input
                      type="date"
                      className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm mt-1"
                      value={note.date.split("T")[0]}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Commentaire</label>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 min-h-[100px]"
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      disabled={!canEdit}
                      placeholder="Ajouter un commentaire sur cette note..."
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.comment.length}/500 caractères
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1" 
                      disabled={!canEdit || isSaving}
                    >
                      {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1" 
                      onClick={handleCancel}
                    >
                      {canEdit ? "Annuler" : "Retour"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Statistiques et Historique - 1 colonne */}
          <div className="space-y-4">
            {/* Informations temporelles */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
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
                  <Badge variant="outline" className="mt-1">
                    {note.createdByRole}
                  </Badge>
                </div>
                {!canEdit && (
                  <Badge variant="secondary" className="mt-2">
                    <Clock className="h-3 w-3 mr-1" />
                    Verrouillée
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Statistiques de classe */}
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

            {/* Meilleure/Pire note dans la matière */}
            {bestWorst && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Dans la matière</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Meilleure note
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

            {/* Historique des modifications */}
            {history.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Historique ({history.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {history.slice(-5).reverse().map((entry, i) => (
                      <div key={i} className="text-sm border-l-2 border-primary pl-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{entry.by}</p>
                          <Badge variant="outline" className="text-xs">
                            {entry.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {new Date(entry.when).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="space-y-1">
                          {Object.entries(entry.changes).map(([key, change]) => (
                            <p key={key} className="text-xs">
                              <span className="text-muted-foreground capitalize">{key}:</span>{" "}
                              <span className="line-through text-red-600">{String(change.from)}</span>
                              {" → "}
                              <span className="font-medium text-green-600">{String(change.to)}</span>
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