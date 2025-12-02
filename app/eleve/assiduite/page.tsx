"use client"

import React, { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { 
  Calendar,
  Clock,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  attendanceApi, 
  type AttendanceHistoryItem,
  type AttendanceStats,
  getStatusLabel,
} from "@/lib/api/attendance"

// ============================================
// PAGE ASSIDUITÉ ÉLÈVE (SIMPLIFIÉE)
// ============================================

export default function EleveAssiduitePage() {
  const [history, setHistory] = useState<AttendanceHistoryItem[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les données de l'élève connecté
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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

  // Filtrer : uniquement absences et retards (PAS les présences)
  const absencesAndLates = history.filter(h => 
    h.status === 'absent' || h.status === 'late' || h.status === 'excused'
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement...</span>
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
          <Button onClick={loadData}>Réessayer</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mon assiduité</h1>
          <p className="text-gray-500 text-sm">
            Année {getCurrentSchoolYearLabel()}
          </p>
        </div>

        {/* Cercle de présence */}
        {stats && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-8">
                {/* Cercle */}
                <AttendanceDonut stats={stats} />
                
                {/* Légende */}
                <div className="space-y-3">
                  <LegendItem 
                    color="bg-green-500" 
                    label="Présences" 
                    value={stats.present} 
                  />
                  <LegendItem 
                    color="bg-red-500" 
                    label="Absences" 
                    value={stats.absent} 
                  />
                  <LegendItem 
                    color="bg-orange-500" 
                    label="Retards" 
                    value={stats.late} 
                  />
                  <LegendItem 
                    color="bg-blue-500" 
                    label="Excusés" 
                    value={stats.excused} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liste des absences/retards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Mes absences et retards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {absencesAndLates.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-gray-600 font-medium">Aucune absence ni retard !</p>
                <p className="text-sm text-gray-400 mt-1">Continuez comme ça 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {absencesAndLates.map((item) => (
                  <AbsenceItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700">
            En cas d'absence, fournissez un justificatif à la vie scolaire dans les 48h.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// COMPOSANT CERCLE (DONUT CHART)
// ============================================

function AttendanceDonut({ stats }: { stats: AttendanceStats }) {
  const total = stats.total || 1 // Éviter division par 0
  
  // Calculer les pourcentages
  const presentPercent = (stats.present / total) * 100
  const absentPercent = (stats.absent / total) * 100
  const latePercent = (stats.late / total) * 100
  const excusedPercent = (stats.excused / total) * 100

  // Calculer les positions pour le cercle SVG
  const radius = 60
  const circumference = 2 * Math.PI * radius
  
  // Offsets cumulatifs pour positionner chaque segment
  let offset = 0
  
  const segments = [
    { percent: presentPercent, color: '#22c55e', label: 'Présent' },  // vert
    { percent: absentPercent, color: '#ef4444', label: 'Absent' },    // rouge
    { percent: latePercent, color: '#f97316', label: 'Retard' },      // orange
    { percent: excusedPercent, color: '#3b82f6', label: 'Excusé' },   // bleu
  ].filter(s => s.percent > 0)

  // Si tout est présent, cercle entièrement vert
  const isAllPresent = stats.absent === 0 && stats.late === 0 && stats.excused === 0

  return (
    <div className="relative">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Cercle de fond (gris clair) */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="20"
        />
        
        {isAllPresent ? (
          // Tout présent = cercle vert complet
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth="20"
            strokeLinecap="round"
          />
        ) : (
          // Segments colorés
          segments.map((segment, index) => {
            const strokeDasharray = `${(segment.percent / 100) * circumference} ${circumference}`
            const strokeDashoffset = -offset
            offset += (segment.percent / 100) * circumference
            
            return (
              <circle
                key={index}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="20"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            )
          })
        )}
      </svg>
      
      {/* Texte au centre */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className={cn(
            "text-2xl font-bold",
            stats.rate >= 90 ? "text-green-600" :
            stats.rate >= 75 ? "text-orange-600" :
            "text-red-600"
          )}>
            {stats.rate}%
          </span>
          <p className="text-xs text-gray-500">présence</p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// COMPOSANTS
// ============================================

function LegendItem({ 
  color, 
  label, 
  value 
}: { 
  color: string
  label: string
  value: number 
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-3 h-3 rounded-full", color)} />
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function AbsenceItem({ item }: { item: AttendanceHistoryItem }) {
  const date = new Date(item.session_date)
  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  // Déterminer si c'est justifié (excused = justifié)
  const isJustified = item.status === 'excused'
  
  // Couleurs selon le statut
  const statusConfig = {
    absent: { 
      bg: 'bg-red-50', 
      border: 'border-red-200', 
      text: 'text-red-700',
      label: 'Absent'
    },
    late: { 
      bg: 'bg-orange-50', 
      border: 'border-orange-200', 
      text: 'text-orange-700',
      label: 'Retard'
    },
    excused: { 
      bg: 'bg-blue-50', 
      border: 'border-blue-200', 
      text: 'text-blue-700',
      label: 'Excusé'
    },
  }

  const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.absent

  return (
    <div className={cn(
      "p-3 rounded-lg border flex items-center justify-between",
      config.bg,
      config.border
    )}>
      <div className="flex items-center gap-3">
        {/* Indicateur couleur matière */}
        <div 
          className="w-1 h-10 rounded-full"
          style={{ backgroundColor: item.subject_color }}
        />
        
        <div>
          <p className="font-medium text-gray-900 text-sm">
            {item.subject_name}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{item.start_time.slice(0, 5)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Minutes de retard */}
        {item.status === 'late' && item.late_minutes && (
          <span className="text-xs text-orange-600 font-medium">
            +{item.late_minutes}min
          </span>
        )}
        
        {/* Badge statut */}
        <Badge 
          variant="outline" 
          className={cn("text-xs", config.text, config.border, config.bg)}
        >
          {config.label}
          {isJustified && (
            <ShieldCheck className="h-3 w-3 ml-1" />
          )}
        </Badge>
      </div>
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function getCurrentSchoolYear(): { start: string; end: string } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  
  const startYear = currentMonth >= 8 ? currentYear : currentYear - 1
  const endYear = startYear + 1
  
  return {
    start: `${startYear}-09-01`,
    end: `${endYear}-07-31`,
  }
}

function getCurrentSchoolYearLabel(): string {
  const { start } = getCurrentSchoolYear()
  const startYear = parseInt(start.slice(0, 4))
  return `${startYear}-${startYear + 1}`
}