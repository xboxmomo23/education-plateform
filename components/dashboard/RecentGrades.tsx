"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react"
import Link from "next/link"
import { RecentGrade, formatRelativeDate } from "@/lib/api/dashboard"

// =========================
// LISTE DE NOTES
// =========================

interface RecentGradesListProps {
  grades: RecentGrade[]
  title?: string
  emptyMessage?: string
  maxItems?: number
  viewAllLink?: string
}

export function RecentGradesList({
  grades,
  title = "Dernières évaluations",
  emptyMessage = "Aucune note récente",
  maxItems = 5,
  viewAllLink,
}: RecentGradesListProps) {
  const displayedGrades = grades.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
          {viewAllLink && grades.length > 0 && (
            <Link 
              href={viewAllLink}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Voir tout
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayedGrades.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <BarChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedGrades.map((grade) => (
              <GradeCard key={grade.id} grade={grade} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface GradeCardProps {
  grade: RecentGrade
}

function GradeCard({ grade }: GradeCardProps) {
  // Calcul du pourcentage pour déterminer la qualité
  const percentage = (grade.value / grade.max_value) * 100
  
  const getGradeStyle = () => {
    if (percentage >= 80) return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      icon: TrendingUp,
    }
    if (percentage >= 60) return {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      icon: Minus,
    }
    if (percentage >= 40) return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      icon: Minus,
    }
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      icon: TrendingDown,
    }
  }

  const style = getGradeStyle()
  const TrendIcon = style.icon

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-all">
      {/* Indicateur couleur matière */}
      <div 
        className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
        style={{ backgroundColor: grade.subject_color || '#666' }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {grade.evaluation_title}
            </h4>
            <p className="text-xs text-muted-foreground">
              {grade.subject_name}
            </p>
          </div>

          {/* Note */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${style.bg}`}>
            <span className={`text-lg font-bold ${style.text}`}>
              {grade.value}
            </span>
            <span className="text-xs text-muted-foreground">
              /{grade.max_value}
            </span>
          </div>
        </div>

        {/* Métadonnées */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{formatRelativeDate(grade.date)}</span>
          {grade.coefficient !== 1 && (
            <Badge variant="secondary" className="text-xs">
              Coef. {grade.coefficient}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

// =========================
// WIDGET COMPACT
// =========================

interface RecentGradesWidgetProps {
  grades: RecentGrade[]
  maxItems?: number
  viewAllLink?: string
}

export function RecentGradesWidget({
  grades,
  maxItems = 3,
  viewAllLink,
}: RecentGradesWidgetProps) {
  const displayedGrades = grades.slice(0, maxItems)

  // Calcul de la moyenne
  const average = grades.length > 0
    ? grades.reduce((sum, g) => sum + (g.value / g.max_value) * 20, 0) / grades.length
    : null

  return (
    <div className="space-y-3">
      {/* Moyenne */}
      {average !== null && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
          <span className="text-sm text-muted-foreground">Moyenne récente</span>
          <span className={`text-lg font-bold ${
            average >= 14 ? 'text-emerald-600' :
            average >= 10 ? 'text-blue-600' :
            average >= 8 ? 'text-amber-600' :
            'text-red-600'
          }`}>
            {average.toFixed(1)}/20
          </span>
        </div>
      )}

      {displayedGrades.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <BarChart className="h-6 w-6 mx-auto mb-1 opacity-50" />
          <p className="text-xs">Aucune note récente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedGrades.map((grade) => {
            const percentage = (grade.value / grade.max_value) * 100
            const color = percentage >= 60 ? 'text-emerald-600' : 
                         percentage >= 40 ? 'text-amber-600' : 
                         'text-red-600'

            return (
              <div 
                key={grade.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div 
                  className="w-1 h-6 rounded-full flex-shrink-0"
                  style={{ backgroundColor: grade.subject_color || '#666' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{grade.evaluation_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {grade.subject_name}
                  </p>
                </div>
                <span className={`text-sm font-bold ${color}`}>
                  {grade.value}/{grade.max_value}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {viewAllLink && grades.length > maxItems && (
        <Link href={viewAllLink} className="block">
          <span className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
            Voir toutes les notes
            <ChevronRight className="h-3 w-3" />
          </span>
        </Link>
      )}
    </div>
  )
}