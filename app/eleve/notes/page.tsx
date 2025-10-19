"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Download, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { gradesApi } from "@/lib/api/grade" // ✅ Import de ton API
import { getUserSession } from "@/lib/auth" // ✅ Pour récupérer l'ID de l'élève

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

export default function NotesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"trimestre1" | "trimestre2" | "trimestre3" | "annuel">("trimestre1")
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  
  // ✅ NOUVEAU: États pour les données API
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [termId, setTermId] = useState<string | null>(null)

  // 🔹 MODIFICATION 1: Récupérer l'ID de l'élève au montage
  useEffect(() => {
    const user = getUserSession()
    if (user && user.role === "student") {
      setStudentId(user.userId)
    }
  }, [])

  // 🔹 MODIFICATION 2: Charger les notes quand l'élève est identifié
  useEffect(() => {
    if (studentId) {
      loadStudentGrades()
    }
  }, [studentId, selectedPeriod])

  // ✅ NOUVELLE FONCTION: Charger toutes les notes de l'élève
  const loadStudentGrades = async () => {
    if (!studentId) return

    try {
      setIsLoading(true)
      setError(null)

      // Déterminer le termId selon la période sélectionnée
      const filters: any = {}
      if (selectedPeriod !== "annuel") {
        // Tu devras avoir une fonction pour convertir "trimestre1" en UUID du terme
        filters.termId = getTermIdByPeriod(selectedPeriod)
      }

      // Appel API pour récupérer les notes de l'élève
      const response = await gradesApi.getStudentGrades(studentId, filters)

      if (response.success) {
        const gradesData = response.data.grades

        // Regrouper les notes par matière
        const subjectMap = new Map<string, Subject>()

        gradesData.forEach((grade: any) => {
          const subjectId = grade.course_subject_name || "unknown"
          
          if (!subjectMap.has(subjectId)) {
            subjectMap.set(subjectId, {
              id: subjectId,
              name: subjectId,
              grades: [],
              coefficient: grade.evaluation_coefficient || 1,
            })
          }

          const subject = subjectMap.get(subjectId)!
          subject.grades.push({
            id: grade.id,
            value: grade.value || 0,
            date: grade.evaluation_date,
            type: mapEvaluationType(grade.evaluation_type),
            coefficient: grade.evaluation_coefficient,
            classAverage: 12, // Tu devras récupérer ça via une autre API
            classMin: 0,
            classMax: 20,
          })
        })

        setSubjects(Array.from(subjectMap.values()))
      } else {
        setError("Erreur lors du chargement des notes")
      }
    } catch (err) {
      console.error("Erreur chargement notes élève:", err)
      setError("Impossible de charger les notes")
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ HELPER: Mapper les types d'évaluation
  const mapEvaluationType = (type: string): string => {
    const mapping: Record<string, string> = {
      controle: "Contrôle",
      devoir: "Devoir",
      participation: "Participation",
      examen: "Examen",
    }
    return mapping[type] || "Évaluation"
  }

  // ✅ HELPER: Convertir la période en termId (à adapter selon ta BDD)
  const getTermIdByPeriod = (period: string): string | undefined => {
    // TODO: Remplacer par les vrais UUID de tes termes
    const termMapping: Record<string, string> = {
      trimestre1: "uuid-term-1",
      trimestre2: "uuid-term-2",
      trimestre3: "uuid-term-3",
    }
    return termMapping[period]
  }

  // Calculer la moyenne générale
  const overallAverage = calculateOverallAverage(subjects)

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

  // 🔹 MODIFICATION 3: Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Chargement de vos notes...</p>
        </div>
      </DashboardLayout>
    )
  }

  // 🔹 MODIFICATION 4: Afficher les erreurs
  if (error) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-red-500">Erreur</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => loadStudentGrades()} className="w-full">
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
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
                  {subjects.reduce((sum, subject) => sum + subject.coefficient, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des matières */}
        <div className="space-y-4">
          {subjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune note pour cette période
              </CardContent>
            </Card>
          ) : (
            subjects.map((subject) => {
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
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}