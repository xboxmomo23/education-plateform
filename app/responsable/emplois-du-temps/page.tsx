"use client"

import type React from "react"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, AlertTriangle, Clock, History, Eye, EyeOff } from "lucide-react"
import { useState, useEffect } from "react"

// Types
interface Course {
  id: string
  subject: string
  teacher: string
  class: string
  room: string
  day: string
  startHour: string
  endHour: string
  color: string
  week?: "A" | "B" | "both"
}

interface Modification {
  id: string
  courseId: string
  action: "created" | "modified" | "deleted" | "moved"
  user: string
  timestamp: Date
  details: string
  isLate: boolean
}

interface Conflict {
  type: "room" | "teacher" | "student"
  message: string
  courses: string[]
}

// Heures de la journée (8h à 18h)
const HOURS = ["8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h"]
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]

// Couleurs par matière
const SUBJECT_COLORS: Record<string, string> = {
  Mathématiques: "bg-blue-100 border-blue-300 text-blue-900",
  Français: "bg-purple-100 border-purple-300 text-purple-900",
  "Histoire-Géo": "bg-amber-100 border-amber-300 text-amber-900",
  Anglais: "bg-green-100 border-green-300 text-green-900",
  "Physique-Chimie": "bg-red-100 border-red-300 text-red-900",
  Philosophie: "bg-indigo-100 border-indigo-300 text-indigo-900",
  SVT: "bg-emerald-100 border-emerald-300 text-emerald-900",
  EPS: "bg-orange-100 border-orange-300 text-orange-900",
}

// Données de démonstration
const DEMO_COURSES: Course[] = [
  {
    id: "1",
    subject: "Mathématiques",
    teacher: "M. Dupont",
    class: "Terminale A",
    room: "Salle 201",
    day: "Lundi",
    startHour: "8h",
    endHour: "10h",
    color: SUBJECT_COLORS["Mathématiques"],
    week: "both",
  },
  {
    id: "2",
    subject: "Philosophie",
    teacher: "M. Lefebvre",
    class: "Terminale A",
    room: "Salle 204",
    day: "Lundi",
    startHour: "10h",
    endHour: "12h",
    color: SUBJECT_COLORS["Philosophie"],
    week: "A",
  },
  {
    id: "3",
    subject: "Histoire-Géo",
    teacher: "M. Bernard",
    class: "Terminale A",
    room: "Salle 302",
    day: "Lundi",
    startHour: "14h",
    endHour: "16h",
    color: SUBJECT_COLORS["Histoire-Géo"],
    week: "both",
  },
  {
    id: "4",
    subject: "Français",
    teacher: "Mme Martin",
    class: "Terminale A",
    room: "Salle 105",
    day: "Mardi",
    startHour: "10h",
    endHour: "12h",
    color: SUBJECT_COLORS["Français"],
    week: "both",
  },
  {
    id: "5",
    subject: "Physique-Chimie",
    teacher: "Mme Rousseau",
    class: "Terminale A",
    room: "Labo A",
    day: "Mardi",
    startHour: "14h",
    endHour: "16h",
    color: SUBJECT_COLORS["Physique-Chimie"],
    week: "both",
  },
  {
    id: "6",
    subject: "Anglais",
    teacher: "Mrs. Smith",
    class: "Terminale A",
    room: "Salle 108",
    day: "Mercredi",
    startHour: "8h",
    endHour: "10h",
    color: SUBJECT_COLORS["Anglais"],
    week: "both",
  },
  {
    id: "7",
    subject: "SVT",
    teacher: "M. Durand",
    class: "Terminale A",
    room: "Labo B",
    day: "Jeudi",
    startHour: "8h",
    endHour: "10h",
    color: SUBJECT_COLORS["SVT"],
    week: "B",
  },
  {
    id: "8",
    subject: "EPS",
    teacher: "M. Moreau",
    class: "Terminale A",
    room: "Gymnase",
    day: "Vendredi",
    startHour: "14h",
    endHour: "16h",
    color: SUBJECT_COLORS["EPS"],
    week: "both",
  },
]

const DEMO_MODIFICATIONS: Modification[] = [
  {
    id: "1",
    courseId: "1",
    action: "modified",
    user: "Responsable 1",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    details: "Changement de salle: 201 → 203",
    isLate: false,
  },
  {
    id: "2",
    courseId: "3",
    action: "moved",
    user: "Responsable 2",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    details: "Déplacé de Lundi 14h à Mardi 14h",
    isLate: true,
  },
]

