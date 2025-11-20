"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  attendanceApi, 
  type AttendanceSession, 
  type StudentAttendanceData, 
  type AttendanceStatus,
  type StaffClass 
} from "@/lib/api/attendance"
import { getUserSession } from "@/lib/auth-new"
import { Calendar, Clock, AlertCircle, Check, Save, Users, Filter } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function StaffPresencesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [managedClasses, setManagedClasses] = useState<StaffClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>("all")
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)
  const [students, setStudents] = useState<StudentAttendanceData[]>([])
  const [canModify, setCanModify] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const user = getUserSession()

  // Charger les classes gérées au montage
  useEffect(() => {
    loadManagedClasses()
  }, [])

  // Charger les sessions quand la date ou la classe change
  useEffect(() => {
    if (managedClasses.length > 0) {
      loadSessions()
    }
  }, [selectedDate, selectedClassId, managedClasses])

  const loadManagedClasses = async () => {
    try {
      setLoading(true)
      const response = await attendanceApi.getStaffClasses()

      if (response.success && response.data) {
        setManagedClasses(response.data)
      } else {
        setError(response.error || "Erreur lors du chargement des classes")
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const loadSessions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await attendanceApi.getSessions(selectedDate)

      if (response.success && response.data) {
        let filteredSessions = response.data

        // Filtrer par classe si nécessaire
        if (selectedClassId !== "all") {
          filteredSessions = filteredSessions.filter(
            session => session.class_id === selectedClassId
          )
        }

        setSessions(filteredSessions)
        setSelectedSession(null)
        setStudents([])
      } else {
        setError(response.error || "Erreur lors du chargement des sessions")
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const loadSessionDetails = async (session: AttendanceSession) => {
    try {
      setLoading(true)
      setError(null)

      const response = await attendanceApi.getSessionDetails(session.id)

      if (response.success && response.data) {
        setSelectedSession(session)
        setStudents(response.data.students || [])
        setCanModify(response.data.canModify || false)
      } else {
        setError(response.error || "Erreur lors du chargement des élèves")
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const updateStudentStatus = (
    studentId: string,
    field: 'status' | 'late_minutes' | 'justification',
    value: any
  ) => {
    setStudents(prev =>
      prev.map(student =>
        student.student_id === studentId
          ? { ...student, [field]: value }
          : student
      )
    )
  }

  const handleSaveAttendance = async () => {
    if (!selectedSession) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const records = students.map(student => ({
        student_id: student.student_id,
        status: (student.status || 'present') as AttendanceStatus,
        late_minutes: student.status === 'late' ? student.late_minutes || 0 : undefined,
        justification: student.justification || undefined,
      }))

      const response = await attendanceApi.bulkSaveAttendance(selectedSession.id, records)

      if (response.success && response.data) {
        setSuccess(response.data.message || `${records.length} présence(s) enregistrée(s)`)
        
        setTimeout(() => {
          loadSessionDetails(selectedSession)
        }, 500)
      } else {
        setError(response.error || "Erreur lors de l'enregistrement")
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: AttendanceStatus | null) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200'
      case 'absent': return 'bg-red-100 text-red-800 border-red-200'
      case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'excused': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'remote': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'excluded': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  return (
    <DashboardLayout requiredRole="staff">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des présences</h1>
          <p className="text-muted-foreground">Consultez et modifiez les présences de vos classes</p>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Classe */}
              <div>
                <Label htmlFor="class">Classe</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger id="class" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes mes classes</SelectItem>
                    {managedClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.label} ({cls.current_size} élèves)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info classes gérées */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {managedClasses.length} classe(s) gérée(s)
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Liste des sessions */}
        <Card>
          <CardHeader>
            <CardTitle>
              Cours du {format(new Date(selectedDate), "EEEE d MMMM yyyy", { locale: fr })}
            </CardTitle>
            <CardDescription>{sessions.length} cours trouvé(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !selectedSession && (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
            )}

            {!loading && sessions.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Aucun cours trouvé pour cette date et ces filtres</AlertDescription>
              </Alert>
            )}

            {!loading && sessions.length > 0 && (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedSession?.id === session.id ? 'border-primary' : ''
                    }`}
                    onClick={() => loadSessionDetails(session)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{session.subject_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {session.class_label} • {session.teacher_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.scheduled_start} - {session.scheduled_end}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {session.scheduled_start}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {session.class_label}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulaire de présence */}
        {selectedSession && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedSession.subject_name} - {selectedSession.class_label}
                  </CardTitle>
                  <CardDescription>
                    {selectedSession.teacher_name} • {selectedSession.scheduled_start} - {selectedSession.scheduled_end}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(null)}>
                  <Users className="h-3 w-3 mr-1" />
                  {students.length} élèves
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  En tant que staff, vous pouvez modifier les présences sans limite de temps
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {students.map((student) => (
                  <Card key={student.student_id}>
                    <CardContent className="p-4">
                      <div className="grid gap-4 md:grid-cols-12">
                        <div className="md:col-span-4 flex items-center">
                          <div>
                            <p className="font-medium">{student.student_name}</p>
                            <p className="text-sm text-muted-foreground">{student.student_no}</p>
                          </div>
                        </div>

                        <div className="md:col-span-3">
                          <Label className="text-xs text-muted-foreground">Statut</Label>
                          <Select
                            value={student.status || 'present'}
                            onValueChange={(value) =>
                              updateStudentStatus(student.student_id, 'status', value as AttendanceStatus)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">✅ Présent</SelectItem>
                              <SelectItem value="absent">❌ Absent</SelectItem>
                              <SelectItem value="late">⏰ Retard</SelectItem>
                              <SelectItem value="excused">🏠 Excusé</SelectItem>
                              <SelectItem value="remote">💻 À distance</SelectItem>
                              <SelectItem value="excluded">🚫 Exclu</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {student.status === 'late' && (
                          <div className="md:col-span-2">
                            <Label className="text-xs text-muted-foreground">Retard (min)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="1440"
                              value={student.late_minutes || 0}
                              onChange={(e) =>
                                updateStudentStatus(
                                  student.student_id,
                                  'late_minutes',
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        )}

                        <div className={student.status === 'late' ? 'md:col-span-3' : 'md:col-span-5'}>
                          <Label className="text-xs text-muted-foreground">Justification (optionnel)</Label>
                          <Input
                            type="text"
                            placeholder="Motif..."
                            value={student.justification || ''}
                            onChange={(e) =>
                              updateStudentStatus(student.student_id, 'justification', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                onClick={handleSaveAttendance}
                disabled={saving || students.length === 0}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}