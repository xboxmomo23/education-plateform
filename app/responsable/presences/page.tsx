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
  ChevronLeft,
  ChevronRight,
  Lock,
  Users,
  AlertCircle,
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
  startTime: Date
}

const DEMO_COURSES: Course[] = [
  {
    id: "1",
    name: "Mathématiques",
    class: "Terminale A",
    time: "08:00 - 10:00",
    startTime: new Date(new Date().setHours(8, 0, 0, 0)),
  },
  {
    id: "2",
    name: "Physique",
    class: "Première B",
    time: "10:15 - 12:15",
    startTime: new Date(new Date().setHours(10, 15, 0, 0)),
  },
  {
    id: "3",
    name: "Français",
    class: "Seconde C",
    time: "14:00 - 16:00",
    startTime: new Date(new Date().setHours(14, 0, 0, 0)),
  },
  {
    id: "4",
    name: "Histoire",
    class: "Terminale A",
    time: "08:00 - 10:00",
    startTime: new Date(new Date().setDate(new Date().getDate() - 3)),
  },
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
  "4": [
    { id: "19", name: "Thomas Mercier", status: "absent", isJustified: false },
    { id: "20", name: "Valérie Blanc", status: "present" },
    { id: "21", name: "William Chevalier", status: "late" },
  ],
}

function isCourseLockedForEditing(courseStartTime: Date): boolean {
  const now = new Date()
  const hoursSinceCourse = (now.getTime() - courseStartTime.getTime()) / (1000 * 60 * 60)
  return hoursSinceCourse > 48
}

function getTimeUntilLock(courseStartTime: Date): string {
  const now = new Date()
  const lockTime = new Date(courseStartTime.getTime() + 48 * 60 * 60 * 1000)
  const hoursRemaining = Math.max(0, (lockTime.getTime() - now.getTime()) / (1000 * 60 * 60))

  if (hoursRemaining <= 0) return "Verrouillé"
  if (hoursRemaining < 1) return `${Math.round(hoursRemaining * 60)} minutes restantes`
  if (hoursRemaining < 24) return `${Math.round(hoursRemaining)} heures restantes`
  return `${Math.round(hoursRemaining / 24)} jours restants`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

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

export default function ResponsablePresencesPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedCourse, setSelectedCourse] = useState<string>(DEMO_COURSES[0].id)
  const [students, setStudents] = useState<Student[]>([])
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const courseStudents = DEMO_STUDENTS[selectedCourse] || []
    setStudents([...courseStudents])

    const course = DEMO_COURSES.find((c) => c.id === selectedCourse)
    if (course) {
      setIsLocked(isCourseLockedForEditing(course.startTime))
    }
  }, [selectedCourse, selectedDate])

  const updateStudentStatus = (studentId: string, newStatus: "present" | "absent" | "late") => {
    if (isLocked) {
      alert("Impossible de modifier : le délai de 48 heures est dépassé")
      return
    }

    setStudents((prev) =>
      prev.map((student) => (student.id === studentId ? { ...student, status: newStatus } : student)),
    )

    // Simulation de sauvegarde automatique
    setTimeout(() => {
      console.log("[v0] Auto-saved attendance for student:", studentId, "status:", newStatus)
    }, 500)
  }

  // Filtrer les cours du jour sélectionné
  const coursesForSelectedDate = DEMO_COURSES.filter((course) => {
    const courseDate = new Date(course.startTime)
    return (
      courseDate.getDate() === selectedDate.getDate() &&
      courseDate.getMonth() === selectedDate.getMonth() &&
      courseDate.getFullYear() === selectedDate.getFullYear()
    )
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
    <DashboardLayout requiredRole="responsable">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Présences</h2>
            <p className="text-muted-foreground">Visualiser et gérer les présences des élèves</p>
          </div>
        </div>

        {/* Sélection de date */}
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
            <CardTitle>Cours du jour</CardTitle>
            <CardDescription>
              {coursesForSelectedDate.length} cours trouvé{coursesForSelectedDate.length > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {coursesForSelectedDate.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Aucun cours pour cette date</div>
            ) : (
              <div className="space-y-3">
                {coursesForSelectedDate.map((course) => {
                  const locked = isCourseLockedForEditing(course.startTime)
                  const timeUntilLock = getTimeUntilLock(course.startTime)
                  const isSelected = course.id === selectedCourse

                  return (
                    <button
                      key={course.id}
                      onClick={() => setSelectedCourse(course.id)}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{course.name}</p>
                            {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {course.class} • {course.time}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={locked ? "secondary" : "outline"} className="text-xs">
                              {timeUntilLock}
                            </Badge>
                            {locked && <span className="text-xs text-muted-foreground">Modification impossible</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {isLocked && selectedCourseData && (
          <Card className="border-orange-500 bg-orange-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-orange-500">Cours verrouillé</CardTitle>
              </div>
              <CardDescription>
                Le délai de 48 heures est dépassé. Les modifications ne sont plus possibles pour ce cours.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Résumé du jour</CardTitle>
            <CardDescription>
              {selectedCourseData?.name} - {selectedCourseData?.class}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{stats.present}</p>
                  <p className="text-xs text-muted-foreground">Présents</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{stats.absent}</p>
                  <p className="text-xs text-muted-foreground">Absents</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-500">{stats.late}</p>
                  <p className="text-xs text-muted-foreground">Retards</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liste des élèves ({stats.total})</CardTitle>
            <CardDescription>
              {isLocked
                ? "Consultation uniquement - Modifications verrouillées"
                : "Cliquez sur les boutons pour modifier le statut"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Aucun élève trouvé</div>
            ) : (
              <div className="space-y-3">
                {students.map((student) => (
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
                        disabled={isLocked}
                        className={student.status === "present" ? "bg-green-500 hover:bg-green-600" : ""}
                        title={isLocked ? "Modification verrouillée (délai de 48h dépassé)" : "Marquer présent"}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Présent
                      </Button>
                      <Button
                        variant={student.status === "absent" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateStudentStatus(student.id, "absent")}
                        disabled={isLocked}
                        className={student.status === "absent" ? "bg-red-500 hover:bg-red-600" : ""}
                        title={isLocked ? "Modification verrouillée (délai de 48h dépassé)" : "Marquer absent"}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Absent
                      </Button>
                      <Button
                        variant={student.status === "late" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateStudentStatus(student.id, "late")}
                        disabled={isLocked}
                        className={student.status === "late" ? "bg-orange-500 hover:bg-orange-600" : ""}
                        title={isLocked ? "Modification verrouillée (délai de 48h dépassé)" : "Marquer en retard"}
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-blue-500">Système de verrouillage</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Les présences peuvent être modifiées jusqu'à 48 heures après l'heure du cours. Passé ce délai, les statuts
              sont verrouillés et ne peuvent plus être changés. Cette mesure garantit l'intégrité des données de
              présence.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
