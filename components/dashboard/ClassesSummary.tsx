"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  ChevronRight,
  UserX,
  Clock,
  GraduationCap
} from "lucide-react"
import Link from "next/link"
import { ClassSummary } from "@/lib/api/dashboard"

// =========================
// LISTE DE CLASSES
// =========================

interface ClassesListProps {
  classes: ClassSummary[]
  title?: string
  emptyMessage?: string
  maxItems?: number
  viewAllLink?: string
  onClassClick?: (classId: string) => void
  showStats?: boolean
}

export function ClassesList({
  classes,
  title = "Mes classes",
  emptyMessage = "Aucune classe assignée",
  maxItems = 10,
  viewAllLink,
  onClassClick,
  showStats = true,
}: ClassesListProps) {
  const displayedClasses = classes.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
          {viewAllLink && classes.length > maxItems && (
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
        {displayedClasses.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedClasses.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                onClick={onClassClick}
                showStats={showStats}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ClassCardProps {
  classItem: ClassSummary
  onClick?: (classId: string) => void
  showStats?: boolean
}

function ClassCard({ classItem, onClick, showStats = true }: ClassCardProps) {
  const hasIssues = (classItem.absent_today || 0) > 0 || (classItem.late_today || 0) > 0
  const label = classItem.label || 'Classe'

  const content = (
    <div 
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all
        ${onClick ? 'cursor-pointer hover:border-primary/50 hover:bg-accent/50' : 'border-border'}
        ${hasIssues ? 'border-amber-200 dark:border-amber-800/50' : ''}
      `}
      onClick={() => onClick?.(classItem.id)}
    >
      {/* Avatar/Icône classe */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <span className="text-sm font-bold text-primary">
          {label.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">{label}</h4>
          {classItem.level && (
            <Badge variant="secondary" className="text-xs">
              {classItem.level}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {classItem.student_count || 0} élève{(classItem.student_count || 0) > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Stats du jour */}
      {showStats && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {(classItem.absent_today || 0) > 0 && (
            <Badge variant="destructive" className="text-xs">
              <UserX className="h-3 w-3 mr-1" />
              {classItem.absent_today}
            </Badge>
          )}
          {(classItem.late_today || 0) > 0 && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {classItem.late_today}
            </Badge>
          )}
          {!hasIssues && (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              ✓ OK
            </Badge>
          )}
        </div>
      )}

      {onClick && (
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  )

  return content
}

// =========================
// WIDGET COMPACT
// =========================

interface ClassesSummaryWidgetProps {
  classes: ClassSummary[]
  maxItems?: number
  viewAllLink?: string
}

export function ClassesSummaryWidget({
  classes,
  maxItems = 4,
  viewAllLink,
}: ClassesSummaryWidgetProps) {
  const displayedClasses = classes.slice(0, maxItems)
  const totalAbsent = classes.reduce((sum, c) => sum + (c.absent_today || 0), 0)
  const totalLate = classes.reduce((sum, c) => sum + (c.late_today || 0), 0)

  return (
    <div className="space-y-3">
      {/* Résumé global */}
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
        <div className="flex-1 text-center">
          <p className="text-lg font-bold">{classes.length}</p>
          <p className="text-xs text-muted-foreground">Classes</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-red-600">{totalAbsent}</p>
          <p className="text-xs text-muted-foreground">Absents</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-amber-600">{totalLate}</p>
          <p className="text-xs text-muted-foreground">Retards</p>
        </div>
      </div>

      {/* Liste compacte */}
      {displayedClasses.length > 0 && (
        <div className="space-y-1">
          {displayedClasses.map((item) => {
            const label = item.label || 'Classe'
            return (
              <div 
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {label.slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {(item.absent_today || 0) > 0 && (
                    <span className="text-xs text-red-600 font-medium">
                      {item.absent_today} abs
                    </span>
                  )}
                  {(item.late_today || 0) > 0 && (
                    <span className="text-xs text-amber-600 font-medium">
                      {item.late_today} ret
                    </span>
                  )}
                  {(item.absent_today || 0) === 0 && (item.late_today || 0) === 0 && (
                    <span className="text-xs text-green-600">✓</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewAllLink && classes.length > maxItems && (
        <Link href={viewAllLink}>
          <Button variant="ghost" size="sm" className="w-full">
            Voir toutes les classes
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  )
}