"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Search, Edit, Trash2, Filter } from "lucide-react"
import { useState } from "react"
import { EditNoteModal } from "@/components/notes/EditNoteModal"

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
}

const DEMO_STUDENTS: Student[] = [
  { id: "1", name: "Alice Dupont", class: "Terminale A" },
  { id: "2", name: "Bob Martin", class: "Terminale A" },
  { id: "3", name: "Claire Bernard", class: "Terminale A" },
  { id: "4", name: "David Petit", class: "Première B" },
  { id: "5", name: "Emma Dubois", class: "Première B" },
  { id: "6", name: "François Moreau", class: "Seconde C" },
  { id: "7", name: "Gabrielle Simon", class: "Seconde C" },
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
  },
  {
    id: "3",
    studentId: "4",
    value: 16,
    date: "2025-10-08",
    type: "Devoir",
    coefficient: 1,
    subject: "Français",
    enteredBy: "Prof. Martin",
    enteredAt: "2025-10-08T10:00:00",
  },
  {
    id: "4",
    studentId: "6",
    value: 14,
    date: "2025-10-09",
    type: "Contrôle",
    coefficient: 2,
    subject: "Histoire-Géographie",
    enteredBy: "Prof. Bernard",
    enteredAt: "2025-10-09T11:00:00",
  },
]

function calculateStats(grades: Grade[]) {
  if (grades.length === 0) return { average: 0, min: 0, max: 0 }
  const values = grades.map((g) => g.value)
  return {
    average: values.reduce((sum, v) => sum + v, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

export default function ResponsableNotesPage() {
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedSubject, setSelectedSubject] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [grades, setGrades] = useState<Grade[]>(DEMO_GRADES)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  const filteredGrades = grades.filter((grade) => {
    const student = DEMO_STUDENTS.find((s) => s.id === grade.studentId)
    const matchesClass = selectedClass === "all" || student?.class === selectedClass
    const matchesSubject = selectedSubject === "all" || grade.subject === selectedSubject
    const matchesType = selectedType === "all" || grade.type === selectedType
    const matchesSearch =
      student?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grade.subject.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesClass && matchesSubject && matchesType && matchesSearch
  })

  const stats = calculateStats(filteredGrades)

  const deleteGrade = (gradeId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      setGrades(grades.filter((g) => g.id !== gradeId))
    }
  }

  const exportGrades = (format: "pdf" | "csv") => {
    console.log("[v0] Exporting grades as:", format)
    alert(`Export ${format.toUpperCase()} en cours de développement`)
  }

  const classesList = ["Terminale A", "Première B", "Seconde C"]
  const classStats = classesList.map((className) => {
    const classGrades = grades.filter((g) => {
      const student = DEMO_STUDENTS.find((s) => s.id === g.studentId)
      return student?.class === className
    })
    return {
      class: className,
      count: classGrades.length,
      average: calculateStats(classGrades).average,
    }
  })

  const refreshGrades = async () => {
    setEditingNoteId(null)
  }

  return (
    <DashboardLayout requiredRole="responsable">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestion des notes</h2>
            <p className="text-muted-foreground">Vue globale des notes de toutes les classes</p>
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
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {classStats.map((stat) => (
            <Card key={stat.class}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{stat.class}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{stat.average.toFixed(2)}/20</div>
                    <p className="text-xs text-muted-foreground">Moyenne</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-medium">{stat.count}</div>
                    <p className="text-xs text-muted-foreground">Notes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-base">Filtres</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium">Classe</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="all">Toutes les classes</option>
                  <option value="Terminale A">Terminale A</option>
                  <option value="Première B">Première B</option>
                  <option value="Seconde C">Seconde C</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Matière</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="all">Toutes les matières</option>
                  <option value="Mathématiques">Mathématiques</option>
                  <option value="Français">Français</option>
                  <option value="Histoire-Géographie">Histoire-Géographie</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="all">Tous les types</option>
                  <option value="Contrôle">Contrôle</option>
                  <option value="Devoir">Devoir</option>
                  <option value="Participation">Participation</option>
                  <option value="Examen">Examen</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Recherche</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Élève ou matière..."
                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredGrades.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Moyenne générale</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Notes ({filteredGrades.length})</CardTitle>
            <CardDescription>Toutes les notes avec possibilité de modification</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredGrades.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Aucune note trouvée</div>
            ) : (
              <div className="space-y-3">
                {filteredGrades.map((grade) => {
                  const student = DEMO_STUDENTS.find((s) => s.id === grade.studentId)

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
                              <Badge variant="secondary">{student?.class}</Badge>
                              <Badge variant="outline">{grade.subject}</Badge>
                              <Badge variant="outline">{grade.type}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(grade.date).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Saisi par {grade.enteredBy} le{" "}
                              {new Date(grade.enteredAt).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold">{grade.value}/20</div>
                          <p className="text-xs text-muted-foreground">Coef. {grade.coefficient}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => setEditingNoteId(grade.id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => deleteGrade(grade.id)}>
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

        {editingNoteId && (
          <EditNoteModal noteId={editingNoteId} onClose={() => setEditingNoteId(null)} onSuccess={refreshGrades} />
        )}
      </div>
    </DashboardLayout>
  )
}
