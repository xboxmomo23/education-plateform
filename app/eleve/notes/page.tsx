"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, BookOpen } from "lucide-react"

// ✅ Import des composants créés
import { NotesSummaryCard } from "@/components/notes/NotesSummaryCard"
import { SubjectSummaryTable } from "@/components/notes/SubjectSummaryTable"
import SubjectNotesAccordion from "@/components/notes/SubjectNotesAccordion"
import { StatsPanel } from "@/components/notes/StatsPanel"

// ✅ Types (à conserver tels quels)
type Evaluation = {
  evaluationId: string
  title: string
  date: string // ISO
  coefficient: number
  gradeStudent: number // /20
  avgClass?: number // /20
  min?: number // /20
  max?: number // /20
  appreciation?: string
}

type SubjectNotes = {
  subjectId: string
  subjectName: string
  subjectCoeffTotal: number
  subjectAvgStudent: number // /20
  subjectAvgClass?: number // /20
  subjectMin?: number // /20
  subjectMax?: number // /20
  appreciation?: string
  evaluations: Evaluation[]
}

type StudentNotesResponse = {
  generalAverage: number // /20
  subjects: SubjectNotes[]
}

// ✅ MOCK DATA (à remplacer par ton fetch API)
const MOCK_DATA: StudentNotesResponse = {
  generalAverage: 14.25,
  subjects: [
    {
      subjectId: "math-1",
      subjectName: "Mathématiques",
      subjectCoeffTotal: 6,
      subjectAvgStudent: 15.5,
      subjectAvgClass: 12.8,
      subjectMin: 6.0,
      subjectMax: 18.5,
      appreciation: "Excellent travail, continuez ainsi !",
      evaluations: [
        {
          evaluationId: "eval-1",
          title: "Contrôle n°1 - Fonctions",
          date: "2025-10-15T00:00:00Z",
          coefficient: 2,
          gradeStudent: 16.0,
          avgClass: 13.2,
          min: 7.0,
          max: 18.5,
          appreciation: "Très bon travail",
        },
        {
          evaluationId: "eval-2",
          title: "Devoir maison - Géométrie",
          date: "2025-10-08T00:00:00Z",
          coefficient: 1,
          gradeStudent: 14.5,
          avgClass: 12.0,
          min: 6.0,
          max: 17.0,
          appreciation: "Bien, quelques imprécisions",
        },
        {
          evaluationId: "eval-3",
          title: "Contrôle n°2 - Algèbre",
          date: "2025-10-20T00:00:00Z",
          coefficient: 3,
          gradeStudent: 15.5,
          avgClass: 13.0,
          min: 8.0,
          max: 18.0,
        },
      ],
    },
    {
      subjectId: "phys-1",
      subjectName: "Physique-Chimie",
      subjectCoeffTotal: 4,
      subjectAvgStudent: 13.0,
      subjectAvgClass: 11.5,
      subjectMin: 5.0,
      subjectMax: 16.0,
      evaluations: [
        {
          evaluationId: "eval-4",
          title: "TP - Électricité",
          date: "2025-10-12T00:00:00Z",
          coefficient: 2,
          gradeStudent: 13.0,
          avgClass: 11.5,
          min: 5.0,
          max: 16.0,
        },
        {
          evaluationId: "eval-5",
          title: "Contrôle - Mécanique",
          date: "2025-10-19T00:00:00Z",
          coefficient: 2,
          gradeStudent: 13.0,
          avgClass: 11.5,
          min: 6.0,
          max: 15.5,
          appreciation: "Bon raisonnement",
        },
      ],
    },
  ],
}

export default function StudentNotesPage() {
  const [data, setData] = useState<StudentNotesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // ============================================
      // 🔌 REMPLACE CETTE SECTION PAR TON FETCH API RÉEL
      // ============================================
      // Exemple d'appel API réel :
      /*
      const response = await fetch('/api/grades/student/me', {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des notes')
      }
      
      const data = await response.json()
      setData(data)
      */
      
      // Pour l'instant, on simule un délai réseau avec le mock
      await new Promise((resolve) => setTimeout(resolve, 800))
      setData(MOCK_DATA)

    } catch (err) {
      console.error("[API] Error loading notes:", err)
      setError(err instanceof Error ? err.message : "Erreur lors du chargement des notes")
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground font-medium">Chargement de vos notes...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Erreur de chargement</h3>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                </div>
                <Button onClick={loadNotes} className="w-full">
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // ============================================
  // EMPTY STATE
  // ============================================
  if (!data || data.subjects.length === 0) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mes notes</h1>
            <p className="text-muted-foreground mt-1">
              Consultez vos résultats, moyennes et appréciations.
            </p>
          </div>

          {/* Empty state */}
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Aucune note disponible
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Vos notes apparaîtront ici dès qu'elles seront saisies par vos professeurs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // ============================================
  // MAIN CONTENT
  // ============================================
  const totalEvaluations = data.subjects.reduce((acc, s) => acc + s.evaluations.length, 0)

  return (
    <DashboardLayout requiredRole="student">
      <div className="space-y-6 pb-8">
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div className="border-b pb-6">
          <h1 className="text-4xl font-bold text-slate-900">Mes notes</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Consultez vos résultats, moyennes et appréciations.
          </p>
        </div>

        {/* ============================================ */}
        {/* MOYENNE GÉNÉRALE - HERO CARD */}
        {/* ============================================ */}
        <NotesSummaryCard
          generalAverage={data.generalAverage}
          totalSubjects={data.subjects.length}
          totalEvaluations={totalEvaluations}
        />

        {/* ============================================ */}
        {/* LAYOUT: Main content + Sidebar */}
        {/* ============================================ */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* LEFT COLUMN: Tables & Accordion */}
          <div className="space-y-6">
            {/* Synthèse par matière */}
            <SubjectSummaryTable subjects={data.subjects} />

            {/* Notes détaillées (Accordion) */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Notes détaillées</h2>
              <SubjectNotesAccordion subjects={data.subjects} />
            </div>
          </div>

          {/* RIGHT COLUMN: Stats panel */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <StatsPanel generalAverage={data.generalAverage} subjects={data.subjects} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}