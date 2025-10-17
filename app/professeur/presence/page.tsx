"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
} from "lucide-react"
import { useState, useEffect } from "react"

// Types
interface Student {
  id: string
  name: string
  status: "present" | "absent" | "late"
  justification?: string
  isJustified?: boolean
}

interface Course {
  id: string
  name: string
  class: string
  time: string
}

interface AttendanceRecord {
  date: string
  courseId: string
  students: Student[]
}

// Données de démonstration
const DEMO_COURSES: Course[] = [
  { id: "1", name: "Mathématiques", class: "Terminale A", time: "08:00 - 10:00" },
  { id: "2", name: "Mathématiques", class: "Première B", time: "10:15 - 12:15" },
  { id: "3", name: "Mathématiques", class: "Seconde C", time: "14:00 - 16:00" },
]

const DEMO_STUDENTS: Record<string, Student[]> = {
  "1": [
    { id: "1", name: "Alice Dupont", status: "present" },
    { id: "2", name: "Bob Martin", status: "present" },
    { id: "3", name: "Claire Bernard", status: "absent", isJustified: true, justification: "Maladie" },
    { id: "4", name: "David Petit", status: "present" },
    { id: "5", name: "Emma Dubois", status: "late" },
    { id: "6", name: "François Moreau", status: "present" },
    { id: "7", name: "Gabrielle Simon", status: "present" },
    { id: "8", name: "Hugo Laurent", status: "absent" },
  ],
  "2": [
    { id: "9", name: "Isabelle Lefebvre", status: "present" },
    { id: "10", name: "Jules Roux", status: "present" },
    { id: "11", name: "Léa Fournier", status: "present" },
    { id: "12", name: "Marc Girard", status: "late" },
    { id: "13", name: "Nina Bonnet", status: "present" },
  ],
  "3": [
    { id: "14", name: "Oscar Lambert", status: "present" },
    { id: "15", name: "Pauline Fontaine", status: "absent" },
    { id: "16", name: "Quentin Rousseau", status: "present" },
    { id: "17", name: "Rose Vincent", status: "present" },
    { id: "18", name: "Simon Gauthier", status: "late" },
  ],
}

// Fonction pour formater la date
function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Fonction pour obtenir la couleur du statut
function getStatusColor(status: "present" | "absent" | "late"): string {
  switch (status) {
    case "present":
      return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
    case "absent":
      return "bg-red-500/10 text-red-500 hover:bg-red-500/20"
    case "late":
      return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
  }
}

// Fonction pour obtenir le label du statut
function getStatusLabel(status: "present" | "absent" | "late"): string {
  switch (status) {
    case "present":
      return "Présent"
    case "absent":
      return "Absent"
    case "late":
      return "Retard"
  }
}

// Fonction pour obtenir l'icône du statut
function getStatusIcon(status: "present" | "absent" | "late") {
  switch (status) {
    case "present":
      return <CheckCircle className="h-4 w-4" />
    case "absent":
      return <XCircle className="h-4 w-4" />
    case "late":
      return <Clock className="h-4 w-4" />
  }
}

