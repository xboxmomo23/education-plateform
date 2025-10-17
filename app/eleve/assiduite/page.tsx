"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, AlertTriangle, CheckCircle, XCircle, Filter } from "lucide-react"
import { useState } from "react"

// Types pour les absences
interface Absence {
  id: string
  date: string
  subject: string
  reason?: string
  isExcluded: boolean
  isJustified: boolean
  justificationNote?: string
  duration: number // en heures
}

// Données de démonstration
const DEMO_ABSENCES: Absence[] = [
  {
    id: "1",
    date: "2025-10-10",
    subject: "Mathématiques",
    reason: "Maladie",
    isExcluded: false,
    isJustified: true,
    justificationNote: "Certificat médical fourni",
    duration: 2,
  },
  {
    id: "2",
    date: "2025-10-12",
    subject: "Français",
    isExcluded: false,
    isJustified: false,
    duration: 2,
  },
  {
    id: "3",
    date: "2025-10-13",
    subject: "Physique-Chimie",
    reason: "Comportement inapproprié",
    isExcluded: true,
    isJustified: false,
    duration: 2,
  },
  {
    id: "4",
    date: "2025-10-14",
    subject: "Histoire-Géographie",
    reason: "Retard",
    isExcluded: false,
    isJustified: false,
    duration: 1,
  },
  {
    id: "5",
    date: "2025-10-15",
    subject: "Anglais",
    reason: "Rendez-vous médical",
    isExcluded: false,
    isJustified: true,
    justificationNote: "Justificatif fourni après coup",
    duration: 2,
  },
  {
    id: "6",
    date: "2025-10-16",
    subject: "Mathématiques",
    isExcluded: false,
    isJustified: false,
    duration: 2,
  },
]

// Seuil pour conseil de discipline (en heures)
const DISCIPLINE_THRESHOLD = 10

// Fonction pour formater la date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Fonction pour obtenir le type d'absence
function getAbsenceType(absence: Absence): "justified" | "unjustified" | "excluded" {
  if (absence.isExcluded) return "excluded"
  if (absence.isJustified) return "justified"
  return "unjustified"
}

// Fonction pour obtenir la couleur du badge
function getAbsenceBadgeColor(type: "justified" | "unjustified" | "excluded"): string {
  switch (type) {
    case "justified":
      return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
    case "unjustified":
      return "bg-red-500/10 text-red-500 hover:bg-red-500/20"
    case "excluded":
      return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
  }
}

// Fonction pour obtenir le label du badge
function getAbsenceBadgeLabel(type: "justified" | "unjustified" | "excluded"): string {
  switch (type) {
    case "justified":
      return "Justifiée"
    case "unjustified":
      return "Injustifiée"
    case "excluded":
      return "Exclusion"
  }
}

// Fonction pour obtenir l'icône
function getAbsenceIcon(type: "justified" | "unjustified" | "excluded") {
  switch (type) {
    case "justified":
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case "unjustified":
      return <XCircle className="h-5 w-5 text-red-500" />
    case "excluded":
      return <AlertTriangle className="h-5 w-5 text-orange-500" />
  }
}

export default function AssiduitePage() {
  const [filterType, setFilterType] = useState<"all" | "justified" | "unjustified" | "excluded">("all")
  const [filterSubject, setFilterSubject] = useState<string>("all")

  // Calculer les statistiques
  const totalUnjustifiedHours = DEMO_ABSENCES.filter((a) => !a.isJustified && !a.isExcluded).reduce(
    (sum, a) => sum + a.duration,
    0,
  )
  const isDisciplineThresholdReached = totalUnjustifiedHours >= DISCIPLINE_THRESHOLD

  // Obtenir la liste des matières uniques
  const subjects = Array.from(new Set(DEMO_ABSENCES.map((a) => a.subject)))

  // Filtrer les absences
  const filteredAbsences = DEMO_ABSENCES.filter((absence) => {
    const type = getAbsenceType(absence)
    const typeMatch = filterType === "all" || type === filterType
    const subjectMatch = filterSubject === "all" || absence.subject === filterSubject
    return typeMatch && subjectMatch
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <DashboardLayout requiredRole="student">
      <div className="space-y-6">
        {/* En-tête de la page */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assiduité</h2>
          <p className="text-muted-foreground">Suivi de vos absences et retards</p>
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total absences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{DEMO_ABSENCES.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Justifiées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {DEMO_ABSENCES.filter((a) => a.isJustified).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Injustifiées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {DEMO_ABSENCES.filter((a) => !a.isJustified && !a.isExcluded).length}
              </div>
            </CardContent>
          </Card>
          <Card className={isDisciplineThresholdReached ? "border-red-500" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Heures injustifiées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isDisciplineThresholdReached ? "text-red-500" : ""}`}>
                {totalUnjustifiedHours}h
              </div>
              {isDisciplineThresholdReached && (
                <p className="text-xs text-red-500 mt-1">Seuil conseil de discipline atteint</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerte seuil */}
        {isDisciplineThresholdReached && (
          <Card className="border-red-500 bg-red-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-red-500">Attention</CardTitle>
              </div>
              <CardDescription>
                Vous avez atteint le seuil de {DISCIPLINE_THRESHOLD} heures d'absences injustifiées. Un conseil de
                discipline peut être convoqué.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Filtres */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filtres</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Type d'absence</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                  >
                    Toutes
                  </Button>
                  <Button
                    variant={filterType === "justified" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("justified")}
                  >
                    Justifiées
                  </Button>
                  <Button
                    variant={filterType === "unjustified" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("unjustified")}
                  >
                    Injustifiées
                  </Button>
                  <Button
                    variant={filterType === "excluded" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("excluded")}
                  >
                    Exclusions
                  </Button>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Matière</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                >
                  <option value="all">Toutes les matières</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des absences */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Liste des absences ({filteredAbsences.length})</h3>
          {filteredAbsences.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune absence trouvée avec ces filtres
              </CardContent>
            </Card>
          ) : (
            filteredAbsences.map((absence) => {
              const type = getAbsenceType(absence)
              return (
                <Card key={absence.id} className={type === "unjustified" ? "border-red-200" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">{getAbsenceIcon(type)}</div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="secondary" className="font-normal">
                              {absence.subject}
                            </Badge>
                            <Badge className={getAbsenceBadgeColor(type)}>{getAbsenceBadgeLabel(type)}</Badge>
                            <Badge variant="outline">{absence.duration}h</Badge>
                          </div>
                          <CardTitle className="text-lg">{formatDate(absence.date)}</CardTitle>
                          {absence.reason && (
                            <CardDescription className="mt-2">
                              <span className="font-medium">Motif :</span> {absence.reason}
                            </CardDescription>
                          )}
                          {absence.isJustified && absence.justificationNote && (
                            <div className="mt-3 rounded-lg bg-green-500/10 p-3 border border-green-500/20">
                              <p className="text-sm text-green-700 dark:text-green-400">
                                <span className="font-medium">Justifié :</span> {absence.justificationNote}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
