"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Download, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

// Types
interface Grade {
  id: string
  value: number
  date: string
  type: string
  coefficient: number
  classAverage: number
  classMin: number
  classMax: number
}

interface Subject {
  id: string
  name: string
  grades: Grade[]
  coefficient: number
}

// Données de démonstration
const DEMO_SUBJECTS: Subject[] = [
  {
    id: "1",
    name: "Mathématiques",
    coefficient: 4,
    grades: [
      {
        id: "1",
        value: 15,
        date: "2025-09-15",
        type: "Contrôle",
        coefficient: 2,
        classAverage: 12.5,
        classMin: 6,
        classMax: 18,
      },
      {
        id: "2",
        value: 17,
        date: "2025-10-01",
        type: "Devoir",
        coefficient: 1,
        classAverage: 13.2,
        classMin: 8,
        classMax: 19,
      },
      {
        id: "3",
        value: 14,
        date: "2025-10-10",
        type: "Examen",
        coefficient: 3,
        classAverage: 11.8,
        classMin: 5,
        classMax: 17,
      },
    ],
  },
  {
    id: "2",
    name: "Français",
    coefficient: 3,
    grades: [
      {
        id: "4",
        value: 16,
        date: "2025-09-20",
        type: "Contrôle",
        coefficient: 2,
        classAverage: 13.5,
        classMin: 9,
        classMax: 18,
      },
      {
        id: "5",
        value: 15,
        date: "2025-10-05",
        type: "Devoir",
        coefficient: 1,
        classAverage: 12.8,
        classMin: 7,
        classMax: 17,
      },
    ],
  },
  {
    id: "3",
    name: "Histoire-Géographie",
    coefficient: 3,
    grades: [
      {
        id: "6",
        value: 13,
        date: "2025-09-25",
        type: "Contrôle",
        coefficient: 2,
        classAverage: 12.0,
        classMin: 6,
        classMax: 16,
      },
      {
        id: "7",
        value: 14,
        date: "2025-10-08",
        type: "Devoir",
        coefficient: 1,
        classAverage: 11.5,
        classMin: 5,
        classMax: 15,
      },
    ],
  },
  {
    id: "4",
    name: "Physique-Chimie",
    coefficient: 3,
    grades: [
      {
        id: "8",
        value: 12,
        date: "2025-09-18",
        type: "Contrôle",
        coefficient: 2,
        classAverage: 11.2,
        classMin: 4,
        classMax: 16,
      },
    ],
  },
  {
    id: "5",
    name: "Anglais",
    coefficient: 2,
    grades: [
      {
        id: "9",
        value: 18,
        date: "2025-09-22",
        type: "Contrôle",
        coefficient: 2,
        classAverage: 14.5,
        classMin: 10,
        classMax: 19,
      },
      {
        id: "10",
        value: 17,
        date: "2025-10-12",
        type: "Participation",
        coefficient: 1,
        classAverage: 15.0,
        classMin: 12,
        classMax: 18,
      },
    ],
  },
]

// Fonction pour calculer la moyenne d'une matière
function calculateSubjectAverage(subject: Subject): number {
  if (subject.grades.length === 0) return 0
  const totalWeighted = subject.grades.reduce((sum, grade) => sum + grade.value * grade.coefficient, 0)
  const totalCoefficients = subject.grades.reduce((sum, grade) => sum + grade.coefficient, 0)
  return totalWeighted / totalCoefficients
}

// Fonction pour calculer la moyenne générale
function calculateOverallAverage(subjects: Subject[]): number {
  const totalWeighted = subjects.reduce((sum, subject) => {
    const subjectAvg = calculateSubjectAverage(subject)
    return sum + subjectAvg * subject.coefficient
  }, 0)
  const totalCoefficients = subjects.reduce((sum, subject) => sum + subject.coefficient, 0)
  return totalWeighted / totalCoefficients
}

// Fonction pour obtenir la couleur de la note
function getGradeColor(grade: number): string {
  if (grade >= 16) return "text-green-500"
  if (grade >= 14) return "text-blue-500"
  if (grade >= 12) return "text-orange-500"
  if (grade >= 10) return "text-yellow-500"
  return "text-red-500"
}