export default function PresencePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedCourse, setSelectedCourse] = useState<string>(DEMO_COURSES[0].id)
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "present" | "absent" | "late">("all")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Charger les étudiants du cours sélectionné
  useEffect(() => {
    const courseStudents = DEMO_STUDENTS[selectedCourse] || []
    setStudents([...courseStudents])
    setHasUnsavedChanges(false)
  }, [selectedCourse, selectedDate])

  // Changer le statut d'un étudiant
  const updateStudentStatus = (studentId: string, newStatus: "present" | "absent" | "late") => {
    setStudents((prev) =>
      prev.map((student) => (student.id === studentId ? { ...student, status: newStatus } : student)),
    )
    setHasUnsavedChanges(true)
    // Simulation de sauvegarde automatique
    setTimeout(() => {
      console.log("[v0] Auto-saved attendance for student:", studentId)
    }, 500)
  }

  // Sauvegarder les présences
  const saveAttendance = () => {
    console.log("[v0] Saving attendance:", { date: selectedDate, courseId: selectedCourse, students })
    setHasUnsavedChanges(false)
    // Ici, vous ajouteriez l'appel API pour sauvegarder
  }

  // Exporter en PDF/Excel
  const exportAttendance = (format: "pdf" | "excel") => {
    console.log("[v0] Exporting attendance as:", format)
    // Ici, vous ajouteriez la logique d'export
    alert(`Export ${format.toUpperCase()} en cours de développement`)
  }

  // Filtrer les étudiants
  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || student.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Calculer les statistiques
  const stats = {
    present: students.filter((s) => s.status === "present").length,
    absent: students.filter((s) => s.status === "absent").length,
    late: students.filter((s) => s.status === "late").length,
    total: students.length,
  }

  const selectedCourseData = DEMO_COURSES.find((c) => c.id === selectedCourse)

  // Navigation de date
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Présence</h2>
            <p className="text-muted-foreground">Gérer les présences de vos élèves</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportAttendance("pdf")}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAttendance("excel")}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>

        {/* Sélection de date et cours */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Date du cours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <p className="font-medium">{formatDate(selectedDate)}</p>
                </div>
                <Button variant="outline" size="icon" onClick={goToNextDay}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3 bg-transparent" onClick={goToToday}>
                <Calendar className="mr-2 h-4 w-4" />
                Aujourd'hui
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cours</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                {DEMO_COURSES.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} - {course.class} ({course.time})
                  </option>
                ))}
              </select>
              {selectedCourseData && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {stats.total} élève{stats.total > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Présents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.present}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Absents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.absent}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Retards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats.late}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerte modifications non sauvegardées */}
        {hasUnsavedChanges && (
          <Card className="border-orange-500 bg-orange-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-orange-500">Modifications non sauvegardées</CardTitle>
                </div>
                <Button size="sm" onClick={saveAttendance}>
                  Sauvegarder maintenant
                </Button>
              </div>
              <CardDescription>
                Les modifications sont sauvegardées automatiquement, mais vous pouvez forcer la sauvegarde.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Filtres et recherche */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
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
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                >
                  Tous
                </Button>
                <Button
                  variant={filterStatus === "present" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("present")}
                >
                  Présents
                </Button>
                <Button
                  variant={filterStatus === "absent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("absent")}
                >
                  Absents
                </Button>
                <Button
                  variant={filterStatus === "late" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("late")}
                >
                  Retards
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des étudiants */}
        <Card>
          <CardHeader>
            <CardTitle>
              Liste des élèves ({filteredStudents.length}/{stats.total})
            </CardTitle>
            <CardDescription>Cliquez sur les boutons pour modifier le statut de présence</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Aucun élève trouvé</div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-medium text-primary">
                            {student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(student.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(student.status)}
                                {getStatusLabel(student.status)}
                              </span>
                            </Badge>
                            {student.isJustified && (
                              <Badge variant="outline" className="text-green-500 border-green-500">
                                Justifiée
                              </Badge>
                            )}
                          </div>
                          {student.justification && (
                            <p className="text-sm text-muted-foreground mt-1">{student.justification}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={student.status === "present" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateStudentStatus(student.id, "present")}
                        className={student.status === "present" ? "bg-green-500 hover:bg-green-600" : ""}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Présent
                      </Button>
                      <Button
                        variant={student.status === "absent" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateStudentStatus(student.id, "absent")}
                        className={student.status === "absent" ? "bg-red-500 hover:bg-red-600" : ""}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Absent
                      </Button>
                      <Button
                        variant={student.status === "late" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateStudentStatus(student.id, "late")}
                        className={student.status === "late" ? "bg-orange-500 hover:bg-orange-600" : ""}
                      >
                        <Clock className="mr-1 h-4 w-4" />
                        Retard
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historique récent */}
        <Card>
          <CardHeader>
            <CardTitle>Historique récent</CardTitle>
            <CardDescription>Absences et retards des derniers cours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { date: "15/10/2025", student: "Hugo Laurent", status: "absent", course: "Terminale A" },
                { date: "14/10/2025", student: "Emma Dubois", status: "late", course: "Terminale A" },
                { date: "14/10/2025", student: "Marc Girard", status: "late", course: "Première B" },
                { date: "13/10/2025", student: "Pauline Fontaine", status: "absent", course: "Seconde C" },
              ].map((record, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {record.status === "absent" ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{record.student}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.course} - {record.date}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(record.status as "absent" | "late")}>
                    {getStatusLabel(record.status as "absent" | "late")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
