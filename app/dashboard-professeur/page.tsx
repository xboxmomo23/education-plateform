"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  FileText, 
  Mail, 
  AlertCircle,
  Calendar,
  Clock,
  Users,
  ClipboardCheck,
  Plus,
  ChevronRight,
  RefreshCw,
  Loader2,
  UserCheck,
  GraduationCap
} from "lucide-react"
import Link from "next/link"
import { getUserSession } from "@/lib/auth-new"
import { messagesApi, InboxMessage } from "@/lib/api/messages"
import { assignmentsApi, Assignment } from "@/lib/api/assignments"
import { timetableApi, TimetableCourse } from "@/lib/api/timetable"
import { attendanceApi } from "@/lib/api/attendance"
import { 
  KpiCard,
  TodayCourses,
  HomeworkList,
  AbsenceSummaryWidget,
  ClassesSummaryWidget,
} from "@/components/dashboard"
import { 
  TodayCourse, 
  UpcomingHomework,
  AbsenceAlert,
  ClassSummary,
  formatDuration,
  formatTime,
  formatRelativeDate
} from "@/lib/api/dashboard"

// =========================
// HELPERS
// =========================

function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 0 : day
  d.setDate(d.getDate() - diff)
  return d.toISOString().split('T')[0]
}

function transformCourseToTodayCourse(course: TimetableCourse): TodayCourse {
  return {
    id: course.id,
    subject_name: course.subject_name,
    subject_code: course.subject_code,
    subject_color: course.subject_color,
    class_label: course.class_label,
    class_id: course.class_id,
    start_time: course.start_time,
    end_time: course.end_time,
    room: course.room,
    day_of_week: course.day_of_week,
    has_attendance: false,
    attendance_status: 'pending',
  }
}

function transformAssignmentToHomework(assignment: Assignment): UpcomingHomework {
  return {
    id: assignment.id,
    title: assignment.title,
    subject_name: assignment.subject_name || 'Inconnu',
    subject_color: assignment.subject_color || '#666',
    class_label: assignment.class_label,
    due_at: assignment.due_at,
    description: assignment.description || undefined,
    max_points: assignment.max_points || undefined,
  }
}

// =========================
// COMPOSANT PRINCIPAL
// =========================

