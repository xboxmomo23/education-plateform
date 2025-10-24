import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen } from "lucide-react"

type SubjectNotes = {
  subjectId: string
  subjectName: string
  subjectCoeffTotal: number
  subjectAvgStudent: number
  subjectAvgClass?: number
  subjectMin?: number
  subjectMax?: number
  appreciation?: string
  evaluations: any[]
}

interface SubjectSummTableProps {
  subjects: SubjectNotes[]
}

export function SubjectSummTable({ subjects }: SubjectSummTableProps) {
  const getGradeColor = (grade: number): string => {
    if (grade >= 15) return "text-green-600 font-bold"
    if (grade >= 10) return "text-blue-600 font-semibold"
    return "text-red-600 font-bold"
  }

  const getGradeBg = (grade: number): string => {
    if (grade >= 15) return "bg-green-50"
    if (grade >= 10) return "bg-blue-50"
    return "bg-red-50"
  }

  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune matière disponible</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Synthèse par matière
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Matière
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-slate-700">
                  Coef. total
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-slate-700">
                  Moy. élève
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-slate-700">
                  Moy. classe
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-slate-700">
                  Min
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-slate-700">
                  Max
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Appréciation
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, index) => (
                <tr
                  key={subject.subjectId}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  }`}
                >
                  {/* Matière */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-medium text-slate-900">{subject.subjectName}</span>
                      <Badge variant="outline" className="text-xs">
                        {subject.evaluations.length} note{subject.evaluations.length > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </td>

                  {/* Coefficient */}
                  <td className="text-center py-3 px-3">
                    <Badge variant="secondary">{subject.subjectCoeffTotal}</Badge>
                  </td>

                  {/* Moyenne élève */}
                  <td className="text-center py-3 px-3">
                    <div
                      className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 ${getGradeBg(
                        subject.subjectAvgStudent
                      )}`}
                    >
                      <span className={`text-lg font-bold ${getGradeColor(subject.subjectAvgStudent)}`}>
                        {subject.subjectAvgStudent.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">/20</span>
                    </div>
                  </td>

                  {/* Moyenne classe */}
                  <td className="text-center py-3 px-3">
                    {subject.subjectAvgClass !== undefined ? (
                      <span className="text-sm text-slate-600">
                        {subject.subjectAvgClass.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Min */}
                  <td className="text-center py-3 px-3">
                    {subject.subjectMin !== undefined ? (
                      <span className="text-sm text-red-600 font-medium">
                        {subject.subjectMin.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Max */}
                  <td className="text-center py-3 px-3">
                    {subject.subjectMax !== undefined ? (
                      <span className="text-sm text-green-600 font-medium">
                        {subject.subjectMax.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Appréciation */}
                  <td className="py-3 px-4">
                    {subject.appreciation ? (
                      <p className="text-sm text-slate-600 italic truncate max-w-xs">
                        {subject.appreciation}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground">Aucune</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile responsive note */}
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Sur mobile, faites défiler horizontalement pour voir toutes les colonnes
        </p>
      </CardContent>
    </Card>
  )
}