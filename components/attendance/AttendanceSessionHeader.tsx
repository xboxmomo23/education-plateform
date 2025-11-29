"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { AttendanceSession } from "@/lib/api/attendance"

interface AttendanceSessionHeaderProps {
  session: AttendanceSession
  onClose?: () => void
  isClosing?: boolean
}

export function AttendanceSessionHeader({
  session,
  onClose,
  isClosing = false,
}: AttendanceSessionHeaderProps) {
  // Formater la date
  const sessionDate = new Date(session.session_date)
  const formattedDate = sessionDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Formater les heures
  const formatTime = (time: string) => time.slice(0, 5)

  // Calculer les stats
  const attendanceRate = session.total_students > 0
    ? Math.round(((session.present_count + session.late_count) / session.total_students) * 100)
    : 100

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* En-tête avec couleur matière */}
      <div 
        className="h-2 rounded-t-lg"
        style={{ backgroundColor: session.subject_color }}
      />
      
      <div className="p-6">
        {/* Navigation retour */}
        <div className="mb-4">
          <Link href="/staff/attendance">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Retour à mes cours
            </Button>
          </Link>
        </div>

        {/* Titre et badge statut */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: session.subject_color }}
              />
              <h1 className="text-2xl font-bold text-gray-900">
                {session.subject_name}
              </h1>
              <SessionStatusBadge status={session.status} />
            </div>
            <p className="text-gray-600">
              {session.class_label} • {session.teacher_name}
            </p>
          </div>

          {/* Bouton fermer session */}
          {session.status === 'open' && onClose && (
            <Button 
              onClick={onClose}
              disabled={isClosing}
              variant="outline"
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {isClosing ? 'Fermeture...' : 'Clôturer la session'}
            </Button>
          )}
        </div>

        {/* Infos du cours */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <InfoCard
            icon={<Calendar className="h-4 w-4" />}
            label="Date"
            value={formattedDate}
          />
          <InfoCard
            icon={<Clock className="h-4 w-4" />}
            label="Horaire"
            value={`${formatTime(session.start_time)} - ${formatTime(session.end_time)}`}
          />
          <InfoCard
            icon={<MapPin className="h-4 w-4" />}
            label="Salle"
            value={session.room || 'Non définie'}
          />
          <InfoCard
            icon={<Users className="h-4 w-4" />}
            label="Effectif"
            value={`${session.total_students} élèves`}
          />
        </div>

        {/* Stats de présence */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Taux de présence
            </span>
            <span className={cn(
              "text-lg font-bold",
              attendanceRate >= 90 ? "text-green-600" :
              attendanceRate >= 75 ? "text-orange-600" :
              "text-red-600"
            )}>
              {attendanceRate}%
            </span>
          </div>
          
          {/* Barre de progression */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                attendanceRate >= 90 ? "bg-green-500" :
                attendanceRate >= 75 ? "bg-orange-500" :
                "bg-red-500"
              )}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>

          {/* Compteurs détaillés */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <StatCounter
              icon={<CheckCircle className="h-4 w-4 text-green-600" />}
              count={session.present_count}
              label="Présents"
              color="text-green-600"
            />
            <StatCounter
              icon={<XCircle className="h-4 w-4 text-red-600" />}
              count={session.absent_count}
              label="Absents"
              color="text-red-600"
            />
            <StatCounter
              icon={<AlertCircle className="h-4 w-4 text-orange-600" />}
              count={session.late_count}
              label="Retards"
              color="text-orange-600"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SOUS-COMPOSANTS
// ============================================

function SessionStatusBadge({ status }: { status: AttendanceSession['status'] }) {
  const statusConfig = {
    open: {
      label: 'En cours',
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    closed: {
      label: 'Clôturée',
      className: 'bg-gray-100 text-gray-800 border-gray-300',
    },
    validated: {
      label: 'Validée',
      className: 'bg-blue-100 text-blue-800 border-blue-300',
    },
  }

  const config = statusConfig[status]

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

function InfoCard({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode
  label: string
  value: string 
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="text-gray-500 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function StatCounter({
  icon,
  count,
  label,
  color,
}: {
  icon: React.ReactNode
  count: number
  label: string
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className={cn("font-semibold", color)}>{count}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  )
}
