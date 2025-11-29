"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ClipboardList,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  attendanceApi, 
  type TeacherWeekCourse 
} from "@/lib/api/attendance"
import { 
  getWeekStart, 
  addWeeksToStart, 
  formatWeekLabel 
} from "@/lib/date"

// ============================================
// TYPES
// ============================================

interface DayCourses {
  dayOfWeek: number
  dayName: string
  date: string
  courses: TeacherWeekCourse[]
}

// ============================================
// CONSTANTES
// ============================================

const DAYS_OF_WEEK = [
  { day: 1, name: 'Dimanche' },
  { day: 2, name: 'Lundi' },
  { day: 3, name: 'Mardi' },
  { day: 4, name: 'Mercredi' },
  { day: 5, name: 'Jeudi' },
  // { day: 6, name: 'Vendredi' },
  // { day: 7, name: 'Samedi' },
]

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function AttendancePage() {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(() => getWeekStart())
  const [courses, setCourses] = useState<TeacherWeekCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les cours de la semaine
  const loadCourses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await attendanceApi.getTeacherWeek(weekStart)
      
      if (response.success) {
        setCourses(response.data)
      } else {
        setError('Erreur lors du chargement des cours')
      }
    } catch (err: any) {
      console.error('Erreur chargement cours:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  // Navigation semaines
  const goToPreviousWeek = () => {
    setWeekStart(addWeeksToStart(weekStart, -1))
  }

  const goToNextWeek = () => {
    setWeekStart(addWeeksToStart(weekStart, 1))
  }

  const goToCurrentWeek = () => {
    setWeekStart(getWeekStart())
  }

  // Grouper les cours par jour
  const coursesByDay = groupCoursesByDay(courses, weekStart)

  // Calculer les stats de la semaine
  const weekStats = calculateWeekStats(courses)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            📋 Mes présences
          </h1>
          <p className="text-gray-600">
            Gérez les présences de vos cours
          </p>
        </div>

        {/* Navigation semaine */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousWeek}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="text-lg font-medium">
                  {formatWeekLabel(weekStart)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToCurrentWeek}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Aujourd'hui
                </Button>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={goToNextWeek}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats de la semaine */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Cours"
            value={weekStats.totalCourses}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Présents"
            value={weekStats.totalPresent}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={<XCircle className="h-5 w-5" />}
            label="Absents"
            value={weekStats.totalAbsent}
            color="text-red-600"
            bgColor="bg-red-50"
          />
          <StatCard
            icon={<AlertCircle className="h-5 w-5" />}
            label="Retards"
            value={weekStats.totalLate}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadCourses}>Réessayer</Button>
          </Card>
        ) : courses.length === 0 ? (
          <Card className="p-8 text-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Aucun cours cette semaine
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {coursesByDay.map((day) => (
              <DaySection
                key={day.dayOfWeek}
                day={day}
                onCourseClick={(instanceId) => {
                  router.push(`/staff/attendance/${instanceId}`)
                }}
              />
            ))}
          </div>
        )}
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

function DaySection({
  day,
  onCourseClick,
}: {
  day: DayCourses
  onCourseClick: (instanceId: string) => void
}) {
  if (day.courses.length === 0) return null

  const dateObj = new Date(day.date)
  const isToday = dateObj.toDateString() === new Date().toDateString()

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className={cn(
          "text-lg font-semibold",
          isToday ? "text-blue-600" : "text-gray-900"
        )}>
          {day.dayName}
        </h2>
        <span className="text-sm text-gray-500">
          {dateObj.toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long' 
          })}
        </span>
        {isToday && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Aujourd'hui
          </Badge>
        )}
      </div>

      <div className="grid gap-3">
        {day.courses.map((course) => (
          <CourseCard
            key={course.instance_id}
            course={course}
            onClick={() => onCourseClick(course.instance_id)}
          />
        ))}
      </div>
    </div>
  )
}

function CourseCard({
  course,
  onClick,
}: {
  course: TeacherWeekCourse
  onClick: () => void
}) {
  const formatTime = (time: string) => time.slice(0, 5)
  
  const attendanceRate = course.total_students > 0
    ? Math.round(((course.present_count + course.late_count) / course.total_students) * 100)
    : null

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Barre couleur matière */}
          <div 
            className="w-1 h-full min-h-[60px] rounded-full"
            style={{ backgroundColor: course.subject_color }}
          />

          {/* Infos principales */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {course.subject_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {course.class_label}
                </p>
              </div>

              {/* Badge statut */}
              {course.has_session ? (
                <Badge 
                  variant="outline"
                  className={cn(
                    course.status === 'open' 
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  )}
                >
                  {course.status === 'open' ? 'En cours' : 'Terminé'}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  À faire
                </Badge>
              )}
            </div>

            {/* Infos secondaires */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(course.start_time)} - {formatTime(course.end_time)}
              </span>
              {course.room && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {course.room}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {course.total_students} élèves
              </span>
            </div>

            {/* Stats présence si session existe */}
            {course.has_session && (
              <div className="mt-3 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  {course.present_count} présents
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-3 w-3" />
                  {course.absent_count} absents
                </span>
                <span className="flex items-center gap-1 text-orange-600">
                  <AlertCircle className="h-3 w-3" />
                  {course.late_count} retards
                </span>
                {attendanceRate !== null && (
                  <span className={cn(
                    "font-medium",
                    attendanceRate >= 90 ? "text-green-600" :
                    attendanceRate >= 75 ? "text-orange-600" :
                    "text-red-600"
                  )}>
                    ({attendanceRate}%)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Flèche */}
          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// HELPERS
// ============================================

function groupCoursesByDay(
  courses: TeacherWeekCourse[],
  weekStart: string
): DayCourses[] {
  const weekStartDate = new Date(weekStart)

  return DAYS_OF_WEEK.map(({ day, name }) => {
    // Calculer la date pour ce jour
    const dayDate = new Date(weekStartDate)
    dayDate.setDate(dayDate.getDate() + (day - 1))

    const dayCourses = courses.filter(c => c.day_of_week === day)

    return {
      dayOfWeek: day,
      dayName: name,
      date: dayDate.toISOString().split('T')[0],
      courses: dayCourses,
    }
  }).filter(day => day.courses.length > 0)
}

function calculateWeekStats(courses: TeacherWeekCourse[]) {
  return {
    totalCourses: courses.length,
    totalPresent: courses.reduce((sum, c) => sum + c.present_count, 0),
    totalAbsent: courses.reduce((sum, c) => sum + c.absent_count, 0),
    totalLate: courses.reduce((sum, c) => sum + c.late_count, 0),
  }
}
