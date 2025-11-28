"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { timetableApi, type TimetableCourse } from "@/lib/api/timetable"
import { Calendar, ChevronLeft, ChevronRight, Download, AlertCircle } from "lucide-react"

// Configuration Algérienne : Dimanche à Jeudi
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi']
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i) // 8h à 18h

// Helper pour obtenir le dimanche d'une semaine donnée
function getSundayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 0 : -day // Si dimanche (0), pas de changement, sinon revenir au dimanche
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Helper pour formater une date en YYYY-MM-DD
function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper pour formater la plage de dates
function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 4) // Dimanche à Jeudi = 5 jours
  
  const startDay = startDate.getDate()
  const startMonth = startDate.getMonth() + 1
  const endDay = endDate.getDate()
  const endMonth = endDate.getMonth() + 1
  
  if (startMonth === endMonth) {
    return `${startDay}-${endDay}/${startMonth}`
  } else {
    return `${startDay}/${startMonth} - ${endDay}/${endMonth}`
  }
}

export default function EleveEmploiDuTempsPage() {
  const [courses, setCourses] = useState<TimetableCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)
  const [classLabel, setClassLabel] = useState<string>('')
  const [weekOffset, setWeekOffset] = useState(0) // 0 = semaine actuelle
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getSundayOfWeek(new Date()))

  // Charger la classe de l'élève (une seule fois)
  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    const loadStudentClass = async () => {
      try {
        const response = await timetableApi.getStudentClass(controller.signal)
        if (isMounted && response.success) {
          setClassId(response.data.class_id)
          setClassLabel(response.data.label || response.data.class_label)
        } else if (isMounted) {
          setError('Classe non trouvée')
          setLoading(false)
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return
        console.error('Erreur chargement classe:', error)
        if (isMounted) {
          setError('Impossible de charger votre classe')
          setLoading(false)
        }
      }
    }

    loadStudentClass()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  // Calculer la date de début de semaine en fonction de l'offset
  useEffect(() => {
    const today = new Date()
    const sunday = getSundayOfWeek(today)
    sunday.setDate(sunday.getDate() + (weekOffset * 7))
    setCurrentWeekStart(sunday)
  }, [weekOffset])

  // Charger l'emploi du temps quand la classe et la semaine changent
  useEffect(() => {
    if (!classId) return

    const controller = new AbortController()
    let isMounted = true

    const loadTimetable = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const weekStartDate = formatDateForAPI(currentWeekStart)
        console.log('📅 Chargement emploi du temps:', { classId, weekStartDate })
        
        const response = await timetableApi.getClassTimetableForWeek(
          classId, 
          weekStartDate, 
          controller.signal
        )
        
        if (isMounted && response.success) {
          console.log(`✅ ${response.data.courses.length} cours chargés (mode: ${response.data.mode})`)
          setCourses(response.data.courses)
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return
        console.error('Erreur chargement emploi du temps:', error)
        if (isMounted) {
          setError('Impossible de charger l\'emploi du temps')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadTimetable()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [classId, currentWeekStart])

  const getCoursesForDay = (dayOfWeek: number) => {
    return courses.filter(c => c.day_of_week === dayOfWeek)
  }

  const getCoursePosition = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = (hours - 8) * 60 + minutes
    return (totalMinutes / 60) * 80 // 80px par heure
  }

  const getCourseHeight = (startTime: string, endTime: string) => {
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM)
    return (durationMinutes / 60) * 80
  }

  const goToPreviousWeek = () => setWeekOffset(prev => prev - 1)
  const goToNextWeek = () => setWeekOffset(prev => prev + 1)
  const goToCurrentWeek = () => setWeekOffset(0)

  return (
    <DashboardLayout requiredRole="student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mon Emploi du Temps</h1>
            <p className="text-muted-foreground">
              {classLabel && `Classe : ${classLabel}`}
            </p>
          </div>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Exporter PDF
          </Button>
        </div>

        {/* Navigation par semaine */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Semaine du {formatWeekRange(currentWeekStart)}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={goToPreviousWeek}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={goToCurrentWeek}
                  disabled={weekOffset === 0}
                >
                  Aujourd'hui
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={goToNextWeek}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <p className="mt-4 text-muted-foreground">Chargement...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            ) : (
              <>
                {/* Grille emploi du temps */}
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-2 min-w-[800px]">
                    {/* En-tête */}
                    <div className="text-sm font-medium text-muted-foreground">Heures</div>
                    {DAYS.map(day => (
                      <div key={day} className="text-sm font-medium text-center">
                        {day}
                      </div>
                    ))}

                    {/* Grille horaire */}
                    {HOURS.map(hour => (
                      <React.Fragment key={hour}>
                        <div className="text-sm text-muted-foreground py-2">
                          {hour}:00
                        </div>
                        {[1, 2, 3, 4, 5].map(day => {
                          const dayCourses = getCoursesForDay(day)
                          const hourCourses = dayCourses.filter(c => {
                            const [h] = c.start_time.split(':').map(Number)
                            return h === hour
                          })

                          return (
                            <div key={day} className="border border-gray-200 rounded p-1 min-h-[80px] relative">
                              {hourCourses.map(course => (
                                <div
                                  key={course.id}
                                  className={`absolute left-1 right-1 rounded px-2 py-1 text-xs overflow-hidden ${
                                    course.status === 'cancelled' ? 'opacity-50' : ''
                                  }`}
                                  style={{
                                    top: `${getCoursePosition(course.start_time) % 80}px`,
                                    height: `${getCourseHeight(course.start_time, course.end_time)}px`,
                                    backgroundColor: course.subject_color || '#3b82f6',
                                    color: 'white',
                                  }}
                                >
                                  <div className="font-semibold truncate">{course.subject_name}</div>
                                  <div className="truncate text-[10px]">{course.teacher_name}</div>
                                  <div className="truncate text-[10px]">
                                    {course.status === 'modified' && course.modifications?.new_room
                                      ? course.modifications.new_room
                                      : course.room}
                                  </div>
                                  <div className="text-[10px]">
                                    {course.start_time} - {course.end_time}
                                  </div>
                                  
                                  {/* Badge annulé */}
                                  {course.status === 'cancelled' && (
                                    <Badge variant="destructive" className="mt-1 text-[10px] px-1 py-0">
                                      🚫 ANNULÉ
                                    </Badge>
                                  )}
                                  
                                  {/* Badge modifié */}
                                  {course.status === 'modified' && (
                                    <Badge variant="secondary" className="mt-1 text-[10px] px-1 py-0 bg-orange-500 text-white">
                                      ⚠️ MODIFIÉ
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Légende */}
                {courses.some(c => c.status !== 'normal') && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Légende :</h4>
                    <div className="space-y-2 text-sm">
                      {courses.some(c => c.status === 'cancelled') && (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">🚫 ANNULÉ</Badge>
                          <span className="text-muted-foreground">Cours annulé</span>
                        </div>
                      )}
                      {courses.some(c => c.status === 'modified') && (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-500 text-white text-xs">⚠️ MODIFIÉ</Badge>
                          <span className="text-muted-foreground">Cours modifié (salle ou horaire changé)</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Modifications détaillées */}
                {courses.filter(c => c.status === 'modified').length > 0 && (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      Cours modifiés cette semaine :
                    </h4>
                    <div className="space-y-2">
                      {courses.filter(c => c.status === 'modified').map(course => (
                        <div key={course.id} className="text-sm bg-white p-3 rounded border">
                          <div className="font-medium">{course.subject_name}</div>
                          <div className="text-muted-foreground text-xs mt-1">
                            {DAYS[course.day_of_week - 1]} • {course.start_time} - {course.end_time}
                          </div>
                          {course.modifications && (
                            <div className="mt-2 space-y-1 text-xs">
                              {course.modifications.new_room && (
                                <div>
                                  <span className="text-red-600 line-through">{course.modifications.original_room}</span>
                                  {' → '}
                                  <span className="text-green-600 font-medium">{course.modifications.new_room}</span>
                                </div>
                              )}
                              {course.modifications.new_start_time && (
                                <div>
                                  <span className="text-red-600 line-through">
                                    {course.modifications.original_start_time} - {course.modifications.original_end_time}
                                  </span>
                                  {' → '}
                                  <span className="text-green-600 font-medium">
                                    {course.modifications.new_start_time} - {course.modifications.new_end_time}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statistiques */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {courses.filter(c => c.status !== 'cancelled').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Cours cette semaine</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {courses
                        .filter(c => c.status !== 'cancelled')
                        .reduce((sum, c) => {
                          const [sh, sm] = c.start_time.split(':').map(Number)
                          const [eh, em] = c.end_time.split(':').map(Number)
                          return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60
                        }, 0)
                        .toFixed(1)}h
                    </div>
                    <div className="text-sm text-muted-foreground">Heures totales</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">
                      {new Set(courses.map(c => c.subject_name)).size}
                    </div>
                    <div className="text-sm text-muted-foreground">Matières</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}