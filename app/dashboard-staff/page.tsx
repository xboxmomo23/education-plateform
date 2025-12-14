"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  UserX,
  UserCheck,
  Clock,
  Mail, 
  AlertCircle,
  AlertTriangle,
  Calendar,
  ChevronRight,
  RefreshCw,
  Loader2,
  Send,
  Settings,
  FileText,
  CheckCircle,
  XCircle,
  LayoutGrid
} from "lucide-react"
import Link from "next/link"
import { getUserSession } from "@/lib/auth-new"
import { messagesApi, InboxMessage } from "@/lib/api/messages"
import { dashboardStaffApi } from "@/lib/api/dashboard-staff"
import { 
  KpiCard,
  ClassesSummaryWidget,
  QuickActionsGrid,
} from "@/components/dashboard"
import { 
  AbsenceAlert,
  ClassSummary,
  DailyEvent,
  formatTime,
  formatRelativeDate
} from "@/lib/api/dashboard"

// =========================
// TYPES ADDITIONNELS
// =========================

interface StaffStats {
  presentToday: number
  absentToday: number
  lateToday: number
  notJustified: number
  unreadMessages: number
  studentsTotal: number
  classesCount: number
}

// =========================
// COMPOSANT PRINCIPAL
// =========================

export default function StaffDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Données
  const [stats, setStats] = useState<StaffStats>({
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    notJustified: 0,
    unreadMessages: 0,
    studentsTotal: 0,
    classesCount: 0,
  })
  const [pendingAbsences, setPendingAbsences] = useState<AbsenceAlert[]>([])
  const [classes, setClasses] = useState<ClassSummary[]>([])
  const [recentMessages, setRecentMessages] = useState<InboxMessage[]>([])
  const [dailyEvents] = useState<DailyEvent[]>([])

  // Charger les données
  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      else setRefreshing(true)
      setError(null)

      const user = getUserSession()
      if (!user) {
        router.push('/login-staff')
        return
      }

      // 1. KPI + pending absences + classes summary
      const [kpiRes, pendingRes, classesRes] = await Promise.all([
        dashboardStaffApi.getKpis(),
        dashboardStaffApi.getPendingAbsences(8),
        dashboardStaffApi.getClassesSummary(),
      ])

      if (kpiRes.success && kpiRes.data) {
        setStats({
          presentToday: kpiRes.data.present_today,
          absentToday: kpiRes.data.absent_today,
          lateToday: kpiRes.data.late_today,
          notJustified: kpiRes.data.not_justified_today,
          unreadMessages: kpiRes.data.unread_messages,
          studentsTotal: kpiRes.data.students_total,
          classesCount: kpiRes.data.classes_count,
        })
      }

      if (pendingRes.success && Array.isArray(pendingRes.data)) {
        const pending = pendingRes.data.map((absence) => ({
          id: absence.id,
          student_id: absence.student_id,
          student_name: absence.student_name,
          student_number: absence.student_number || undefined,
          class_label: absence.class_label,
          class_id: absence.class_id,
          subject_name: absence.subject_name,
          subject_color: absence.subject_color || '#6b7280',
          session_date: absence.session_date,
          start_time: absence.start_time,
          end_time: absence.end_time,
          status: absence.status,
          late_minutes: absence.late_minutes || undefined,
          justified: absence.justified,
        }))
        setPendingAbsences(pending)
      } else {
        setPendingAbsences([])
      }

      if (classesRes.success && Array.isArray(classesRes.data)) {
        const mappedClasses = classesRes.data.map<ClassSummary>((classe) => ({
          id: classe.class_id,
          label: classe.class_label,
          level: classe.level || '',
          student_count: classe.students_count,
          absent_today: classe.absent_today,
          late_today: classe.late_today,
        }))
        setClasses(mappedClasses)
      } else {
        setClasses([])
      }

      // 2. Récupérer les messages récents (lecture)
      let messagesData: InboxMessage[] = []
      try {
        const inboxRes = await messagesApi.getInbox({ limit: 5 })
        if (inboxRes.success) {
          messagesData = inboxRes.data
        }
      } catch (e) {
        console.error('Erreur messages:', e)
      }
      setRecentMessages(messagesData)

    } catch (err: any) {
      console.error('Erreur chargement dashboard:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => loadData(false)

  const handleJustifyAbsence = (absenceId: string) => {
    router.push(`/staff/absences?justify=${absenceId}`)
  }

  // Actions rapides
  const quickActions = [
    {
      id: 'absences',
      label: 'Gérer les absences',
      icon: UserX,
      href: '/staff/absences',
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      id: 'timetable',
      label: 'Emplois du temps',
      icon: Calendar,
      href: '/staff/emplois-du-temps',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      id: 'message',
      label: 'Envoyer un message',
      icon: Send,
      href: '/staff/messages?compose=true',
      color: 'text-violet-600',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    },
    {
      id: 'courses',
      label: 'Gérer les cours',
      icon: LayoutGrid,
      href: '/staff/cours',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  ]

  // =========================
  // RENDU
  // =========================

  if (loading) {
    return (
      <DashboardLayout requiredRole="staff">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Chargement de votre espace...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout requiredRole="staff">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => loadData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const user = getUserSession()
  const greeting = getGreeting()

  return (
    <DashboardLayout requiredRole="staff">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
        
        {/* En-tête */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting}, {user?.full_name?.split(' ')[0] || 'Personnel'} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Présents"
            value={stats.presentToday}
            subtitle="élèves aujourd'hui"
            icon={UserCheck}
            iconColor="text-emerald-600"
            iconBgColor="bg-emerald-100 dark:bg-emerald-900/30"
          />
          <KpiCard
            title="Absents"
            value={stats.absentToday}
            subtitle="aujourd'hui"
            icon={UserX}
            iconColor={stats.absentToday > 0 ? "text-red-600" : "text-gray-500"}
            iconBgColor={stats.absentToday > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-800"}
            onClick={() => router.push('/staff/absences')}
          />
          <KpiCard
            title="Non justifiées"
            value={stats.notJustified}
            subtitle="à traiter"
            icon={AlertTriangle}
            iconColor={stats.notJustified > 0 ? "text-amber-600" : "text-gray-500"}
            iconBgColor={stats.notJustified > 0 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-gray-100 dark:bg-gray-800"}
            onClick={() => router.push('/staff/absences?filter=notJustified')}
          />
          <KpiCard
            title="Messages"
            value={stats.unreadMessages}
            subtitle={stats.unreadMessages > 0 ? 'non lus' : 'Tout est lu'}
            icon={Mail}
            iconColor="text-violet-600"
            iconBgColor="bg-violet-100 dark:bg-violet-900/30"
            onClick={() => router.push('/staff/messages')}
          />
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonne principale (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Alertes prioritaires */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Alertes prioritaires
                    {pendingAbsences.length > 0 && (
                      <Badge variant="destructive">{pendingAbsences.length}</Badge>
                    )}
                  </CardTitle>
                  <Link href="/staff/absences">
                    <Button variant="ghost" size="sm">
                      Voir tout
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {pendingAbsences.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
                    <p className="font-medium">Aucune alerte en attente</p>
                    <p className="text-sm mt-1">Toutes les absences ont été traitées</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingAbsences.slice(0, 5).map((absence) => (
                      <AbsenceAlertCard
                        key={absence.id}
                        absence={absence}
                        onJustify={() => handleJustifyAbsence(absence.id)}
                      />
                    ))}
                    {pendingAbsences.length > 5 && (
                      <Link href="/staff/absences">
                        <Button variant="outline" className="w-full">
                          Voir les {pendingAbsences.length - 5} autres absences
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vue journée */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Vue de la journée
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyEvents.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun événement particulier aujourd'hui</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dailyEvents.map((event) => (
                      <DailyEventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}

                {/* Résumé des classes */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Résumé par classe</h4>
                  {classes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Aucune classe assignée</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {classes.slice(0, 6).map((classItem) => (
                        <div 
                          key={classItem.id}
                          className="p-2 rounded-lg bg-muted/50 text-center"
                        >
                          <p className="font-medium text-sm">{classItem.label || 'Classe'}</p>
                          <div className="flex items-center justify-center gap-2 mt-1 text-xs">
                            <span className="text-muted-foreground">
                              {classItem.student_count || 0} élèves
                            </span>
                            {classItem.absent_today > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {classItem.absent_today} abs
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            
            {/* Actions rapides */}
            <QuickActionsGrid 
              actions={quickActions}
              title="Actions rapides"
              columns={2}
            />

            {/* Messages récents */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Messages récents
                  </CardTitle>
                  <Link href="/staff/messages">
                    <Button variant="ghost" size="sm">
                      Voir tout
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentMessages.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Mail className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Aucun message</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentMessages.slice(0, 4).map((message) => (
                      <Link key={message.id} href={`/staff/messages?id=${message.id}`}>
                        <div 
                          className={`p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${
                            !message.read_at ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${!message.read_at ? 'font-semibold' : 'font-medium'}`}>
                                {message.subject}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {message.sender_name} • {formatRelativeDate(message.created_at)}
                              </p>
                            </div>
                            {!message.read_at && (
                              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Classes gérées */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Classes gérées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClassesSummaryWidget 
                  classes={classes}
                  maxItems={5}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// =========================
// COMPOSANTS ADDITIONNELS
// =========================

interface AbsenceAlertCardProps {
  absence: AbsenceAlert
  onJustify: () => void
}

function AbsenceAlertCard({ absence, onJustify }: AbsenceAlertCardProps) {
  return (
    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
      <div className="flex items-start gap-3">
        <div 
          className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
          style={{ backgroundColor: absence.subject_color || '#666' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm">{absence.student_name}</p>
              <p className="text-xs text-muted-foreground">
                {absence.class_label} • {absence.subject_name}
              </p>
            </div>
            <Badge variant={absence.status === 'absent' ? 'destructive' : 'secondary'}>
              {absence.status === 'absent' ? 'Absent' : 'Retard'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>
              {new Date(absence.session_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
            <span>{formatTime(absence.start_time)}</span>
          </div>
          <div className="mt-2">
            <Button size="sm" onClick={onJustify}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Justifier
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DailyEventCardProps {
  event: DailyEvent
}

function DailyEventCard({ event }: DailyEventCardProps) {
  const typeConfig = {
    reunion: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Users },
    examen: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', icon: FileText },
    evenement: { color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30', icon: Calendar },
    modification: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: AlertCircle },
  }

  const config = typeConfig[event.type]
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
      <div className={`p-2 rounded-lg ${config.bg}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{event.title}</p>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {event.time && <span>{event.time}</span>}
          {event.location && <span>• {event.location}</span>}
        </div>
      </div>
    </div>
  )
}

// =========================
// HELPER
// =========================

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}
