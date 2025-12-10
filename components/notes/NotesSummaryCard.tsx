import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface NotesSummaryCardProps {
  generalAverage: number
  totalSubjects: number
  totalEvaluations: number
}

export function NotesSummaryCard({
  generalAverage,
  totalSubjects,
  totalEvaluations,
}: NotesSummaryCardProps) {
  const getAppreciation = (avg: number) => {
    if (avg >= 16) return { text: "Excellent !", icon: "🎉", color: "bg-green-500" }
    if (avg >= 14) return { text: "Très bien", icon: "👏", color: "bg-blue-500" }
    if (avg >= 12) return { text: "Bien", icon: "👍", color: "bg-cyan-500" }
    if (avg >= 10) return { text: "Assez bien", icon: "✓", color: "bg-orange-400" }
    return { text: "À améliorer", icon: "💪", color: "bg-red-500" }
  }

  const getTrend = (avg: number) => {
    if (avg >= 12) return <TrendingUp className="h-6 w-6 text-green-600" />
    if (avg >= 10) return <Minus className="h-6 w-6 text-orange-500" />
    return <TrendingDown className="h-6 w-6 text-red-600" />
  }

  const appreciation = getAppreciation(generalAverage)

  return (
    <Card className="border-2 shadow-lg bg-gradient-to-br from-slate-50 to-white">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* Left: Icon & Title */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
            <div className="rounded-full bg-primary/10 p-3 self-start">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Moyenne générale
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-slate-900 sm:text-6xl">
                    {generalAverage.toFixed(2)}
                  </span>
                  <span className="text-2xl text-muted-foreground font-medium">/20</span>
                </div>
                {getTrend(generalAverage)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  className={`${appreciation.color} text-white px-3 py-1 text-sm font-medium`}
                >
                  {appreciation.icon} {appreciation.text}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-stretch sm:gap-4 md:w-auto md:flex-col md:text-right">
            <div className="flex-1 rounded-lg bg-slate-50 px-4 py-2 border md:flex-none">
              <p className="text-xs text-muted-foreground">Matières</p>
              <p className="text-2xl font-bold text-slate-900">{totalSubjects}</p>
            </div>
            <div className="flex-1 rounded-lg bg-slate-50 px-4 py-2 border md:flex-none">
              <p className="text-xs text-muted-foreground">Évaluations</p>
              <p className="text-2xl font-bold text-slate-900">{totalEvaluations}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