// Fonction pour obtenir l'icône de tendance
function getTrendIcon(current: number, previous: number) {
  if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />
  if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

export default function NotesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"trimestre1" | "trimestre2" | "trimestre3" | "annuel">(
    "trimestre1",
  )
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  const overallAverage = calculateOverallAverage(DEMO_SUBJECTS)

  // Données pour le graphique d'évolution
  const getChartData = (subject: Subject) => {
    const sortedGrades = [...subject.grades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return sortedGrades.map((g) => ({
      date: new Date(g.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      "Mes notes": g.value,
      "Moyenne classe": g.classAverage,
    }))
  }

  // Exporter le bulletin en PDF
  const exportBulletin = () => {
    console.log("[v0] Exporting bulletin as PDF for period:", selectedPeriod)
    alert("Export PDF en cours de développement")
  }

  return (
    <DashboardLayout requiredRole="student">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Mes notes</h2>
            <p className="text-muted-foreground">Consultez vos résultats et votre progression</p>
          </div>
          <Button onClick={exportBulletin}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger le bulletin
          </Button>
        </div>

        {/* Sélection de période */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Période</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedPeriod === "trimestre1" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("trimestre1")}
              >
                Trimestre 1
              </Button>
              <Button
                variant={selectedPeriod === "trimestre2" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("trimestre2")}
              >
                Trimestre 2
              </Button>
              <Button
                variant={selectedPeriod === "trimestre3" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("trimestre3")}
              >
                Trimestre 3
              </Button>
              <Button
                variant={selectedPeriod === "annuel" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("annuel")}
              >
                Bulletin annuel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Moyenne générale */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Moyenne générale</CardTitle>
            <CardDescription>Toutes matières confondues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-5xl font-bold ${getGradeColor(overallAverage)}`}>
                {overallAverage.toFixed(2)}
                <span className="text-2xl text-muted-foreground">/20</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Coefficient total</p>
                <p className="text-2xl font-bold">
                  {DEMO_SUBJECTS.reduce((sum, subject) => sum + subject.coefficient, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des matières */}
        <div className="space-y-4">
          {DEMO_SUBJECTS.map((subject) => {
            const subjectAverage = calculateSubjectAverage(subject)
            const isExpanded = selectedSubject === subject.id

            return (
              <Card key={subject.id} className={isExpanded ? "border-primary" : ""}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setSelectedSubject(isExpanded ? null : subject.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{subject.name}</CardTitle>
                        <CardDescription>
                          {subject.grades.length} note{subject.grades.length > 1 ? "s" : ""} • Coefficient{" "}
                          {subject.coefficient}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getGradeColor(subjectAverage)}`}>
                        {subject.grades.length > 0 ? subjectAverage.toFixed(2) : "-"}
                      </div>
                      <p className="text-sm text-muted-foreground">Moyenne</p>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-6">
                    {/* Graphique d'évolution */}
                    {subject.grades.length > 1 && (
                      <div>
                        <h4 className="mb-3 text-sm font-medium">Évolution des notes</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getChartData(subject)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis domain={[0, 20]} />
                              <Tooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="Mes notes"
                                stroke="rgb(59, 130, 246)"
                                strokeWidth={2}
                                dot={{ fill: "rgb(59, 130, 246)" }}
                              />
                              <Line
                                type="monotone"
                                dataKey="Moyenne classe"
                                stroke="rgb(156, 163, 175)"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ fill: "rgb(156, 163, 175)" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Liste des notes */}
                    <div>
                      <h4 className="mb-3 text-sm font-medium">Détail des notes</h4>
                      <div className="space-y-3">
                        {subject.grades.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-4">Aucune note pour le moment</p>
                        ) : (
                          subject.grades.map((grade, index) => (
                            <div key={grade.id} className="rounded-lg border p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{grade.type}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {new Date(grade.date).toLocaleDateString("fr-FR")}
                                    </span>
                                    {index > 0 && getTrendIcon(grade.value, subject.grades[index - 1].value)}
                                  </div>
                                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                                    <div>
                                      <p className="text-muted-foreground">Ma note</p>
                                      <p className={`text-lg font-bold ${getGradeColor(grade.value)}`}>
                                        {grade.value}/20
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Moyenne classe</p>
                                      <p className="text-lg font-medium">{grade.classAverage}/20</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Note min</p>
                                      <p className="text-lg font-medium">{grade.classMin}/20</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Note max</p>
                                      <p className="text-lg font-medium">{grade.classMax}/20</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Coefficient</p>
                                  <p className="text-2xl font-bold">{grade.coefficient}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
