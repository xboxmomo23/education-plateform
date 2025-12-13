"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { timetableApi, type TimetableCourse } from "@/lib/api/timetable"
import { parentApi } from "@/lib/api/parent"
import { Calendar, ChevronLeft, ChevronRight, Download, AlertCircle } from "lucide-react"
import { addDays, format } from "date-fns"
import { fr } from "date-fns/locale"
import { useParentChild } from "@/components/parent/ParentChildContext"

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"]
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i)
const WEEK_DAY_INDICES = [1, 2, 3, 4, 5]

function getSundayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 0 : -day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 4)

  const startDay = startDate.getDate()
  const startMonth = startDate.getMonth() + 1
  const endDay = endDate.getDate()
  const endMonth = endDate.getMonth() + 1

  if (startMonth === endMonth) {
    return `${startDay}-${endDay}/${startMonth}`
  }
  return `${startDay}/${startMonth} - ${endDay}/${endMonth}`
}

export default function ParentEmploiDuTempsPage() {
  const { selectedChild } = useParentChild()
  const child = selectedChild ?? null

  const [courses, setCourses] = useState<TimetableCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)
  const [classLabel, setClassLabel] = useState<string>("")
  const [weekOffset, setWeekOffset] = useState(0)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getSundayOfWeek(new Date()))
  const [classLoading, setClassLoading] = useState(false)
  const [classError, setClassError] = useState<string | null>(null)

  useEffect(() => {
    if (!child?.id) {
      setClassId(null)
      setClassLabel("")
      setClassError(null)
      return
    }

    const controller = new AbortController()
    let isMounted = true

    const loadChildSummary = async () => {
      try {
        setClassLoading(true)
        setClassError(null)
        const response = await parentApi.getStudentSummary(child.id, controller.signal)
        if (!isMounted) {
          return
        }
        if (response.success) {
          setClassId(response.data.class_id ?? child.class_id ?? null)
          setClassLabel(
            response.data.class_label ||
              child.class_name ||
              response.data.class_id ||
              child.class_id ||
              ""
          )
        } else {
          setClassId(child.class_id ?? null)
          setClassLabel(child.class_name ?? child.class_id ?? "")
          setClassError("Impossible de charger la classe de l'enfant.")
        }
      } catch (err: any) {
        if (err.name === "AbortError") return
        if (isMounted) {
          console.error("Erreur chargement classe enfant (parent):", err)
          setClassId(child.class_id ?? null)
          setClassLabel(child.class_name ?? child.class_id ?? "")
          setClassError("Impossible de charger la classe de l'enfant.")
        }
      } finally {
        if (isMounted) {
          setClassLoading(false)
        }
      }
    }

    loadChildSummary()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [child?.id, child?.class_id, child?.class_name])

  useEffect(() => {
    const today = new Date()
    const sunday = getSundayOfWeek(today)
    sunday.setDate(sunday.getDate() + weekOffset * 7)
    setCurrentWeekStart(sunday)
  }, [weekOffset])

  useEffect(() => {
    if (!classId) return

    const controller = new AbortController()
    let isMounted = true

    const loadTimetable = async () => {
      try {
        setLoading(true)
        setError(null)

        const weekStartDate = formatDateForAPI(currentWeekStart)
        const response = await timetableApi.getClassTimetableForWeek(classId, weekStartDate, controller.signal)

        if (isMounted && response.success) {
          setCourses(response.data.courses)
        }
      } catch (err: any) {
        if (err.name === "AbortError") return
        console.error("Erreur chargement emploi du temps parent:", err)
        if (isMounted) {
          setError("Impossible de charger l'emploi du temps")
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

  const getCoursesForDay = (dayOfWeek: number) => courses.filter((c) => c.day_of_week === dayOfWeek)

  const formatDayLabel = (date: Date) => {
    const label = format(date, "EEEE d MMMM yyyy", { locale: fr })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const mobileDayGroups = useMemo(() => {
    return WEEK_DAY_INDICES.map((day) => {
      const date = addDays(currentWeekStart, day - 1)
      const sessions = courses
        .filter((course) => course.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))

      return {
        key: `${day}-${format(date, "yyyy-MM-dd")}`,
        date,
        label: formatDayLabel(date),
        sessions,
      }
    })
  }, [courses, currentWeekStart])

  const getCoursePosition = (startTime: string) => {
    const [hours, minutes] = startTime.split(":").map(Number)
    const totalMinutes = (hours - 8) * 60 + minutes
    return (totalMinutes / 60) * 80
  }

  const getCourseHeight = (startTime: string, endTime: string) => {
    const [startH, startM] = startTime.split(":").map(Number)
    const [endH, endM] = endTime.split(":").map(Number)
    const durationMinutes = endH * 60 + endM - (startH * 60 + startM)
    return (durationMinutes / 60) * 80
  }

  const goToPreviousWeek = () => setWeekOffset((prev) => prev - 1)
  const goToNextWeek = () => setWeekOffset((prev) => prev + 1)
  const goToCurrentWeek = () => setWeekOffset(0)

  if (!child) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Emploi du temps</h1>
        <p className="text-muted-foreground">Aucun enfant n’est associé à ce compte.</p>
      </div>
    )
  }

  if (!classId) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Emploi du temps de {child.full_name}</h1>
        <p className="text-muted-foreground">
          {classLoading
            ? "Chargement de la classe de votre enfant..."
            : "Impossible de trouver la classe associée à cet enfant. Contactez l’établissement."}
          {classError && <span className="block text-sm text-red-500 mt-2">{classError}</span>}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Emploi du temps de {child.full_name}</h1>
          <p className="text-muted-foreground">{classLabel && `Classe : ${classLabel}`}</p>
        </div>
        <Button variant="outline" disabled>
          <Download className="mr-2 h-4 w-4" />
          Exporter PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Semaine du {formatWeekRange(currentWeekStart)}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToCurrentWeek} disabled={weekOffset === 0}>
                Aujourd&apos;hui
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent" />
              <p className="mt-4 text-muted-foreground">Chargement...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <p className="font-medium text-red-600">{error}</p>
            </div>
          ) : (
            <>
              <div className="block md:hidden">
                <div className="mt-4 flex flex-col gap-6">
                  {mobileDayGroups.map((day) => (
                    <section key={day.key}>
                      <div className="bg-muted px-4 py-2 text-sm font-semibold">{day.label}</div>
                      <div className="mt-2 flex flex-col gap-3 px-4">
                        {day.sessions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Aucun cours ce jour-là.</p>
                        ) : (
                          day.sessions.map((session) => {
                            const displayRoom =
                              session.status === "modified" && session.modifications?.new_room
                                ? session.modifications.new_room
                                : session.room

                            return (
                              <div key={session.id} className="space-y-1 rounded-lg border bg-background px-3 py-2 shadow-sm">
                                <div className="text-sm font-semibold">
                                  {session.start_time} - {session.end_time} · {session.subject_name}
                                </div>
                                <div className="text-xs text-muted-foreground">{session.notes || "Cours"}</div>
                                {session.teacher_name && <div className="text-xs">Avec {session.teacher_name}</div>}
                                {displayRoom && (
                                  <div className="text-xs text-muted-foreground">Salle {displayRoom}</div>
                                )}
                                {session.status !== "normal" && (
                                  <Badge
                                    variant={session.status === "cancelled" ? "destructive" : "secondary"}
                                    className="px-1 py-0 text-[10px]"
                                  >
                                    {session.status === "cancelled" ? "Annulé" : "Modifié"}
                                  </Badge>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <div className="grid min-w-[800px] grid-cols-[80px_repeat(5,1fr)] gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Heures</div>
                    {DAYS.map((day) => (
                      <div key={day} className="text-center text-sm font-medium">
                        {day}
                      </div>
                    ))}

                    {HOURS.map((hour) => (
                      <React.Fragment key={hour}>
                        <div className="py-2 text-sm text-muted-foreground">{hour}:00</div>
                        {WEEK_DAY_INDICES.map((day) => {
                          const dayCourses = getCoursesForDay(day)
                          const hourCourses = dayCourses.filter((course) => {
                            const [h] = course.start_time.split(":").map(Number)
                            return h === hour
                          })

                          return (
                            <div key={day} className="relative min-h-[80px] rounded border border-gray-200 p-1">
                              {hourCourses.map((course) => (
                                <div
                                  key={course.id}
                                  className={`absolute left-1 right-1 overflow-hidden rounded px-2 py-1 text-xs ${
                                    course.status === "cancelled" ? "opacity-50" : ""
                                  }`}
                                  style={{
                                    top: `${getCoursePosition(course.start_time) % 80}px`,
                                    height: `${getCourseHeight(course.start_time, course.end_time)}px`,
                                    backgroundColor: course.subject_color || "#3b82f6",
                                    color: "white",
                                  }}
                                >
                                  <div className="truncate font-semibold">{course.subject_name}</div>
                                  <div className="truncate text-[10px]">{course.teacher_name}</div>
                                  <div className="truncate text-[10px]">
                                    {course.status === "modified" && course.modifications?.new_room
                                      ? course.modifications.new_room
                                      : course.room}
                                  </div>
                                  <div className="text-[10px]">
                                    {course.start_time} - {course.end_time}
                                  </div>
                                  {course.status === "cancelled" && (
                                    <Badge variant="destructive" className="mt-1 px-1 py-0 text-[10px]">
                                      🚫 ANNULÉ
                                    </Badge>
                                  )}
                                  {course.status === "modified" && (
                                    <Badge className="mt-1 bg-orange-500 px-1 py-0 text-[10px] text-white">
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
              </div>

              {courses.some((c) => c.status !== "normal") && (
                <div className="mt-6 rounded-lg bg-gray-50 p-4">
                  <h4 className="mb-2 text-sm font-semibold">Légende :</h4>
                  <div className="space-y-2 text-sm">
                    {courses.some((c) => c.status === "cancelled") && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          🚫 ANNULÉ
                        </Badge>
                        <span className="text-muted-foreground">Cours annulé</span>
                      </div>
                    )}
                    {courses.some((c) => c.status === "modified") && (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-500 text-xs text-white">⚠️ MODIFIÉ</Badge>
                        <span className="text-muted-foreground">Cours modifié (salle ou horaire changé)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {courses.filter((c) => c.status === "modified").length > 0 && (
                <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    Cours modifiés cette semaine :
                  </h4>
                  <div className="space-y-2">
                    {courses
                      .filter((c) => c.status === "modified")
                      .map((course) => (
                        <div key={course.id} className="rounded border bg-white p-3 text-sm">
                          <div className="font-medium">{course.subject_name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {DAYS[course.day_of_week - 1]} • {course.start_time} - {course.end_time}
                          </div>
                          {course.modifications && (
                            <div className="mt-2 space-y-1 text-xs">
                              {course.modifications.new_room && (
                                <div>
                                  <span className="text-red-600 line-through">
                                    {course.modifications.original_room}
                                  </span>
                                  {" → "}
                                  <span className="font-medium text-green-600">{course.modifications.new_room}</span>
                                </div>
                              )}
                              {course.modifications.new_start_time && (
                                <div>
                                  <span className="text-red-600 line-through">
                                    {course.modifications.original_start_time} -{" "}
                                    {course.modifications.original_end_time}
                                  </span>
                                  {" → "}
                                  <span className="font-medium text-green-600">
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

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded bg-blue-50 p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {courses.filter((c) => c.status !== "cancelled").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Cours cette semaine</div>
                </div>
                <div className="rounded bg-green-50 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {courses
                      .filter((c) => c.status !== "cancelled")
                      .reduce((sum, course) => {
                        const [sh, sm] = course.start_time.split(":").map(Number)
                        const [eh, em] = course.end_time.split(":").map(Number)
                        return sum + (eh * 60 + em - (sh * 60 + sm)) / 60
                      }, 0)
                      .toFixed(1)}
                    h
                  </div>
                  <div className="text-sm text-muted-foreground">Heures totales</div>
                </div>
                <div className="rounded bg-purple-50 p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(courses.map((c) => c.subject_name)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Matières</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
