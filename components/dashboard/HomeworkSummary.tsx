"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Calendar, 
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Award
} from "lucide-react"
import Link from "next/link"
import { UpcomingHomework, formatDueDate, isOverdue } from "@/lib/api/dashboard"

// =========================
// LISTE DE DEVOIRS
// =========================

interface HomeworkListProps {
  homework: UpcomingHomework[]
  title?: string
  emptyMessage?: string
  maxItems?: number
  viewAllLink?: string
  role: 'student' | 'teacher'
  showClass?: boolean
}

export function HomeworkList({
  homework,
  title = "Travail à faire",
  emptyMessage = "Aucun devoir à venir",
  maxItems = 5,
  viewAllLink,
  role,
  showClass = true,
}: HomeworkListProps) {
  const displayedHomework = homework.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
          {viewAllLink && homework.length > 0 && (
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
        {displayedHomework.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-500" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedHomework.map((item) => (
              <HomeworkCard
                key={item.id}
                homework={item}
                showClass={showClass}
                role={role}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface HomeworkCardProps {
  homework: UpcomingHomework
  showClass?: boolean
  role: 'student' | 'teacher'
}

function HomeworkCard({ homework, showClass = true, role }: HomeworkCardProps) {
  const overdue = isOverdue(homework.due_at)
  const dueDate = new Date(homework.due_at)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const isDueToday = dueDate.toDateString() === now.toDateString()
  const isDueTomorrow = dueDate.toDateString() === tomorrow.toDateString()

  return (
    <div 
      className={`
        p-3 rounded-lg border transition-all hover:shadow-sm
        ${overdue 
          ? 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10' 
          : isDueToday
            ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10'
            : 'border-border hover:border-primary/50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Indicateur couleur matière */}
        <div 
          className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
          style={{ backgroundColor: homework.subject_color || '#666' }}
        />

        <div className="flex-1 min-w-0">
          {/* Titre et matière */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2">{homework.title}</h4>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {homework.subject_name}
                </span>
                {showClass && homework.class_label && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {homework.class_label}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Badge statut */}
            {overdue ? (
              <Badge variant="destructive" className="flex-shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                En retard
              </Badge>
            ) : isDueToday ? (
              <Badge className="bg-amber-500 text-white flex-shrink-0">
                <Clock className="h-3 w-3 mr-1" />
                Aujourd'hui
              </Badge>
            ) : isDueTomorrow ? (
              <Badge variant="secondary" className="flex-shrink-0">
                Demain
              </Badge>
            ) : null}
          </div>

          {/* Description si présente */}
          {homework.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {homework.description}
            </p>
          )}

          {/* Date et points */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDueDate(homework.due_at)}
            </span>
            {homework.max_points && (
              <span className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                {homework.max_points} pts
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =========================
// WIDGET COMPACT
// =========================

interface HomeworkSummaryWidgetProps {
  homework: UpcomingHomework[]
  maxItems?: number
  viewAllLink?: string
}

export function HomeworkSummaryWidget({
  homework,
  maxItems = 3,
  viewAllLink,
}: HomeworkSummaryWidgetProps) {
  const displayedHomework = homework.slice(0, maxItems)
  const overdueCount = homework.filter(h => isOverdue(h.due_at)).length

  return (
    <div className="space-y-3">
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {overdueCount} devoir{overdueCount > 1 ? 's' : ''} en retard
          </span>
        </div>
      )}

      {displayedHomework.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-500" />
          <p className="text-xs">Tout est à jour !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedHomework.map((item) => (
            <div 
              key={item.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div 
                className="w-1 h-6 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.subject_color || '#666' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDueDate(item.due_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewAllLink && homework.length > maxItems && (
        <Link href={viewAllLink}>
          <Button variant="ghost" size="sm" className="w-full">
            Voir tous les devoirs
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  )
}