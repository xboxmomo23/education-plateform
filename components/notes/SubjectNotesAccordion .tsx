import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Calendar, Award } from "lucide-react"
import { useState } from "react"

type Evaluation = {
  evaluationId: string
  title: string
  date: string
  coefficient: number
  gradeStudent: number
  avgClass?: number
  min?: number
  max?: number
  appreciation?: string
}

type SubjectNotes = {
  subjectId: string
  subjectName: string
  subjectCoeffTotal: number
  subjectAvgStudent: number
  subjectAvgClass?: number
  subjectMin?: number
  subjectMax?: number
  appreciation?: string
  evaluations: Evaluation[]
}

interface SubjectNotesAccordionProps {
  subjects: SubjectNotes[]
}

export default function SubjectNotesAccordion({ subjects }: SubjectNotesAccordionProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects)
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId)
    } else {
      newExpanded.add(subjectId)
    }
    setExpandedSubjects(newExpanded)
  }

  const getGradeColor = (grade: number): string => {
    if (grade >= 15) return "text-green-600"
    if (grade >= 10) return "text-blue-600"
    return "text-red-600"
  }

  const getGradeBg = (grade: number): string => {
    if (grade >= 15) return "bg-green-50 border-green-200"
    if (grade >= 10) return "bg-blue-50 border-blue-200"
    return "bg-red-50 border-red-200"
  }

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Aucune note détaillée disponible</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {subjects.map((subject) => {
        const isExpanded = expandedSubjects.has(subject.subjectId)

        return (
          <Card key={subject.subjectId} className="overflow-hidden">
            {/* Header - Clickable */}
            <button
              onClick={() => toggleSubject(subject.subjectId)}
              className="w-full text-left hover:bg-slate-50 transition-colors"
              aria-expanded={isExpanded}
              aria-controls={`subject-${subject.subjectId}-content`}
            >
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={`h-5 w-5 text-slate-600 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                    <div>
                      <CardTitle className="text-lg">{subject.subjectName}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {subject.evaluations.length} évaluation
                        {subject.evaluations.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Average badge */}
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <p className="text-xs text-muted-foreground">Moyenne matière</p>
                      <p className={`text-2xl font-bold ${getGradeColor(subject.subjectAvgStudent)}`}>
                        {subject.subjectAvgStudent.toFixed(2)}
                        <span className="text-sm text-muted-foreground">/20</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </button>

            {/* Content - Expandable */}
            {isExpanded && (
              <CardContent
                id={`subject-${subject.subjectId}-content`}
                className="pt-0 pb-4 border-t"
              >
                {subject.evaluations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune évaluation pour cette matière
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Évaluation
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Date
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Coef.
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Note
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Moy. classe
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Min
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Max
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Appréciation
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subject.evaluations.map((evaluation) => (
                          <tr
                            key={evaluation.evaluationId}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            {/* Title */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-medium text-slate-900">
                                  {evaluation.title}
                                </span>
                              </div>
                            </td>

                            {/* Date */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(evaluation.date)}
                              </div>
                            </td>

                            {/* Coefficient */}
                            <td className="py-3 px-3 text-center">
                              <Badge variant="outline" className="text-xs">
                                {evaluation.coefficient}
                              </Badge>
                            </td>

                            {/* Student grade */}
                            <td className="py-3 px-3 text-center">
                              <div
                                className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 border ${getGradeBg(
                                  evaluation.gradeStudent
                                )}`}
                              >
                                <span
                                  className={`text-base font-bold ${getGradeColor(
                                    evaluation.gradeStudent
                                  )}`}
                                >
                                  {evaluation.gradeStudent.toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">/20</span>
                              </div>
                            </td>

                            {/* Class average */}
                            <td className="py-3 px-3 text-center">
                              {evaluation.avgClass !== undefined ? (
                                <span className="text-sm text-slate-600">
                                  {evaluation.avgClass.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Min */}
                            <td className="py-3 px-3 text-center">
                              {evaluation.min !== undefined ? (
                                <span className="text-sm text-red-600">
                                  {evaluation.min.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Max */}
                            <td className="py-3 px-3 text-center">
                              {evaluation.max !== undefined ? (
                                <span className="text-sm text-green-600">
                                  {evaluation.max.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Appreciation */}
                            <td className="py-3 px-3">
                              {evaluation.appreciation ? (
                                <p className="text-xs text-slate-600 italic max-w-xs">
                                  {evaluation.appreciation}
                                </p>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}