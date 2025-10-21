import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react"

type SubjectNotes = {
  subjectId: string
  subjectName: string
  subjectAvgStudent: number
  evaluations: any[]
}

interface StatsPanelProps {
  generalAverage: number
  subjects: SubjectNotes[]
}

export function StatsPanel({ generalAverage, subjects }: StatsPanelProps) {
  // Find best and worst subjects
  const sortedSubjects = [...subjects].sort(
    (a, b) => b.subjectAvgStudent - a.subjectAvgStudent
  )

  const bestSubject = sortedSubjects[0]
  const worstSubject = sortedSubjects[sortedSubjects.length - 1]

  const getGradeColor = (grade: number): string => {
    if (grade >= 15) return "text-green-600"
    if (grade >= 10) return "text-blue-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-4">
      {/* General average card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Moyenne générale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900">{generalAverage.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">/20</p>
          </div>
        </CardContent>
      </Card>

      {/* Best subject */}
      {bestSubject && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <TrendingUp className="h-4 w-4" />
              Meilleure matière
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold text-slate-900 mb-2">
              {bestSubject.subjectName}
            </p>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-bold ${getGradeColor(bestSubject.subjectAvgStudent)}`}>
                {bestSubject.subjectAvgStudent.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">/20</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {bestSubject.evaluations.length} évaluation
              {bestSubject.evaluations.length > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Worst subject */}
      {worstSubject && subjects.length > 1 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <TrendingDown className="h-4 w-4" />
              À améliorer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold text-slate-900 mb-2">
              {worstSubject.subjectName}
            </p>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-bold ${getGradeColor(worstSubject.subjectAvgStudent)}`}>
                {worstSubject.subjectAvgStudent.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">/20</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {worstSubject.evaluations.length} évaluation
              {worstSubject.evaluations.length > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Résumé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Matières</span>
            <span className="font-semibold">{subjects.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Évaluations totales</span>
            <span className="font-semibold">
              {subjects.reduce((acc, s) => acc + s.evaluations.length, 0)}
            </span>
          </div>
          {subjects.length > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Moy. la + haute</span>
                <span className="font-semibold text-green-600">
                  {bestSubject.subjectAvgStudent.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Moy. la + basse</span>
                <span className="font-semibold text-orange-600">
                  {worstSubject.subjectAvgStudent.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}