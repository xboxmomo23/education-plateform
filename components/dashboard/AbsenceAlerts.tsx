"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AlertCircle, 
  Clock,
  ChevronRight,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { AbsenceAlert, formatTime } from "@/lib/api/dashboard"

// =========================
// LISTE D'ALERTES D'ABSENCES
// =========================

interface AbsenceAlertsListProps {
  absences: AbsenceAlert[]
  title?: string
  emptyMessage?: string
  maxItems?: number
  viewAllLink?: string
  onJustify?: (absenceId: string) => void
  onUpdateStatus?: (absenceId: string, status: 'absent' | 'late' | 'excused') => void
  showActions?: boolean
}

export function AbsenceAlertsList({
  absences,
  title = "Absences non justifiées",
  emptyMessage = "Aucune absence à traiter",
  maxItems = 10,
  viewAllLink,
  onJustify,
  onUpdateStatus,
  showActions = true,
}: AbsenceAlertsListProps) {
  const displayedAbsences = absences.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            {title}
            {absences.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {absences.length}
              </Badge>
            )}
          </CardTitle>
          {viewAllLink && absences.length > maxItems && (
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
        {displayedAbsences.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-500" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedAbsences.map((absence) => (
              <AbsenceAlertCard
                key={absence.id}
                absence={absence}
                onJustify={onJustify}
                onUpdateStatus={onUpdateStatus}
                showActions={showActions}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AbsenceAlertCardProps {
  absence: AbsenceAlert
  onJustify?: (absenceId: string) => void
  onUpdateStatus?: (absenceId: string, status: 'absent' | 'late' | 'excused') => void
  showActions?: boolean
}

function AbsenceAlertCard({ 
  absence, 
  onJustify, 
  onUpdateStatus,
  showActions = true 
}: AbsenceAlertCardProps) {
  const statusConfig = {
    absent: {
      label: 'Absent',
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      icon: XCircle,
    },
    late: {
      label: absence.late_minutes ? `Retard ${absence.late_minutes}min` : 'Retard',
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      icon: Clock,
    },
    excused: {
      label: 'Excusé',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      icon: CheckCircle,
    },
  }

  const config = statusConfig[absence.status]
  const StatusIcon = config.icon

  return (
    <div className="p-3 rounded-lg border border-border hover:border-primary/50 transition-all">
      <div className="flex items-start gap-3">
        {/* Indicateur couleur matière */}
        <div 
          className="w-1 h-full min-h-[50px] rounded-full flex-shrink-0"
          style={{ backgroundColor: absence.subject_color || '#666' }}
        />

        <div className="flex-1 min-w-0">
          {/* En-tête avec élève et statut */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h4 className="font-medium text-sm truncate">
                  {absence.student_name}
                </h4>
              </div>
              {absence.student_number && (
                <p className="text-xs text-muted-foreground ml-6">
                  N° {absence.student_number}
                </p>
              )}
            </div>
            
            <Badge className={config.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          </div>

          {/* Détails */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(absence.session_date).toLocaleDateString('fr-FR', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(absence.start_time)} - {formatTime(absence.end_time)}
            </span>
            <span>{absence.subject_name}</span>
            <span className="font-medium">{absence.class_label}</span>
          </div>

          {/* Justification si présente */}
          {absence.justified && absence.justification && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
              ✓ Justifié : {absence.justification}
            </p>
          )}

          {/* Actions */}
          {showActions && !absence.justified && (
            <div className="flex items-center gap-2 mt-2">
              {onJustify && (
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => onJustify(absence.id)}
                  className="h-7 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Justifier
                </Button>
              )}
              {onUpdateStatus && absence.status !== 'excused' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onUpdateStatus(absence.id, 'excused')}
                  className="h-7 text-xs"
                >
                  Marquer excusé
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =========================
// WIDGET COMPACT
// =========================

interface AbsenceSummaryWidgetProps {
  absences: AbsenceAlert[]
  maxItems?: number
  viewAllLink?: string
}

export function AbsenceSummaryWidget({
  absences,
  maxItems = 5,
  viewAllLink,
}: AbsenceSummaryWidgetProps) {
  const displayedAbsences = absences.slice(0, maxItems)
  const notJustifiedCount = absences.filter(a => !a.justified).length

  return (
    <div className="space-y-3">
      {notJustifiedCount > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {notJustifiedCount} absence{notJustifiedCount > 1 ? 's' : ''} non justifiée{notJustifiedCount > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {displayedAbsences.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <CheckCircle className="h-6 w-6 mx-auto mb-1 text-green-500" />
          <p className="text-xs">Aucune absence à traiter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedAbsences.map((item) => (
            <div 
              key={item.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div 
                className="w-1 h-6 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.subject_color || '#666' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.student_name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.class_label} • {new Date(item.session_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <Badge variant={item.status === 'absent' ? 'destructive' : 'secondary'} className="text-xs">
                {item.status === 'absent' ? 'Absent' : 'Retard'}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {viewAllLink && absences.length > maxItems && (
        <Link href={viewAllLink}>
          <Button variant="ghost" size="sm" className="w-full">
            Voir toutes les absences
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  )
}