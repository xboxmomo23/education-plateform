"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api/client"
import { getUserSession } from "@/lib/auth-new"
import { AlertCircle, Check, X, Clock, Wifi, Home, UserX, Save, RefreshCw, Filter } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

type AttendanceStatus = "present" | "absent" | "late" | "excused" | "remote" | "excluded"

interface StaffClass {
  id: string
  code: string
  label: string
  level: string
  current_size: number
  is_main: boolean
}

interface Session {
  id: string
  course_title: string
  subject_name: string
  class_label: string
  class_id: string
  session_date: string
  scheduled_start: string
  scheduled_end: string
}

interface Student {
  student_id: string
  student_name: string
  student_no: string
  record_id: string | null
  status: AttendanceStatus | null
  late_minutes: number | null
  justification: string | null
}

export default function StaffPresencesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [classes, setClasses] = useState<StaffClass[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Map<string, { status: AttendanceStatus; late_minutes?: number; justification?: string }>>(new Map())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const user = getUserSession()

  // Charger les classes gérées
  useEffect(() => {
    loadClasses()
  }, [])

  // Charger les sessions
  useEffect(() => {
    if (selectedDate) {
      loadSessions()
    }
  }, [selectedDate])

  const loadClasses = async () => {
    try {
      const response = await api.get("/attendance/staff/classes")
      if (response.success) {
        setClasses(response.data || [])
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des classes")
    }
  }

  const loadSessions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get(`/attendance/sessions?date=${selectedDate}`)
      if (response.success) {
        setSessions(response.data || [])
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des sessions")
    } finally {
      setLoading(false)
    }
  }

  const loadSessionStudents = async (sessionId: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get(`/attendance/sessions/${sessionId}`)
      if (response.success) {
        setStudents(response.data.students || [])
        
        // Initialiser les statuts
        const attendanceMap = new Map()
        response.data.students.forEach((student: Student) => {
          if (student.status) {
            attendanceMap.set(student.student_id, {
              status: student.status,
              late_minutes: student.late_minutes,
              justification: student.justification,
            })
          }
        })
        setAttendance(attendanceMap)
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des élèves")
    } finally {
      setLoading(false)
    }
  }

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId)
    loadSessionStudents(sessionId)
  }

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    const current = attendance.get(studentId) || {}
    setAttendance(new Map(attendance.set(studentId, { ...current, status })))
  }

  const handleLateMinutesChange = (studentId: string, minutes: string) => {
    const current = attendance.get(studentId) || { status: "late" as AttendanceStatus }
    const late_minutes = parseInt(minutes) || 0
    setAttendance(new Map(attendance.set(studentId, { ...current, late_minutes })))
  }

  const handleJustificationChange = (studentId: string, justification: string) => {
    const current = attendance.get(studentId) || { status: "absent" as AttendanceStatus }
    setAttendance(new Map(attendance.set(studentId, { ...current, justification })))
  }

  const handleSaveAll = async () => {
    if (!selectedSession) return

    try {
      setSaving(true)
      setError(null)

      const records = students.map((student) => {
        const record = attendance.get(student.student_id)
        return {
          student_id: student.student_id,
          status: record?.status || "present",
          late_minutes: record?.late_minutes,
          justification: record?.justification,
        }
      })

      const response = await api.post(`/attendance/sessions/${selectedSession}/records/bulk`, {
        records,
      })

      if (response.success) {
        setSuccess("Présences enregistrées avec succès")
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  // Filtrer les sessions par classe
  const filteredSessions = selectedClass
    ? sessions.filter((s) => s.class_id === selectedClass)
    : sessions

  return (
    <DashboardLayout requiredRole="staff">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des présences</h1>
          <p className="text-muted-foreground">Gérer les présences des classes dont vous avez la charge</p>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
            <CardDescription>Sélectionnez une date et une classe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div>
                <Label htmlFor="class">Classe</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.label} {cls.is_main && "(Principale)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={loadSessions} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions ({filteredSessions.length})</CardTitle>
            <CardDescription>Sélectionnez une séance pour gérer les présences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && !selectedSession && (
              <p className="text-sm text-muted-foreground">Chargement des sessions...</p>
            )}

            {filteredSessions.length === 0 && !loading && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Aucune session trouvée pour ces critères</AlertDescription>
              </Alert>
            )}

            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className={`cursor-pointer transition-colors ${
                  selectedSession === session.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                }`}
                onClick={() => handleSessionSelect(session.id)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-semibold">{session.subject_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {session.class_label} • {session.scheduled_start} - {session.scheduled_end}
                    </p>
                  </div>
                  <Badge>Modification illimitée</Badge>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Liste des élèves */}
        {selectedSession && students.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Présences</CardTitle>
                  <CardDescription>{students.length} élèves</CardDescription>
                </div>
                <Button onClick={handleSaveAll} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Enregistrement..." : "Enregistrer tout"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500 text-green-700">
                  <Check className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {students.map((student) => {
                  const currentStatus = attendance.get(student.student_id)
                  
                  return (
                    <Card key={student.student_id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium">{student.student_name}</h4>
                            <p className="text-sm text-muted-foreground">N° {student.student_no}</p>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "present" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "present")}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Présent
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "absent" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "absent")}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Absent
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "late" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "late")}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Retard
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "remote" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "remote")}
                            >
                              <Wifi className="h-4 w-4 mr-1" />
                              Distanciel
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "excused" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "excused")}
                            >
                              <Home className="h-4 w-4 mr-1" />
                              Excusé
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "excluded" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "excluded")}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Exclu
                            </Button>
                          </div>
                        </div>

                        {currentStatus?.status === "late" && (
                          <div className="mt-3">
                            <Label htmlFor={`late-${student.student_id}`} className="text-sm">
                              Retard (minutes)
                            </Label>
                            <Input
                              id={`late-${student.student_id}`}
                              type="number"
                              min="1"
                              max="1440"
                              value={currentStatus.late_minutes || ""}
                              onChange={(e) => handleLateMinutesChange(student.student_id, e.target.value)}
                              className="w-32 mt-1"
                              placeholder="Ex: 10"
                            />
                          </div>
                        )}

                        {(currentStatus?.status === "absent" || currentStatus?.status === "excused") && (
                          <div className="mt-3">
                            <Label htmlFor={`just-${student.student_id}`} className="text-sm">
                              Justification (optionnelle)
                            </Label>
                            <Textarea
                              id={`just-${student.student_id}`}
                              value={currentStatus.justification || ""}
                              onChange={(e) => handleJustificationChange(student.student_id, e.target.value)}
                              className="mt-1"
                              rows={2}
                              maxLength={500}
                              placeholder="Motif..."
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}