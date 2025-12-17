import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Calendar, Award } from "lucide-react"
import { useState } from "react"
import { useI18n } from "@/components/providers/i18n-provider"


type Evaluation = {
  gradeId: string
  evaluationId: string
  title: string
  date: string
  coefficient: number
  gradeStudent: number | null
  absent: boolean
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

export function SubjectNotesAccordion({ subjects }: SubjectNotesAccordionProps) {
  const { t, locale } = useI18n()
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const localeCode = locale === "fr" ? "fr-FR" : "en-US"

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
    return date.toLocaleDateString(localeCode, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t("notes.accordion.empty")}</p>
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
                        {t("notes.accordion.evaluations", {
                          count: subject.evaluations.length,
                          plural: subject.evaluations.length > 1 ? "s" : "",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Average badge */}
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <p className="text-xs text-muted-foreground">{t("notes.accordion.subjectAverage")}</p>
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
                <div className="grid gap-3 py-4 md:grid-cols-5">
                  <SummaryStat
                    label={t("notes.table.headers.studentAverage")}
                    value={
                      subject.subjectAvgStudent
                        ? `${subject.subjectAvgStudent.toFixed(2)}/20`
                        : "—"
                    }
                  />
                  <SummaryStat
                    label={t("notes.table.headers.classAverage")}
                    value={
                      subject.subjectAvgClass !== undefined
                        ? `${subject.subjectAvgClass.toFixed(2)}/20`
                        : "—"
                    }
                  />
                  <SummaryStat
                    label={t("notes.table.headers.min")}
                    value={
                      subject.subjectMin !== undefined
                        ? subject.subjectMin.toFixed(2)
                        : "—"
                    }
                  />
                  <SummaryStat
                    label={t("notes.table.headers.max")}
                    value={
                      subject.subjectMax !== undefined
                        ? subject.subjectMax.toFixed(2)
                        : "—"
                    }
                  />
                  <SummaryStat
                    label={t("notes.table.headers.coefficient")}
                    value={subject.subjectCoeffTotal.toFixed(2)}
                  />
                </div>
                {subject.evaluations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t("notes.accordion.noEvaluations")}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            {t("notes.accordion.headers.evaluation")}
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            {t("notes.accordion.headers.date")}
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            {t("notes.accordion.headers.coefficient")}
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            {t("notes.accordion.headers.grade")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {subject.evaluations.map((evaluation) => (
                          <tr
                            key={evaluation.gradeId}  
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
                              {evaluation.appreciation && (
                                <p className="mt-1 text-xs italic text-muted-foreground">
                                  {evaluation.appreciation}
                                </p>
                              )}
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
                              {evaluation.absent ? (
                                <Badge variant="secondary" className="text-sm">
                                  {t("notes.accordion.status.absent")}
                                </Badge>
                              ) : evaluation.gradeStudent != null ? (
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
                                    {Number(evaluation.gradeStudent).toFixed(2)}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-1">/20</span>
                                </div>
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 px-3 py-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}
