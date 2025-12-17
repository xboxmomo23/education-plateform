"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { 
  BookOpen, 
  FileText, 
  Mail, 
  AlertCircle,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2
} from "lucide-react"
import { getUserSession } from "@/lib/auth-new"
import { messagesApi } from "@/lib/api/messages"
import { assignmentsApi, Assignment } from "@/lib/api/assignments"
import { timetableApi, TimetableCourse } from "@/lib/api/timetable"
import { 
  KpiCard,
  FeedTimeline,
  TodayCourses,
  UpcomingLessons,
  HomeworkList,
  RecentGradesList,
  HomeworkSummaryWidget,
  RecentGradesWidget
} from "@/components/dashboard"
import { 
  FeedEvent, 
  TodayCourse, 
  UpcomingLesson, 
  UpcomingHomework,
  RecentGrade,
  formatDuration,
  formatTime
} from "@/lib/api/dashboard"
import { useI18n } from "@/components/providers/i18n-provider"

// =========================
// HELPERS
// =========================

function getTodayDateString(): string {
  const today = new Date()
  // Algérie: semaine dimanche-jeudi
  const dayOfWeek = today.getDay()
  return today.toISOString().split('T')[0]
}

function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date)
  // Semaine algérienne: commence le dimanche
  const day = d.getDay()
  const diff = day === 0 ? 0 : day // Si dimanche, pas de diff
  d.setDate(d.getDate() - diff)
  return d.toISOString().split('T')[0]
}

function transformCourseToTodayCourse(course: TimetableCourse): TodayCourse {
  return {
    id: course.id,
    subject_name: course.subject_name,
    subject_code: course.subject_code,
    subject_color: course.subject_color,
    teacher_name: course.teacher_name,
    teacher_id: course.teacher_id,
    start_time: course.start_time,
    end_time: course.end_time,
    room: course.room,
    day_of_week: course.day_of_week,
  }
}

