"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Clock, User } from "lucide-react"
import { useState } from "react"

// Types pour les cours
interface Course {
  id: string
  name: string
  teacher: string
  schedule: string
  room: string
  description: string
}

// Données de démonstration
const DEMO_COURSES: Course[] = [
  {
    id: "1",
    name: "Mathématiques",
    teacher: "M. Dupont",
    schedule: "Lundi 8h-10h, Mercredi 14h-16h",
    room: "Salle 201",
    description: "Algèbre et géométrie - Niveau Terminale",
  },
  {
    id: "2",
    name: "Français",
    teacher: "Mme Martin",
    schedule: "Mardi 10h-12h, Jeudi 8h-10h",
    room: "Salle 105",
    description: "Littérature française et expression écrite",
  },
  {
    id: "3",
    name: "Histoire-Géographie",
    teacher: "M. Bernard",
    schedule: "Lundi 14h-16h, Vendredi 10h-12h",
    room: "Salle 302",
    description: "Histoire contemporaine et géographie mondiale",
  },
  {
    id: "4",
    name: "Physique-Chimie",
    teacher: "Mme Rousseau",
    schedule: "Mardi 14h-16h, Jeudi 14h-16h",
    room: "Laboratoire A",
    description: "Mécanique et chimie organique",
  },
  {
    id: "5",
    name: "Anglais",
    teacher: "Mrs. Smith",
    schedule: "Mercredi 8h-10h, Vendredi 14h-16h",
    room: "Salle 108",
    description: "Anglais avancé - Préparation examens",
  },
  {
    id: "6",
    name: "Philosophie",
    teacher: "M. Lefebvre",
    schedule: "Lundi 10h-12h",
    room: "Salle 204",
    description: "Introduction à la philosophie moderne",
  },
]

export default function CoursPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  return (
    <DashboardLayout requiredRole="student">
      <div className="space-y-6">
        {/* En-tête de la page */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mes cours</h2>
          <p className="text-muted-foreground">Liste de tous vos cours du semestre</p>
        </div>

        {/* Grille de cours */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DEMO_COURSES.map((course) => (
            <Card
              key={course.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
              onClick={() => setSelectedCourse(course)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="mt-4">{course.name}</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{course.teacher}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{course.schedule}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal de détails du cours */}
        {selectedCourse && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedCourse(null)}
          >
            <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedCourse.name}</CardTitle>
                    <CardDescription className="mt-2">{selectedCourse.description}</CardDescription>
                  </div>
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="rounded-lg p-2 hover:bg-accent"
                    aria-label="Fermer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4" />
                      Professeur
                    </div>
                    <p className="text-muted-foreground">{selectedCourse.teacher}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Horaires
                    </div>
                    <p className="text-muted-foreground">{selectedCourse.schedule}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <BookOpen className="h-4 w-4" />
                      Salle
                    </div>
                    <p className="text-muted-foreground">{selectedCourse.room}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
