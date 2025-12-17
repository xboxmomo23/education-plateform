import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"

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
  const { t } = useI18n()
  // Find best and worst subjects (ignorer ceux sans notes)
  const validSubjects = subjects.filter(s => s.subjectAvgStudent > 0)
  
  const sortedSubjects = [...validSubjects].sort(
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
            {t("notes.stats.generalAverage")}
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
              {t("notes.stats.bestSubject")}
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
              {t("notes.stats.evaluations", {
                count: bestSubject.evaluations.length,
                plural: bestSubject.evaluations.length > 1 ? "s" : "",
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Worst subject */}
      {worstSubject && validSubjects.length > 1 && worstSubject.subjectId !== bestSubject?.subjectId && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <TrendingDown className="h-4 w-4" />
              {t("notes.stats.needsWork")}
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
              {t("notes.stats.evaluations", {
                count: worstSubject.evaluations.length,
                plural: worstSubject.evaluations.length > 1 ? "s" : "",
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("notes.stats.summary.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("notes.stats.summary.subjects")}</span>
            <span className="font-semibold">{subjects.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("notes.stats.summary.evaluations")}</span>
            <span className="font-semibold">
              {subjects.reduce((acc, s) => acc + s.evaluations.length, 0)}
            </span>
          </div>
          {validSubjects.length > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("notes.stats.summary.highest")}</span>
                <span className="font-semibold text-green-600">
                  {bestSubject.subjectAvgStudent.toFixed(2)}
                </span>
              </div>
              {validSubjects.length > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("notes.stats.summary.lowest")}</span>
                  <span className="font-semibold text-orange-600">
                    {worstSubject.subjectAvgStudent.toFixed(2)}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