export default function ResponsableEmploisDuTempsPage() {
  const [courses, setCourses] = useState<Course[]>(DEMO_COURSES)
  const [modifications, setModifications] = useState<Modification[]>(DEMO_MODIFICATIONS)
  const [currentWeek, setCurrentWeek] = useState(0)
  const [weekType, setWeekType] = useState<"A" | "B">("A")
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [viewMode, setViewMode] = useState<"detailed" | "condensed">("detailed")
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null)

  // Détecter les conflits
  useEffect(() => {
    detectConflicts()
  }, [courses])

  const detectConflicts = () => {
    const newConflicts: Conflict[] = []
    const filteredCourses = courses.filter((c) => c.week === weekType || c.week === "both")

    // Vérifier les conflits de salle
    filteredCourses.forEach((course1, i) => {
      filteredCourses.slice(i + 1).forEach((course2) => {
        if (
          course1.day === course2.day &&
          course1.room === course2.room &&
          hoursOverlap(course1.startHour, course1.endHour, course2.startHour, course2.endHour)
        ) {
          newConflicts.push({
            type: "room",
            message: `Conflit de salle ${course1.room} entre ${course1.subject} et ${course2.subject}`,
            courses: [course1.id, course2.id],
          })
        }

        // Vérifier les conflits de professeur
        if (
          course1.day === course2.day &&
          course1.teacher === course2.teacher &&
          hoursOverlap(course1.startHour, course1.endHour, course2.startHour, course2.endHour)
        ) {
          newConflicts.push({
            type: "teacher",
            message: `${course1.teacher} assigné à deux cours en même temps`,
            courses: [course1.id, course2.id],
          })
        }

        // Vérifier les conflits d'élèves (même classe)
        if (
          course1.day === course2.day &&
          course1.class === course2.class &&
          hoursOverlap(course1.startHour, course1.endHour, course2.startHour, course2.endHour)
        ) {
          newConflicts.push({
            type: "student",
            message: `La classe ${course1.class} a deux cours en même temps`,
            courses: [course1.id, course2.id],
          })
        }
      })
    })

    setConflicts(newConflicts)
  }

  const hoursOverlap = (start1: string, end1: string, start2: string, end2: string) => {
    const s1 = HOURS.indexOf(start1)
    const e1 = HOURS.indexOf(end1)
    const s2 = HOURS.indexOf(start2)
    const e2 = HOURS.indexOf(end2)
    return s1 < e2 && s2 < e1
  }

  const getWeekDates = () => {
    const today = new Date()
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 1 + currentWeek * 7))
    const lastDay = new Date(firstDay)
    lastDay.setDate(lastDay.getDate() + 4)
    return `${firstDay.getDate()}/${firstDay.getMonth() + 1} - ${lastDay.getDate()}/${lastDay.getMonth() + 1}`
  }

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course)
    setIsEditDialogOpen(true)
  }

  const handleDeleteCourse = (courseId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce cours ?")) {
      setCourses(courses.filter((c) => c.id !== courseId))
      addModification(courseId, "deleted", "Cours supprimé")
    }
  }

  const handleSaveCourse = (updatedCourse: Course) => {
    const now = new Date()
    const courseDate = new Date() // Simplification pour la démo
    const isLate = now > courseDate

    setCourses(courses.map((c) => (c.id === updatedCourse.id ? updatedCourse : c)))
    addModification(updatedCourse.id, "modified", "Cours modifié", isLate)
    setIsEditDialogOpen(false)
  }

  const handleAddCourse = (newCourse: Omit<Course, "id">) => {
    const course: Course = {
      ...newCourse,
      id: Date.now().toString(),
    }
    setCourses([...courses, course])
    addModification(course.id, "created", "Nouveau cours créé")
    setIsAddDialogOpen(false)
  }

  const addModification = (courseId: string, action: Modification["action"], details: string, isLate = false) => {
    const mod: Modification = {
      id: Date.now().toString(),
      courseId,
      action,
      user: "Responsable 1", // Récupérer depuis la session
      timestamp: new Date(),
      details,
      isLate,
    }
    setModifications([mod, ...modifications])
  }

  // Drag and drop handlers
  const handleDragStart = (course: Course) => {
    setDraggedCourse(course)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (day: string, hour: string) => {
    if (!draggedCourse) return

    const updatedCourse = {
      ...draggedCourse,
      day,
      startHour: hour,
      endHour: HOURS[HOURS.indexOf(hour) + 2] || hour,
    }

    setCourses(courses.map((c) => (c.id === draggedCourse.id ? updatedCourse : c)))
    addModification(draggedCourse.id, "moved", `Déplacé vers ${day} ${hour}`)
    setDraggedCourse(null)
  }

  const getCoursesForSlot = (day: string, hour: string) => {
    return courses.filter((course) => {
      if (course.week !== weekType && course.week !== "both") return false
      if (course.day !== day) return false
      const startIdx = HOURS.indexOf(course.startHour)
      const endIdx = HOURS.indexOf(course.endHour)
      const currentIdx = HOURS.indexOf(hour)
      return currentIdx >= startIdx && currentIdx < endIdx
    })
  }

  const hasConflict = (courseId: string) => {
    return conflicts.some((c) => c.courses.includes(courseId))
  }

  const filteredCourses = courses.filter((c) => c.week === weekType || c.week === "both")

  return (
    <DashboardLayout requiredRole="responsable">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestion des emplois du temps</h2>
            <p className="text-muted-foreground">
              Semaine {weekType} - {getWeekDates()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentWeek((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentWeek(0)} disabled={currentWeek === 0}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentWeek((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Select value={weekType} onValueChange={(v) => setWeekType(v as "A" | "B")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Semaine A</SelectItem>
                <SelectItem value="B">Semaine B</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
              <History className="mr-2 h-4 w-4" />
              Historique
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un cours
            </Button>
          </div>
        </div>

        {/* Alertes de conflits */}
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{conflicts.length} conflit(s) détecté(s):</strong>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {conflicts.slice(0, 3).map((conflict, i) => (
                  <li key={i}>{conflict.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Tableau principal */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Planning hebdomadaire - Terminale A</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode(viewMode === "detailed" ? "condensed" : "detailed")}
                    >
                      {viewMode === "detailed" ? (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Vue condensée
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Vue détaillée
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border bg-muted p-2 text-left font-medium w-20">Heure</th>
                        {DAYS.map((day) => (
                          <th key={day} className="border bg-muted p-2 text-center font-medium">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {HOURS.map((hour) => (
                        <tr key={hour}>
                          <td className="border bg-muted/50 p-2 text-sm font-medium">{hour}</td>
                          {DAYS.map((day) => {
                            const coursesInSlot = getCoursesForSlot(day, hour)
                            const isFirstHour = coursesInSlot.length > 0 && coursesInSlot[0].startHour === hour

                            return (
                              <td
                                key={`${day}-${hour}`}
                                className="border p-1 h-16 relative"
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(day, hour)}
                              >
                                {isFirstHour &&
                                  coursesInSlot.map((course) => {
                                    const duration = HOURS.indexOf(course.endHour) - HOURS.indexOf(course.startHour)
                                    const hasConflictFlag = hasConflict(course.id)

                                    return (
                                      <div
                                        key={course.id}
                                        draggable
                                        onDragStart={() => handleDragStart(course)}
                                        className={`rounded-lg border-2 p-2 cursor-move hover:shadow-md transition-shadow ${
                                          course.color
                                        } ${hasConflictFlag ? "ring-2 ring-red-500" : ""}`}
                                        style={{
                                          height: `${duration * 4}rem`,
                                          minHeight: "3.5rem",
                                        }}
                                      >
                                        <div className="flex items-start justify-between gap-1">
                                          <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm leading-tight truncate">
                                              {course.subject}
                                            </p>
                                            {viewMode === "detailed" && (
                                              <>
                                                <p className="text-xs truncate">{course.teacher}</p>
                                                <p className="text-xs truncate">{course.room}</p>
                                                {course.week !== "both" && (
                                                  <Badge variant="outline" className="mt-1 text-xs">
                                                    Sem. {course.week}
                                                  </Badge>
                                                )}
                                              </>
                                            )}
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6"
                                              onClick={() => handleEditCourse(course)}
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6"
                                              onClick={() => handleDeleteCourse(course.id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                        {hasConflictFlag && (
                                          <div className="mt-1 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3 text-red-600" />
                                            <span className="text-xs text-red-600">Conflit</span>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panneau latéral */}
          <div className="space-y-4">
            {/* Statistiques */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total cours:</span>
                  <span className="font-semibold">{filteredCourses.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Conflits:</span>
                  <span className="font-semibold text-red-600">{conflicts.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Modifications:</span>
                  <span className="font-semibold">{modifications.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Historique des modifications */}
            {showHistory && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Modifications récentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {modifications.slice(0, 5).map((mod) => (
                      <div key={mod.id} className="space-y-1 border-b pb-2 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant={mod.action === "deleted" ? "destructive" : "secondary"} className="text-xs">
                            {mod.action}
                          </Badge>
                          {mod.isLate && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="mr-1 h-3 w-3" />
                              Tardif
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{mod.details}</p>
                        <p className="text-xs text-muted-foreground">
                          Par {mod.user} - {mod.timestamp.toLocaleString("fr-FR")}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Légende */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Légende</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-4 w-4 rounded bg-blue-100 border-2 border-blue-300" />
                  <span>Mathématiques</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-4 w-4 rounded bg-purple-100 border-2 border-purple-300" />
                  <span>Français</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-4 w-4 rounded bg-green-100 border-2 border-green-300" />
                  <span>Anglais</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>Conflit détecté</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog d'édition */}
        <CourseEditDialog
          course={selectedCourse}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleSaveCourse}
        />

        {/* Dialog d'ajout */}
        <CourseAddDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAdd={handleAddCourse} />
      </div>
    </DashboardLayout>
  )
}

// Dialog d'édition de cours
function CourseEditDialog({
  course,
  open,
  onOpenChange,
  onSave,
}: {
  course: Course | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (course: Course) => void
}) {
  const [formData, setFormData] = useState<Course | null>(null)

  useEffect(() => {
    if (course) {
      setFormData(course)
    }
  }, [course])

  if (!formData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le cours</DialogTitle>
          <DialogDescription>Modifiez les informations du cours</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Matière</Label>
              <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Professeur</Label>
              <Input value={formData.teacher} onChange={(e) => setFormData({ ...formData, teacher: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Classe</Label>
              <Input value={formData.class} onChange={(e) => setFormData({ ...formData, class: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Salle</Label>
              <Input value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Jour</Label>
              <Select value={formData.day} onValueChange={(v) => setFormData({ ...formData, day: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Début</Label>
              <Select value={formData.startHour} onValueChange={(v) => setFormData({ ...formData, startHour: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fin</Label>
              <Select value={formData.endHour} onValueChange={(v) => setFormData({ ...formData, endHour: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Semaine</Label>
            <Select
              value={formData.week}
              onValueChange={(v) => setFormData({ ...formData, week: v as "A" | "B" | "both" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Toutes les semaines</SelectItem>
                <SelectItem value="A">Semaine A uniquement</SelectItem>
                <SelectItem value="B">Semaine B uniquement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => onSave(formData)}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Dialog d'ajout de cours
function CourseAddDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (course: Omit<Course, "id">) => void
}) {
  const [formData, setFormData] = useState<Omit<Course, "id">>({
    subject: "",
    teacher: "",
    class: "Terminale A",
    room: "",
    day: "Lundi",
    startHour: "8h",
    endHour: "10h",
    color: SUBJECT_COLORS["Mathématiques"],
    week: "both",
  })

  const handleSubmit = () => {
    if (!formData.subject || !formData.teacher || !formData.room) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }
    onAdd(formData)
    // Reset form
    setFormData({
      subject: "",
      teacher: "",
      class: "Terminale A",
      room: "",
      day: "Lundi",
      startHour: "8h",
      endHour: "10h",
      color: SUBJECT_COLORS["Mathématiques"],
      week: "both",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter un cours</DialogTitle>
          <DialogDescription>Créez un nouveau cours dans l'emploi du temps</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Matière *</Label>
              <Select
                value={formData.subject}
                onValueChange={(v) => setFormData({ ...formData, subject: v, color: SUBJECT_COLORS[v] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une matière" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(SUBJECT_COLORS).map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Professeur *</Label>
              <Input
                value={formData.teacher}
                onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                placeholder="Nom du professeur"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Classe</Label>
              <Input value={formData.class} onChange={(e) => setFormData({ ...formData, class: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Salle *</Label>
              <Input
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="Numéro de salle"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Jour</Label>
              <Select value={formData.day} onValueChange={(v) => setFormData({ ...formData, day: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Début</Label>
              <Select value={formData.startHour} onValueChange={(v) => setFormData({ ...formData, startHour: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fin</Label>
              <Select value={formData.endHour} onValueChange={(v) => setFormData({ ...formData, endHour: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Semaine</Label>
            <Select
              value={formData.week}
              onValueChange={(v) => setFormData({ ...formData, week: v as "A" | "B" | "both" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Toutes les semaines</SelectItem>
                <SelectItem value="A">Semaine A uniquement</SelectItem>
                <SelectItem value="B">Semaine B uniquement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>Créer le cours</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