function transformAssignmentToHomework(
  assignment: Assignment,
  fallbackSubject: string
): UpcomingHomework {
  return {
    id: assignment.id,
    title: assignment.title,
    subject_name: assignment.subject_name || fallbackSubject,
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

export default function StudentDashboardPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Données
  const [classId, setClassId] = useState<string | null>(null)
  const [todayCourses, setTodayCourses] = useState<TodayCourse[]>([])
  const [upcomingHomework, setUpcomingHomework] = useState<UpcomingHomework[]>([])
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([])
  const [recentGrades, setRecentGrades] = useState<RecentGrade[]>([])
  const [overdueHomeworkCount, setOverdueHomeworkCount] = useState(0)
  
  // KPIs
  const [kpis, setKpis] = useState({
    coursesToday: 0,
    totalDuration: 0,
    homeworkCount: 0,
    unreadMessages: 0,
    absencesCount: 0,
  })

  // Charger les données
  const loadData = useCallback(async (showLoader = true) => {
    const localeDateFormat = locale === "fr" ? "fr-FR" : "en-US"
    try {
      if (showLoader) setLoading(true)
      else setRefreshing(true)
      setError(null)

      const user = getUserSession()
      if (!user) {
        router.push('/login-eleve')
        return
      }

      let studentClassId: string | null = null
      let todayCoursesData: TodayCourse[] = []
      let totalMinutes = 0

      // 1. Récupérer la classe de l'élève depuis la session ou l'API
      try {
        // D'abord essayer depuis la session utilisateur (si disponible)
        const userAny = user as any
        if (userAny.class_id) {
          studentClassId = userAny.class_id
        } else {
          // Sinon essayer l'API
          const classRes = await timetableApi.getStudentClass()
          if (classRes.success && classRes.data?.classId) {
            studentClassId = classRes.data.classId
          } else if (classRes.success && (classRes.data as any)?.class_id) {
            studentClassId = (classRes.data as any).class_id
          }
        }
        
        if (studentClassId) {
          setClassId(studentClassId)

          // 2. Récupérer les cours du jour si classe trouvée
          const weekStart = getWeekStartDate()
          const timetableRes = await timetableApi.getClassTimetableForWeek(studentClassId, weekStart)
          
          const today = new Date()
          const todayDayOfWeek = today.getDay()
          
          if (timetableRes.success && timetableRes.data?.courses) {
            todayCoursesData = timetableRes.data.courses
              .filter((c: TimetableCourse) => c.day_of_week === todayDayOfWeek)
              .map(transformCourseToTodayCourse)
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
          }

          // Calculer la durée totale
          totalMinutes = todayCoursesData.reduce((sum, course) => {
            const [startH, startM] = course.start_time.split(':').map(Number)
            const [endH, endM] = course.end_time.split(':').map(Number)
            return sum + ((endH * 60 + endM) - (startH * 60 + startM))
          }, 0)
        } else {
          console.warn('Classe élève non trouvée - emploi du temps indisponible')
        }
      } catch (e) {
        console.error('Erreur récupération classe:', e)
        // On continue sans les cours - ce n'est pas bloquant
      }
      
      setTodayCourses(todayCoursesData)

      // 3. Récupérer les devoirs
      let homeworkData: UpcomingHomework[] = []
      let overdueCount = 0
      try {
        const homeworkRes = await assignmentsApi.getStudentAssignments()
        if (homeworkRes.success && homeworkRes.data) {
          const now = new Date()
          overdueCount = homeworkRes.data.filter(a => new Date(a.due_at) < now).length
          const unknownSubject = t("student.assignments.unknownSubject")
          homeworkData = homeworkRes.data
            .filter(a => new Date(a.due_at) >= now)
            .map((assignment) => transformAssignmentToHomework(assignment, unknownSubject))
            .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
        }
      } catch (e) {
        console.error('Erreur devoirs:', e)
      }
      setUpcomingHomework(homeworkData)
      setOverdueHomeworkCount(overdueCount)

      // 4. Récupérer les messages non lus
      let unreadCount = 0
      try {
        const messagesRes = await messagesApi.getUnreadCount()
        if (messagesRes.success) {
          unreadCount = messagesRes.data.count
        }
      } catch (e) {
        console.error('Erreur messages:', e)
      }

      // 5. Construire le fil d'actualités
      const events: FeedEvent[] = []
      
      // Devoirs récents (créés dans les 7 derniers jours)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      homeworkData
        .filter(a => {
          // Vérifier si le devoir a été créé récemment (on utilise due_at comme approximation)
          return true // Afficher tous les devoirs à venir
        })
        .slice(0, 5)
        .forEach(assignment => {
          events.push({
            id: `homework-${assignment.id}`,
            type: 'devoir',
            title: assignment.title,
            description: t("student.dashboard.feed.homeworkDue", {
              date: new Date(assignment.due_at).toLocaleDateString(localeDateFormat),
            }),
            date: assignment.due_at,
            link: `/eleve/devoirs`,
            metadata: {
              subjectName: assignment.subject_name,
              subjectColor: assignment.subject_color,
            }
          })
        })

      // Messages récents
      try {
        const inboxRes = await messagesApi.getInbox({ limit: 5 })
        if (inboxRes.success && inboxRes.data) {
          inboxRes.data
            .filter(m => new Date(m.created_at) >= sevenDaysAgo)
            .forEach(message => {
              events.push({
                id: `message-${message.id}`,
                type: 'message',
                title: message.subject,
                description: message.body?.slice(0, 100) + (message.body?.length > 100 ? '...' : ''),
                date: message.created_at,
                link: `/eleve/messages`,
                metadata: {
                  senderName: message.sender_name,
                }
              })
            })
        }
      } catch (e) {
        console.error('Erreur inbox:', e)
      }

      // Trier par date
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setFeedEvents(events)

      // 6. Notes récentes (mock - à remplacer par vraie API)
      // TODO: Implémenter l'API des notes
      setRecentGrades([])

      // Mettre à jour les KPIs
      setKpis({
        coursesToday: todayCoursesData.length,
        totalDuration: totalMinutes,
        homeworkCount: homeworkData.length,
        unreadMessages: unreadCount,
        absencesCount: 0, // TODO: Implémenter
      })

    } catch (err: any) {
      console.error('Erreur chargement dashboard:', err)
      setError(err.message || t("student.dashboard.errors.generic"))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [locale, router, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Actualiser
  const handleRefresh = () => {
    loadData(false)
  }

  // =========================
  // RENDU
  // =========================

  if (loading) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">{t("student.dashboard.loading")}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => loadData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("common.actions.retry")}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const user = getUserSession()
  const greeting = getGreeting(t)
  const dateFormatterLocale = locale === "fr" ? "fr-FR" : "en-US"
  const alertReasons = []
  if (overdueHomeworkCount > 0) {
    alertReasons.push(
      t("student.dashboard.alerts.overdueHomework", {
        count: overdueHomeworkCount,
        plural: overdueHomeworkCount > 1 ? "s" : "",
      })
    )
  }
  if (kpis.absencesCount > 0) {
    alertReasons.push(
      t("student.dashboard.alerts.absences", {
        count: kpis.absencesCount,
        plural: kpis.absencesCount > 1 ? "s" : "",
      })
    )
  }
  const showAlertBanner = alertReasons.length > 0

  return (
    <DashboardLayout requiredRole="student">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting}, {user?.full_name?.split(' ')[0] || t("student.dashboard.greetingFallback")} 👋
            </h1>
            <p className="mt-1 text-muted-foreground">
              {new Date().toLocaleDateString(dateFormatterLocale, { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t("common.actions.refresh")}
            </Button>
          </div>
        </div>

        {showAlertBanner && (
          <Alert variant="destructive" className="md:max-w-xl">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>{t("student.dashboard.alerts.title")}</AlertTitle>
            <AlertDescription>{alertReasons.join(" • ")}</AlertDescription>
          </Alert>
        )}

        <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title={t("student.dashboard.kpis.courses.title")}
            value={kpis.coursesToday}
            subtitle={kpis.totalDuration > 0 ? formatDuration(kpis.totalDuration) : t("student.dashboard.kpis.courses.empty")}
            icon={BookOpen}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            onClick={() => router.push('/eleve/emplois-du-temps')}
          />
          <KpiCard
            title={t("student.dashboard.kpis.homework.title")}
            value={kpis.homeworkCount}
            subtitle={
              kpis.homeworkCount > 0
                ? t("student.dashboard.kpis.homework.pending")
                : t("student.dashboard.kpis.homework.empty")
            }
            icon={FileText}
            iconColor="text-amber-600"
            iconBgColor="bg-amber-100 dark:bg-amber-900/30"
            onClick={() => router.push('/eleve/devoirs')}
          />
          <KpiCard
            title={t("student.dashboard.kpis.messages.title")}
            value={kpis.unreadMessages}
            subtitle={
              kpis.unreadMessages > 0
                ? t("student.dashboard.kpis.messages.unread")
                : t("student.dashboard.kpis.messages.empty")
            }
            icon={Mail}
            iconColor="text-violet-600"
            iconBgColor="bg-violet-100 dark:bg-violet-900/30"
            onClick={() => router.push('/eleve/messages')}
          />
          <KpiCard
            title={t("student.dashboard.kpis.attendance.title")}
            value={kpis.absencesCount}
            subtitle={
              kpis.absencesCount > 0
                ? t("student.dashboard.kpis.attendance.pending")
                : t("student.dashboard.kpis.attendance.empty")
            }
            icon={AlertCircle}
            iconColor={kpis.absencesCount > 0 ? "text-red-600" : "text-emerald-600"}
            iconBgColor={kpis.absencesCount > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}
            onClick={() => router.push('/eleve/assiduite')}
          />
        </div>

        <TodayCourses
          courses={todayCourses}
          title={t("student.dashboard.todayCourses.title")}
          emptyMessage={t("student.dashboard.todayCourses.empty")}
          role="student"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="hidden md:block">
              <FeedTimeline
                events={feedEvents}
                title={t("student.dashboard.feed.title")}
                emptyMessage={t("student.dashboard.feed.empty")}
                maxItems={8}
                showViewAll={feedEvents.length > 8}
              />
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {t("student.dashboard.homeworkCard.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HomeworkSummaryWidget 
                  homework={upcomingHomework}
                  maxItems={3}
                  viewAllLink="/eleve/devoirs"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {t("student.dashboard.gradesCard.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RecentGradesWidget 
                  grades={recentGrades}
                  maxItems={3}
                  viewAllLink="/eleve/notes"
                />
              </CardContent>
            </Card>

            <Card className="hidden md:block">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {t("student.dashboard.upcomingSessions.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Calendar className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  <p>{t("student.dashboard.upcomingSessions.description")}</p>
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => router.push('/eleve/emplois-du-temps')}
                  >
                    {t("student.dashboard.upcomingSessions.cta")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// =========================
// HELPER - Salutation
// =========================

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function getGreeting(t: TranslateFn): string {
  const hour = new Date().getHours()
  if (hour < 12) return t("student.dashboard.greetings.morning")
  if (hour < 18) return t("student.dashboard.greetings.afternoon")
  return t("student.dashboard.greetings.evening")
}