export default function TeacherDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Données
  const [todayCourses, setTodayCourses] = useState<TodayCourse[]>([])
  const [recentHomework, setRecentHomework] = useState<UpcomingHomework[]>([])
  const [recentAbsences, setRecentAbsences] = useState<AbsenceAlert[]>([])
  const [classes, setClasses] = useState<ClassSummary[]>([])
  const [recentMessages, setRecentMessages] = useState<InboxMessage[]>([])
  
  // KPIs
  const [kpis, setKpis] = useState({
    coursesToday: 0,
    totalDuration: 0,
    homeworkToCorrect: 0,
    pendingAttendance: 0,
    unreadMessages: 0,
  })

  // Charger les données
  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      else setRefreshing(true)
      setError(null)

      const user = getUserSession()
      if (!user) {
        router.push('/login-professeur')
        return
      }

      // 1. Récupérer les cours du jour
      const weekStart = getWeekStartDate()
      const timetableRes = await timetableApi.getTeacherTimetableForWeek(user.id, weekStart)
      
      const today = new Date()
      const todayDayOfWeek = today.getDay()
      
      let todayCoursesData: TodayCourse[] = []
      if (timetableRes.success && timetableRes.data?.courses) {
        todayCoursesData = timetableRes.data.courses
          .filter((c: TimetableCourse) => c.day_of_week === todayDayOfWeek)
          .map(transformCourseToTodayCourse)
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
      }

      if (todayCoursesData.length > 0) {
        try {
          const statusRes = await attendanceApi.getSessionsStatus(todayCoursesData.map((course) => course.id))
          if (statusRes.success && statusRes.data) {
            todayCoursesData = todayCoursesData.map((course) => {
              const status = statusRes.data[course.id]
              if (!status) {
                return course
              }
              return {
                ...course,
                has_attendance: status.has_attendance,
                attendance_status: status.attendance_status,
              }
            })
          }
        } catch (statusError) {
          console.error('Erreur récupération statut présence:', statusError)
        }
      }

      setTodayCourses(todayCoursesData)

      // Calculer la durée totale
      const totalMinutes = todayCoursesData.reduce((sum, course) => {
        const [startH, startM] = course.start_time.split(':').map(Number)
        const [endH, endM] = course.end_time.split(':').map(Number)
        return sum + ((endH * 60 + endM) - (startH * 60 + startM))
      }, 0)

      // Compter les appels en attente
      const pendingAttendance = todayCoursesData.filter(c => !c.has_attendance).length

      // 2. Récupérer les devoirs du professeur
      const homeworkRes = await assignmentsApi.getTeacherAssignments({ status: 'published' })
      let homeworkData: UpcomingHomework[] = []
      if (homeworkRes.success && homeworkRes.data) {
        homeworkData = homeworkRes.data
          .slice(0, 10)
          .map(transformAssignmentToHomework)
      }
      setRecentHomework(homeworkData)

      // Compter les devoirs dont la date est passée (à corriger)
      const overdueCount = homeworkRes.success && homeworkRes.data
        ? homeworkRes.data.filter(a => new Date(a.due_at) < new Date()).length
        : 0

      // 3. Récupérer les messages non lus
      let unreadCount = 0
      let messagesData: InboxMessage[] = []
      try {
        const messagesRes = await messagesApi.getUnreadCount()
        if (messagesRes.success) {
          unreadCount = messagesRes.data.count
        }
        const inboxRes = await messagesApi.getInbox({ limit: 5 })
        if (inboxRes.success) {
          messagesData = inboxRes.data
        }
      } catch (e) {
        console.error('Erreur messages:', e)
      }
      setRecentMessages(messagesData)

      // 4. Récupérer les classes (via les cours)
      const coursesRes = await assignmentsApi.getTeacherCourses()
      let classesData: ClassSummary[] = []
      if (coursesRes.success && coursesRes.data) {
        const uniqueClasses = new Map<string, ClassSummary>()
        coursesRes.data.forEach((course: any) => {
          if (!uniqueClasses.has(course.class_id)) {
            uniqueClasses.set(course.class_id, {
              id: course.class_id,
              label: course.class_label,
              level: course.class_level,
              student_count: 0, // TODO: récupérer le vrai nombre
              absent_today: 0,
              late_today: 0,
            })
          }
        })
        classesData = Array.from(uniqueClasses.values())
      }
      setClasses(classesData)

      // 5. Absences / retards récents
      try {
        const absencesRes = await attendanceApi.getTeacherRecentAbsences({
          date: new Date().toISOString().slice(0, 10),
          limit: 8,
        })
        if (absencesRes.success && absencesRes.data) {
          setRecentAbsences(absencesRes.data)
        } else {
          setRecentAbsences([])
        }
      } catch (absError) {
        console.error('Erreur absences récentes:', absError)
        setRecentAbsences([])
      }

      // Mettre à jour les KPIs
      setKpis({
        coursesToday: todayCoursesData.length,
        totalDuration: totalMinutes,
        homeworkToCorrect: overdueCount,
        pendingAttendance: pendingAttendance,
        unreadMessages: unreadCount,
      })

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

  const handleAttendanceClick = (courseId: string) => {
    router.push(`/professeur/presence?instance=${courseId}`)
  }

  const handleViewStudents = (courseId: string) => {
    // TODO: Navigation vers la vue élèves
    console.log('View students for course:', courseId)
  }

  // =========================
  // RENDU
  // =========================

  if (loading) {
    return (
      <DashboardLayout requiredRole="teacher">
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
      <DashboardLayout requiredRole="teacher">
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
    <DashboardLayout requiredRole="teacher">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
        
        {/* En-tête */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting}, {user?.full_name?.split(' ')[0] || 'Professeur'} 👋
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
            <Link href="/professeur/devoirs">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau devoir
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Cours aujourd'hui"
            value={kpis.coursesToday}
            subtitle={kpis.totalDuration > 0 ? formatDuration(kpis.totalDuration) : 'Aucun cours'}
            icon={BookOpen}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            onClick={() => router.push('/professeur/emplois-du-temps')}
          />
          <KpiCard
            title="Devoirs à corriger"
            value={kpis.homeworkToCorrect}
            subtitle={kpis.homeworkToCorrect > 0 ? 'date limite passée' : 'Aucun en attente'}
            icon={FileText}
            iconColor="text-amber-600"
            iconBgColor="bg-amber-100 dark:bg-amber-900/30"
            onClick={() => router.push('/professeur/devoirs')}
          />
          <KpiCard
            title="Appels à faire"
            value={kpis.pendingAttendance}
            subtitle={kpis.pendingAttendance > 0 ? 'cours non pointés' : 'Tout est fait !'}
            icon={ClipboardCheck}
            iconColor={kpis.pendingAttendance > 0 ? "text-red-600" : "text-emerald-600"}
            iconBgColor={kpis.pendingAttendance > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}
            onClick={() => router.push('/professeur/presence')}
          />
          <KpiCard
            title="Messages"
            value={kpis.unreadMessages}
            subtitle={kpis.unreadMessages > 0 ? 'non lus' : 'Tout est lu'}
            icon={Mail}
            iconColor="text-violet-600"
            iconBgColor="bg-violet-100 dark:bg-violet-900/30"
            onClick={() => router.push('/professeur/messages')}
          />
        </div>

        {/* Section Aujourd'hui */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonne principale (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Cours du jour avec actions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Mes cours aujourd'hui
                  </CardTitle>
                  <Link href="/professeur/emplois-du-temps">
                    <Button variant="ghost" size="sm">
                      Voir la semaine
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {todayCourses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Pas de cours aujourd'hui 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayCourses.map((course) => (
                      <TeacherCourseCard
                        key={course.id}
                        course={course}
                        onAttendanceClick={() => handleAttendanceClick(course.id)}
                        onViewClick={() => handleViewStudents(course.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* À traiter */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  À traiter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Devoirs à corriger */}
                {kpis.homeworkToCorrect > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="font-medium text-sm">Devoirs en retard</p>
                          <p className="text-xs text-muted-foreground">
                            {kpis.homeworkToCorrect} devoir{kpis.homeworkToCorrect > 1 ? 's' : ''} dont la date limite est passée
                          </p>
                        </div>
                      </div>
                      <Link href="/professeur/devoirs">
                        <Button size="sm" variant="outline">
                          Voir
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Messages non lus */}
                {kpis.unreadMessages > 0 && (
                  <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-violet-600" />
                        <div>
                          <p className="font-medium text-sm">Messages non lus</p>
                          <p className="text-xs text-muted-foreground">
                            {kpis.unreadMessages} message{kpis.unreadMessages > 1 ? 's' : ''} en attente
                          </p>
                        </div>
                      </div>
                      <Link href="/professeur/messages">
                        <Button size="sm" variant="outline">
                          Voir
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {kpis.homeworkToCorrect === 0 && kpis.unreadMessages === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <UserCheck className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">Tout est à jour ! 🎉</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            
            {/* Mes classes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Mes classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClassesSummaryWidget 
                  classes={classes}
                  maxItems={5}
                />
              </CardContent>
            </Card>

            {/* Absences / retards récents */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  Absences & retards récents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AbsenceSummaryWidget 
                  absences={recentAbsences}
                  maxItems={5}
                  viewAllLink="/professeur/presence"
                />
              </CardContent>
            </Card>

            {/* Devoirs récents */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Devoirs publiés
                  </CardTitle>
                  <Link href="/professeur/devoirs">
                    <Button variant="ghost" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Nouveau
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentHomework.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Aucun devoir publié</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentHomework.slice(0, 4).map((homework) => (
                      <div 
                        key={homework.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div 
                          className="w-1 h-6 rounded-full flex-shrink-0"
                          style={{ backgroundColor: homework.subject_color || '#666' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{homework.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {homework.class_label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages récents */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Messages récents
                  </CardTitle>
                  <Link href="/professeur/messages">
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
                    {recentMessages.slice(0, 3).map((message) => (
                      <div 
                        key={message.id}
                        className={`p-2 rounded-lg hover:bg-accent/50 transition-colors ${
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// =========================
// COMPOSANT COURS PROFESSEUR
// =========================

interface TeacherCourseCardProps {
  course: TodayCourse
  onAttendanceClick: () => void
  onViewClick: () => void
}

function TeacherCourseCard({ course, onAttendanceClick, onViewClick }: TeacherCourseCardProps) {
  const now = new Date()
  const [startH, startM] = course.start_time.split(':').map(Number)
  const [endH, endM] = course.end_time.split(':').map(Number)
  
  const startDate = new Date()
  startDate.setHours(startH, startM, 0)
  
  const endDate = new Date()
  endDate.setHours(endH, endM, 0)
  
  const isOngoing = now >= startDate && now <= endDate
  const isPast = now > endDate

  return (
    <div 
      className={`
        relative p-4 rounded-lg border transition-all
        ${isOngoing 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : isPast 
            ? 'border-border bg-muted/30 opacity-70' 
            : 'border-border hover:border-primary/50'
        }
      `}
    >
      {isOngoing && (
        <div className="absolute -left-0.5 top-4 bottom-4 w-1 bg-primary rounded-full" />
      )}

      <div className="flex items-start gap-4">
        {/* Couleur matière */}
        <div 
          className="w-1.5 h-full min-h-[60px] rounded-full flex-shrink-0"
          style={{ backgroundColor: course.subject_color || '#666' }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h4 className="font-semibold">{course.subject_name}</h4>
              <p className="text-sm text-muted-foreground">{course.class_label}</p>
            </div>
            {isOngoing && (
              <Badge className="bg-primary text-primary-foreground">En cours</Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(course.start_time)} - {formatTime(course.end_time)}
            </span>
            {course.room && (
              <span>Salle {course.room}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant={course.attendance_status === 'completed' ? 'secondary' : 'default'}
              onClick={onAttendanceClick}
            >
              <ClipboardCheck className="h-4 w-4 mr-1" />
              {course.attendance_status === 'completed' ? 'Appel fait' : 'Faire l\'appel'}
            </Button>
            <Button size="sm" variant="outline" onClick={onViewClick}>
              <Users className="h-4 w-4 mr-1" />
              Élèves
            </Button>
            <Link href="/professeur/devoirs">
              <Button size="sm" variant="ghost">
                <Plus className="h-4 w-4 mr-1" />
                Devoir
              </Button>
            </Link>
          </div>
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
