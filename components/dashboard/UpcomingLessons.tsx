"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Clock, 
  MapPin,
  ChevronRight,
  User,
  BookOpen
} from "lucide-react"
import Link from "next/link"
import { UpcomingLesson, TodayCourse, formatTime } from "@/lib/api/dashboard"
import { useI18n } from "@/components/providers/i18n-provider"

// =========================
// SÉANCES DU JOUR
// =========================

interface TodayCoursesProps {
  courses: TodayCourse[]
  title?: string
  emptyMessage?: string
  role: 'student' | 'teacher'
  onAttendanceClick?: (courseId: string) => void
  onViewClick?: (courseId: string) => void
}

export function TodayCourses({
  courses,
  title,
  emptyMessage,
  role,
  onAttendanceClick,
  onViewClick,
}: TodayCoursesProps) {
  const { t } = useI18n()
  const resolvedTitle = title ?? (
    role === 'teacher'
      ? t("teacher.dashboard.sections.todayCourses.title")
      : t("student.dashboard.todayCourses.title")
  )
  const resolvedEmpty = emptyMessage ?? (
    role === 'teacher'
      ? t("teacher.dashboard.sections.todayCourses.empty")
      : t("student.dashboard.todayCourses.empty")
  )
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {resolvedTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{resolvedEmpty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <TodayCourseCard
                key={course.id}
                course={course}
                role={role}
                onAttendanceClick={onAttendanceClick}
                onViewClick={onViewClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TodayCourseCardProps {
  course: TodayCourse
  role: 'student' | 'teacher'
  onAttendanceClick?: (courseId: string) => void
  onViewClick?: (courseId: string) => void
}

function TodayCourseCard({ 
  course, 
  role,
  onAttendanceClick,
  onViewClick 
}: TodayCourseCardProps) {
  const { t } = useI18n()
  const now = new Date()
  const [startH, startM] = course.start_time.split(':').map(Number)
  const [endH, endM] = course.end_time.split(':').map(Number)
  
  const startDate = new Date()
  startDate.setHours(startH, startM, 0)
  
  const endDate = new Date()
  endDate.setHours(endH, endM, 0)
  
  const isOngoing = now >= startDate && now <= endDate
  const isPast = now > endDate
  const isFuture = now < startDate

  return (
    <div 
      className={`
        relative p-3 rounded-lg border transition-all
        ${isOngoing 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : isPast 
            ? 'border-border bg-muted/30 opacity-60' 
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
        }
      `}
    >
      {/* Indicateur en cours */}
      {isOngoing && (
        <div className="absolute -left-0.5 top-3 bottom-3 w-1 bg-primary rounded-full" />
      )}

      <div className="flex items-start gap-3">
        {/* Indicateur couleur matière */}
        <div 
          className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
          style={{ backgroundColor: course.subject_color || '#666' }}
        />

        <div className="flex-1 min-w-0">
          {/* En-tête */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h4 className="font-medium text-sm">{course.subject_name}</h4>
              {role === 'teacher' && course.class_label && (
                <p className="text-xs text-muted-foreground">{course.class_label}</p>
              )}
              {role === 'student' && course.teacher_name && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {course.teacher_name}
                </p>
              )}
            </div>
            
            {isOngoing && (
              <Badge className="bg-primary text-primary-foreground">
                {role === 'teacher'
                  ? t("teacher.dashboard.courseCard.ongoing")
                  : t("student.dashboard.todayCourses.ongoing")}
              </Badge>
            )}
          </div>

          {/* Horaires et salle */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(course.start_time)} - {formatTime(course.end_time)}
            </span>
            {course.room && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {course.room}
              </span>
            )}
          </div>

          {/* Actions pour professeur */}
          {role === 'teacher' && (
            <div className="flex items-center gap-2 mt-2">
              {onAttendanceClick && (
                <Button 
                  size="sm" 
                  variant={course.attendance_status === 'completed' ? 'secondary' : 'default'}
                  onClick={() => onAttendanceClick(course.id)}
                  className="h-7 text-xs"
                >
                  {course.attendance_status === 'completed' 
                    ? t("teacher.dashboard.courseCard.attendanceDone")
                    : course.attendance_status === 'partial'
                      ? t("teacher.dashboard.courseCard.attendanceContinue")
                      : t("teacher.dashboard.courseCard.attendanceDo")
                  }
                </Button>
              )}
              {onViewClick && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onViewClick(course.id)}
                  className="h-7 text-xs"
                >
                  {t("teacher.dashboard.courseCard.viewStudents")}
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
// SÉANCES À VENIR
// =========================

interface UpcomingLessonsProps {
  lessons: UpcomingLesson[]
  title?: string
  emptyMessage?: string
  maxItems?: number
  viewAllLink?: string
  role: 'student' | 'teacher'
}

export function UpcomingLessons({
  lessons,
  title = "Prochaines séances",
  emptyMessage = "Aucune séance à venir",
  maxItems = 5,
  viewAllLink,
  role,
}: UpcomingLessonsProps) {
  const displayedLessons = lessons.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
          {viewAllLink && lessons.length > 0 && (
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
        {displayedLessons.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedLessons.map((lesson) => (
              <div 
                key={lesson.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                {/* Indicateur couleur */}
                <div 
                  className="w-1 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: lesson.subject_color || '#666' }}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lesson.subject_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {role === 'teacher' && lesson.class_label && (
                      <span>{lesson.class_label}</span>
                    )}
                    {role === 'student' && lesson.teacher_name && (
                      <span>{lesson.teacher_name}</span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium">
                    {new Date(lesson.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(lesson.start_time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
