"use client"

import React, { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  BookOpen,
  Loader2,
  Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  attendanceApi, 
  type AttendanceHistoryItem,
  type AttendanceStats,
  getStatusLabel,
  getStatusColor,
} from "@/lib/api/attendance"
import { getWeekStart } from "@/lib/date"

// ============================================
// PAGE ASSIDUITÉ ÉLÈVE
// ============================================

export default function StudentAttendancePage() {
  const [history, setHistory] = useState<AttendanceHistoryItem[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les données de l'élève connecté
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // L'API utilise automatiquement l'utilisateur connecté
      // On récupère uniquement l'année scolaire en cours
      const currentYear = getCurrentSchoolYear()
      
      const response = await attendanceApi.getMyHistory({
        startDate: currentYear.start,
        endDate: currentYear.end,
        limit: 100,
      })

      if (response.success) {
        setHistory(response.data.history)
        setStats(response.data.stats)
      } else {
        setError('Erreur lors du chargement des données')
      }
    } catch (err: any) {
      console.error('Erreur chargement assiduité:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtrer uniquement les absences/retards (pas les présences)
  const absencesAndLates = history.filter(h => 
    h.status === 'absent' || h.status === 'late' || h.status === 'excused'
  )

  // Grouper par mois
  const groupedByMonth = groupByMonth(absencesAndLates)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement de votre assiduité...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            📊 Mon assiduité
          </h1>
          <p className="text-gray-600">
            Année scolaire {getCurrentSchoolYearLabel()}
          </p>
        </div>

        {/* Carte principale - Taux de présence */}
        {stats && (
          <Card className="mb-6 overflow-hidden">
            <div className={cn(
              "h-2",
              stats.rate >= 95 ? "bg-green-500" :
              stats.rate >= 85 ? "bg-orange-500" :
              "bg-red-500"
            )} />
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Taux de présence</p>
                  <p className={cn(
                    "text-4xl font-bold",
                    stats.rate >= 95 ? "text-green-600" :
                    stats.rate >= 85 ? "text-orange-600" :
                    "text-red-600"
                  )}>
                    {stats.rate}%
                  </p>
                </div>
                <div className={cn(
                  "p-4 rounded-full",
                  stats.rate >= 95 ? "bg-green-100" :
                  stats.rate >= 85 ? "bg-orange-100" :
                  "bg-red-100"
                )}>
                  <TrendingUp className={cn(
                    "h-8 w-8",
                    stats.rate >= 95 ? "text-green-600" :
                    stats.rate >= 85 ? "text-orange-600" :
                    "text-red-600"
                  )} />
                </div>
              </div>
              
              <Progress 
                value={stats.rate} 
                className="h-3 mb-4"
              />

              {/* Message encourageant ou d'alerte */}
              <div className={cn(
                "p-3 rounded-lg text-sm",
                stats.rate >= 95 ? "bg-green-50 text-green-800" :
                stats.rate >= 85 ? "bg-orange-50 text-orange-800" :
                "bg-red-50 text-red-800"
              )}>
                {stats.rate >= 95 ? (
                  <span>🎉 Excellent ! Continuez comme ça !</span>
                ) : stats.rate >= 85 ? (
                  <span>⚠️ Attention, votre taux de présence baisse. Essayez d'être plus régulier.</span>
                ) : (
                  <span>🚨 Votre assiduité nécessite une amélioration urgente.</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats détaillées */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<CheckCircle className="h-5 w-5" />}
              label="Présences"
              value={stats.present}
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <StatCard
              icon={<XCircle className="h-5 w-5" />}
              label="Absences"
              value={stats.absent}
              color="text-red-600"
              bgColor="bg-red-50"
            />
            <StatCard
              icon={<AlertCircle className="h-5 w-5" />}
              label="Retards"
              value={stats.late}
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
            <StatCard
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Excusés"
              value={stats.excused}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
          </div>
        )}

        {/* Historique des absences/retards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historique des absences et retards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {absencesAndLates.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">
                  Aucune absence ni retard cette année !
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Continuez sur cette lancée 🎉
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedByMonth).map(([month, items]) => (
                  <div key={month}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                      {month}
                    </h3>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <AbsenceRow key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info légale */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Information</p>
            <p>
              En cas d'absence, pensez à fournir un justificatif à la vie scolaire 
              dans les 48 heures. Les absences non justifiées peuvent impacter votre 
              dossier scolaire.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// COMPOSANTS
// ============================================

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  bgColor: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", bgColor, color)}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AbsenceRow({ item }: { item: AttendanceHistoryItem }) {
  const date = new Date(item.session_date)
  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      {/* Indicateur couleur matière */}
      <div 
        className="w-1 h-12 rounded-full flex-shrink-0"
        style={{ backgroundColor: item.subject_color }}
      />
      
      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900">
            {item.subject_name}
          </span>
          <Badge 
            variant="outline" 
            className={cn("text-xs", getStatusColor(item.status))}
          >
            {getStatusLabel(item.status)}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
          </span>
        </div>
      </div>

      {/* Minutes de retard si applicable */}
      {item.status === 'late' && item.late_minutes && (
        <div className="text-orange-600 text-sm font-medium">
          +{item.late_minutes} min
        </div>
      )}
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtenir les dates de l'année scolaire en cours
 * Année scolaire : septembre année N → juillet année N+1
 */
function getCurrentSchoolYear(): { start: string; end: string } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0 = janvier, 8 = septembre
  
  // Si on est entre janvier et août, l'année scolaire a commencé l'année précédente
  const startYear = currentMonth >= 8 ? currentYear : currentYear - 1
  const endYear = startYear + 1
  
  return {
    start: `${startYear}-09-01`,
    end: `${endYear}-07-31`,
  }
}

/**
 * Obtenir le label de l'année scolaire
 */
function getCurrentSchoolYearLabel(): string {
  const { start } = getCurrentSchoolYear()
  const startYear = parseInt(start.slice(0, 4))
  return `${startYear}-${startYear + 1}`
}

/**
 * Grouper les items par mois
 */
function groupByMonth(items: AttendanceHistoryItem[]): Record<string, AttendanceHistoryItem[]> {
  const grouped: Record<string, AttendanceHistoryItem[]> = {}
  
  for (const item of items) {
    const date = new Date(item.session_date)
    const monthKey = date.toLocaleDateString('fr-FR', { 
      month: 'long', 
      year: 'numeric' 
    })
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = []
    }
    grouped[monthKey].push(item)
  }
  
  return grouped
}
