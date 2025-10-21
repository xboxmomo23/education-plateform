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
        <div className="flex items-start justify-between">
          {/* Left: Icon & Title */}
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Moyenne générale
              </h3>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-6xl font-bold text-slate-900">
                  {generalAverage.toFixed(2)}
                </span>
                <span className="text-2xl text-muted-foreground font-medium">/20</span>
                {getTrend(generalAverage)}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge
                  className={`${appreciation.color} text-white px-3 py-1 text-sm font-medium`}
                >
                  {appreciation.icon} {appreciation.text}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="text-right space-y-2">
            <div className="rounded-lg bg-slate-50 px-4 py-2 border">
              <p className="text-xs text-muted-foreground">Matières</p>
              <p className="text-2xl font-bold text-slate-900">{totalSubjects}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-2 border">
              <p className="text-xs text-muted-foreground">Évaluations</p>
              <p className="text-2xl font-bold text-slate-900">{totalEvaluations}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}