"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Search, Plus, Edit, Trash2, AlertTriangle, Clock, CheckCircle, History } from "lucide-react"
import { useState } from "react"
import { EditNoteModal } from "@/components/notes/EditNoteModal"

// Types
interface Student {
  id: string
  name: string
  class: string
}

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

// Données de démonstration
const DEMO_STUDENTS: Student[] = [
  { id: "1", name: "Alice Dupont", class: "Terminale A" },
  { id: "2", name: "Bob Martin", class: "Terminale A" },
  { id: "3", name: "Claire Bernard", class: "Terminale A" },
  { id: "4", name: "David Petit", class: "Première B" },
  { id: "5", name: "Emma Dubois", class: "Première B" },
]

const DEMO_GRADES: Grade[] = [
  {
    id: "1",
    studentId: "1",
    value: 15,
    date: "2025-10-10",
    type: "Contrôle",
    coefficient: 2,
    subject: "Mathématiques",
    enteredBy: "Prof. Demo",
    enteredAt: "2025-10-10T14:30:00",
    isLocked: false,
  },
  {
    id: "2",
    studentId: "2",
    value: 12,
    date: "2025-10-10",
    type: "Contrôle",
    coefficient: 2,
    subject: "Mathématiques",
    enteredBy: "Prof. Demo",
    enteredAt: "2025-10-10T14:30:00",
    isLocked: false,
  },
  {
    id: "3",
    studentId: "1",
    value: 17,
    date: "2025-10-01",
    type: "Devoir",
    coefficient: 1,
    subject: "Mathématiques",
    enteredBy: "Prof. Demo",
    enteredAt: "2025-10-01T10:00:00",
    isLocked: true,
  },
  {
    id: "4",
    studentId: "3",
    value: 8,
    date: "2025-10-10",
    type: "Contrôle",
    coefficient: 2,
    subject: "Mathématiques",
    enteredBy: "Prof. Demo",
    enteredAt: "2025-10-10T14:30:00",
    isLocked: false,
  },
]

// Fonction pour vérifier si une note peut être modifiée (48h)
function canModifyGrade(grade: Grade): boolean {
  if (grade.isLocked) return false
  const enteredDate = new Date(grade.enteredAt)
  const now = new Date()
  const hoursDiff = (now.getTime() - enteredDate.getTime()) / (1000 * 60 * 60)
  return hoursDiff < 48
}

