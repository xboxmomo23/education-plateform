"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Check,
  X,
  RotateCcw,
  Save
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  attendanceApi,
  type TeacherWeekCourse,
  type StudentForAttendance,
  type AttendanceSession,
  type AttendanceStatus,
  getStatusLabel,
  getStatusColor,
} from "@/lib/api/attendance"
import { getWeekStart, addWeeksToStart, formatWeekLabel } from "@/lib/date"

// ============================================
// CONSTANTES
// ============================================

// Jours de la semaine (Algérie : Dimanche-Jeudi)
const DAYS_OF_WEEK = [
  { value: 1, label: 'Dimanche' },
  { value: 2, label: 'Lundi' },
  { value: 3, label: 'Mardi' },
  { value: 4, label: 'Mercredi' },
  { value: 5, label: 'Jeudi' },
]

// Options de statut pour le marquage
const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string; icon: React.ReactNode; color: string }> = [
  { value: 'present', label: 'Présent', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'absent', label: 'Absent', icon: <XCircle className="h-4 w-4" />, color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'late', label: 'En retard', icon: <Clock className="h-4 w-4" />, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'excused', label: 'Excusé', icon: <AlertCircle className="h-4 w-4" />, color: 'text-blue-600 bg-blue-50 border-blue-200' },
]

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function ProfesseurPresencePage() {
  // États
  const [weekStart, setWeekStart] = useState<string>(getWeekStart())
  const [courses, setCourses] = useState<TeacherWeekCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal appel
  const [selectedCourse, setSelectedCourse] = useState<TeacherWeekCourse | null>(null)
  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [students, setStudents] = useState<StudentForAttendance[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [savingStudent, setSavingStudent] = useState<string | null>(null)

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
  const goToPreviousWeek = () => setWeekStart(addWeeksToStart(weekStart, -1))
  const goToNextWeek = () => setWeekStart(addWeeksToStart(weekStart, 1))
  const goToCurrentWeek = () => setWeekStart(getWeekStart())

  // Ouvrir le modal d'appel
  const openAttendanceModal = async (course: TeacherWeekCourse) => {
    setSelectedCourse(course)
    setLoadingSession(true)
    
    try {
      const response = await attendanceApi.getSession(course.instance_id)
      
      if (response.success) {
        setSession(response.data.session)
        setStudents(response.data.students)
      } else {
        setError('Erreur lors du chargement de la session')
      }
    } catch (err: any) {
      console.error('Erreur chargement session:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoadingSession(false)
    }
  }

  // Fermer le modal
  const closeModal = () => {
    setSelectedCourse(null)
    setSession(null)
    setStudents([])
    loadCourses() // Rafraîchir la liste
  }

  // Marquer un élève
  const markStudent = async (studentId: string, status: AttendanceStatus, lateMinutes?: number) => {
    if (!session) return
    
    setSavingStudent(studentId)
    
    try {
      const response = await attendanceApi.markAttendance(
        session.id,
        studentId,
        status,
        { lateMinutes }
      )
      
      if (response.success) {
        // Mettre à jour localement
        setStudents(prev => prev.map(s => 
          s.user_id === studentId 
            ? { ...s, status, late_minutes: lateMinutes || null }
            : s
        ))
      }
    } catch (err) {
      console.error('Erreur marquage:', err)
    } finally {
      setSavingStudent(null)
    }
  }

  // Marquer tous présents
  const markAllPresent = async () => {
    if (!session) return
    
    const records = students.map(s => ({
      studentId: s.user_id,
      status: 'present' as AttendanceStatus,
    }))
    
    try {
      const response = await attendanceApi.bulkMarkAttendance(session.id, records)
      
      if (response.success) {
        setStudents(prev => prev.map(s => ({ ...s, status: 'present' })))
      }
    } catch (err) {
      console.error('Erreur marquage en masse:', err)
    }
  }

  // Grouper les cours par jour
  const coursesByDay = DAYS_OF_WEEK.map(day => ({
    ...day,
    courses: courses.filter(c => c.day_of_week === day.value)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }))

  // Vérifier si c'est aujourd'hui
  const today = new Date()
  const todayDayOfWeek = today.getDay() === 0 ? 1 : today.getDay() + 1 // Ajuster pour notre format

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            📋 Faire l'appel
          </h1>
          <p className="text-gray-600">
            Sélectionnez un cours pour marquer les présences
          </p>
        </div>

        {/* Navigation semaine */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Semaine précédente
              </Button>
              
              <div className="text-center">
                <p className="font-semibold text-gray-900">
                  {formatWeekLabel(weekStart)}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={goToCurrentWeek}
                  className="text-xs text-blue-600"
                >
                  Revenir à cette semaine
                </Button>
              </div>
              
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                Semaine suivante
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadCourses}>Réessayer</Button>
          </Card>
        ) : courses.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun cours cette semaine</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {coursesByDay.map(day => day.courses.length > 0 && (
              <div key={day.value}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {day.label}
                  </h2>
                  {day.value === todayDayOfWeek && (
                    <Badge className="bg-blue-100 text-blue-800">Aujourd'hui</Badge>
                  )}
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {day.courses.map(course => (
                    <CourseCard
                      key={course.instance_id}
                      course={course}
                      onClick={() => openAttendanceModal(course)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal d'appel */}
        <AttendanceModal
          open={!!selectedCourse}
          onClose={closeModal}
          course={selectedCourse}
          session={session}
          students={students}
          loading={loadingSession}
          savingStudent={savingStudent}
          onMarkStudent={markStudent}
          onMarkAllPresent={markAllPresent}
        />
      </div>
    </div>
  )
}

// ============================================
// COMPOSANTS
// ============================================

function CourseCard({ 
  course, 
  onClick 
}: { 
  course: TeacherWeekCourse
  onClick: () => void 
}) {
  const hasSession = course.has_session
  const totalMarked = course.present_count + course.absent_count + course.late_count
  const attendanceRate = course.total_students > 0 
    ? Math.round((course.present_count + course.late_count) / course.total_students * 100)
    : 0

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Barre couleur matière */}
      <div 
        className="h-2 rounded-t-lg"
        style={{ backgroundColor: course.subject_color }}
      />
      
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">
              {course.subject_name}
            </h3>
            <p className="text-sm text-gray-500">
              {course.class_label}
            </p>
          </div>
          
          {hasSession ? (
            <Badge 
              variant="outline"
              className={cn(
                course.status === 'closed' 
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-orange-50 text-orange-700 border-orange-200'
              )}
            >
              {course.status === 'closed' ? 'Terminé' : 'En cours'}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-50 text-gray-600">
              À faire
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {course.start_time.slice(0, 5)} - {course.end_time.slice(0, 5)}
          </span>
          {course.room && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {course.room}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            {course.total_students} élèves
          </span>
          
          {hasSession && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600">{course.present_count} P</span>
              <span className="text-red-600">{course.absent_count} A</span>
              <span className="text-orange-600">{course.late_count} R</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AttendanceModal({
  open,
  onClose,
  course,
  session,
  students,
  loading,
  savingStudent,
  onMarkStudent,
  onMarkAllPresent,
}: {
  open: boolean
  onClose: () => void
  course: TeacherWeekCourse | null
  session: AttendanceSession | null
  students: StudentForAttendance[]
  loading: boolean
  savingStudent: string | null
  onMarkStudent: (studentId: string, status: AttendanceStatus, lateMinutes?: number) => void
  onMarkAllPresent: () => void
}) {
  const [search, setSearch] = useState('')
  const [lateMinutesInput, setLateMinutesInput] = useState<Record<string, string>>({})

  if (!course) return null

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const markedCount = students.filter(s => s.status !== null).length
  const presentCount = students.filter(s => s.status === 'present').length
  const absentCount = students.filter(s => s.status === 'absent').length
  const lateCount = students.filter(s => s.status === 'late').length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div 
              className="w-3 h-8 rounded"
              style={{ backgroundColor: course.subject_color }}
            />
            <div>
              <span className="text-xl">{course.subject_name}</span>
              <span className="text-gray-500 font-normal ml-2">
                - {course.class_label}
              </span>
            </div>
          </DialogTitle>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
            <span>{course.session_date}</span>
            <span>{course.start_time.slice(0, 5)} - {course.end_time.slice(0, 5)}</span>
            {course.room && <span>Salle {course.room}</span>}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Barre d'outils */}
            <div className="flex items-center justify-between gap-4 py-4 border-b">
              <Input
                placeholder="Rechercher un élève..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600 font-medium">{presentCount} P</span>
                  <span className="text-red-600 font-medium">{absentCount} A</span>
                  <span className="text-orange-600 font-medium">{lateCount} R</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600">{markedCount}/{students.length}</span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onMarkAllPresent}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Tous présents
                </Button>
              </div>
            </div>

            {/* Liste des élèves */}
            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-2">
                {filteredStudents.map((student, index) => (
                  <div 
                    key={student.user_id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      student.status === 'present' && "bg-green-50 border-green-200",
                      student.status === 'absent' && "bg-red-50 border-red-200",
                      student.status === 'late' && "bg-orange-50 border-orange-200",
                      student.status === 'excused' && "bg-blue-50 border-blue-200",
                      !student.status && "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-6">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {student.full_name}
                        </p>
                        {student.student_number && (
                          <p className="text-xs text-gray-500">
                            N° {student.student_number}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Input minutes retard */}
                      {student.status === 'late' && (
                        <Input
                          type="number"
                          placeholder="min"
                          className="w-16 h-8 text-xs"
                          value={lateMinutesInput[student.user_id] || student.late_minutes || ''}
                          onChange={(e) => {
                            setLateMinutesInput(prev => ({
                              ...prev,
                              [student.user_id]: e.target.value
                            }))
                          }}
                          onBlur={() => {
                            const mins = parseInt(lateMinutesInput[student.user_id])
                            if (!isNaN(mins)) {
                              onMarkStudent(student.user_id, 'late', mins)
                            }
                          }}
                        />
                      )}

                      {/* Boutons de statut */}
                      <div className="flex gap-1">
                        {STATUS_OPTIONS.map(opt => (
                          <Button
                            key={opt.value}
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 w-8 p-0",
                              student.status === opt.value && opt.color
                            )}
                            onClick={() => onMarkStudent(student.user_id, opt.value)}
                            disabled={savingStudent === student.user_id}
                            title={opt.label}
                          >
                            {savingStudent === student.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              opt.icon
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}