// Fonction pour calculer les statistiques
function calculateStats(grades: Grade[]) {
  if (grades.length === 0) return { average: 0, min: 0, max: 0 }
  const values = grades.map((g) => g.value)
  return {
    average: values.reduce((sum, v) => sum + v, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

export default function ProfesseurNotesPage() {
  const [selectedClass, setSelectedClass] = useState<string>("Terminale A")
  const [selectedSubject, setSelectedSubject] = useState<string>("Mathématiques")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [grades, setGrades] = useState<Grade[]>(DEMO_GRADES)
  const [newGrade, setNewGrade] = useState({
    studentId: "",
    value: "",
    type: "Contrôle" as Grade["type"],
    coefficient: "1",
    date: new Date().toISOString().split("T")[0],
  })
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  // Filtrer les notes
  const filteredGrades = grades.filter((grade) => {
    const student = DEMO_STUDENTS.find((s) => s.id === grade.studentId)
    const matchesClass = student?.class === selectedClass
    const matchesSubject = grade.subject === selectedSubject
    const matchesType = selectedType === "all" || grade.type === selectedType
    const matchesSearch = student?.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesClass && matchesSubject && matchesType && matchesSearch
  })

  // Calculer les statistiques
  const stats = calculateStats(filteredGrades)

  // Ajouter une note
  const addGrade = () => {
    if (!newGrade.studentId || !newGrade.value) {
      alert("Veuillez remplir tous les champs")
      return
    }

    const grade: Grade = {
      id: Date.now().toString(),
      studentId: newGrade.studentId,
      value: Number.parseFloat(newGrade.value),
      date: newGrade.date,
      type: newGrade.type,
      coefficient: Number.parseInt(newGrade.coefficient),
      subject: selectedSubject,
      enteredBy: "Prof. Demo",
      enteredAt: new Date().toISOString(),
      isLocked: false,
    }

    setGrades([...grades, grade])
    setShowAddModal(false)
    setNewGrade({
      studentId: "",
      value: "",
      type: "Contrôle",
      coefficient: "1",
      date: new Date().toISOString().split("T")[0],
    })
  }

  // Supprimer une note
  const deleteGrade = (gradeId: string) => {
    const grade = grades.find((g) => g.id === gradeId)
    if (grade && !canModifyGrade(grade)) {
      alert("Cette note ne peut plus être supprimée (délai de 48h dépassé)")
      return
    }
    if (confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      setGrades(grades.filter((g) => g.id !== gradeId))
    }
  }

  // Exporter les notes
  const exportGrades = (format: "pdf" | "csv") => {
    console.log("[v0] Exporting grades as:", format)
    alert(`Export ${format.toUpperCase()} en cours de développement`)
  }

  // Alertes pour notes basses
  const lowGrades = filteredGrades.filter((g) => g.value < 8)

  const refreshGrades = async () => {
    setEditingNoteId(null)
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
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une note
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
                {lowGrades.length} note{lowGrades.length > 1 ? "s" : ""} inférieure{lowGrades.length > 1 ? "s" : ""} à
                8/20
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowGrades.map((grade) => {
                  const student = DEMO_STUDENTS.find((s) => s.id === grade.studentId)
                  return (
                    <div key={grade.id} className="flex items-center justify-between rounded-lg border p-2">
                      <span className="text-sm">
                        {student?.name} - {grade.type}
                      </span>
                      <Badge variant="destructive">{grade.value}/20</Badge>
                    </div>
                  )
                })}
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

        {/* Recherche */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recherche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un élève..."
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Liste des notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notes ({filteredGrades.length})</CardTitle>
                <CardDescription>Liste des notes pour la classe sélectionnée</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowHistoryModal(true)}>
                <History className="mr-2 h-4 w-4" />
                Historique
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredGrades.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Aucune note trouvée</div>
            ) : (
              <div className="space-y-3">
                {filteredGrades.map((grade) => {
                  const student = DEMO_STUDENTS.find((s) => s.id === grade.studentId)
                  const canModify = canModifyGrade(grade)

                  return (
                    <div key={grade.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-sm font-medium text-primary">
                              {student?.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{student?.name}</p>
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

        {/* Modal d'ajout de note */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Ajouter une note</CardTitle>
                <CardDescription>Saisir une nouvelle note pour un élève</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Élève</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={newGrade.studentId}
                    onChange={(e) => setNewGrade({ ...newGrade, studentId: e.target.value })}
                  >
                    <option value="">Sélectionner un élève</option>
                    {DEMO_STUDENTS.filter((s) => s.class === selectedClass).map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Note (sur 20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={newGrade.value}
                    onChange={(e) => setNewGrade({ ...newGrade, value: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={newGrade.type}
                    onChange={(e) => setNewGrade({ ...newGrade, type: e.target.value as Grade["type"] })}
                  >
                    <option value="Contrôle">Contrôle</option>
                    <option value="Devoir">Devoir</option>
                    <option value="Participation">Participation</option>
                    <option value="Examen">Examen</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Coefficient</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={newGrade.coefficient}
                    onChange={(e) => setNewGrade({ ...newGrade, coefficient: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={newGrade.date}
                    onChange={(e) => setNewGrade({ ...newGrade, date: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" onClick={addGrade}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowAddModal(false)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal d'historique */}
        {showHistoryModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowHistoryModal(false)}
          >
            <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Historique des modifications</CardTitle>
                <CardDescription>Toutes les modifications de notes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      student: "Alice Dupont",
                      action: "Note ajoutée",
                      value: "15/20",
                      by: "Prof. Demo",
                      date: "2025-10-10 14:30",
                    },
                    {
                      student: "Claire Bernard",
                      action: "Note modifiée",
                      value: "8/20 → 9/20",
                      by: "Prof. Demo",
                      date: "2025-10-10 15:00",
                    },
                  ].map((record, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{record.student}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.action} - {record.value}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{record.by}</p>
                        <p>{record.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal d'édition de note */}
        {editingNoteId && (
          <EditNoteModal noteId={editingNoteId} onClose={() => setEditingNoteId(null)} onSuccess={refreshGrades} />
        )}
      </div>
    </DashboardLayout>
  )
}
