"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api/client"
import { getUserSession } from "@/lib/auth-new"
import { AlertCircle, Check, X, Clock, Wifi, Home, UserX, Save, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

type AttendanceStatus = "present" | "absent" | "late" | "excused" | "remote" | "excluded"

interface Session {
  id: string
  course_title: string
  subject_name: string
  class_label: string
  session_date: string
  scheduled_start: string
  scheduled_end: string
  canModify: boolean
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

interface SessionWithStudents {
  session: Session
  students: Student[]
  canModify: boolean
}

export default function ProfesseurPresencePage() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<SessionWithStudents | null>(null)
  const [attendance, setAttendance] = useState<Map<string, { status: AttendanceStatus; late_minutes?: number; justification?: string }>>(new Map())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const user = getUserSession()

  // Charger les sessions du jour
  useEffect(() => {
    loadSessions()
  }, [selectedDate])

  // SSE pour le temps réel
  useEffect(() => {
    if (!selectedSession) return

    const eventSource = new EventSource(
      `/api/attendance/sessions/${selectedSession}/stream`,
      { withCredentials: true }
    )

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "bulk_update" || data.type === "record_update") {
        // Recharger les données
        loadSessionStudents(selectedSession)
      }
    }

    eventSource.onerror = () => {
      console.error("Erreur SSE")
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [selectedSession])

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
        setSessionData(response.data)
        
        // Initialiser les statuts d'attendance
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
    if (!selectedSession || !sessionData) return

    // Vérifier si on peut modifier
    if (!sessionData.canModify) {
      setError("Délai de modification dépassé (48h)")
      return
    }

    try {
      setSaving(true)
      setError(null)

      const records = sessionData.students.map((student) => {
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

  const getStatusColor = (status: AttendanceStatus | null) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 border-green-200"
      case "absent":
        return "bg-red-100 text-red-800 border-red-200"
      case "late":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "excused":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "remote":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "excluded":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-50 text-gray-500 border-gray-200"
    }
  }

  const getStatusLabel = (status: AttendanceStatus | null) => {
    switch (status) {
      case "present":
        return "Présent"
      case "absent":
        return "Absent"
      case "late":
        return "Retard"
      case "excused":
        return "Excusé"
      case "remote":
        return "À distance"
      case "excluded":
        return "Exclu"
      default:
        return "Non saisi"
    }
  }

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des présences</h1>
          <p className="text-muted-foreground">Faire l'appel et consulter les sessions</p>
        </div>

        {/* Sélection de la date */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions du jour</CardTitle>
            <CardDescription>Sélectionnez une séance pour faire l'appel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
              <Button onClick={loadSessions} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>

            {loading && !selectedSession && (
              <p className="text-sm text-muted-foreground">Chargement des sessions...</p>
            )}

            {sessions.length === 0 && !loading && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Aucune session prévue pour cette date</AlertDescription>
              </Alert>
            )}

            {sessions.length > 0 && (
              <div className="grid gap-3">
                {sessions.map((session) => (
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
                      <Badge variant={session.canModify ? "default" : "secondary"}>
                        {session.canModify ? "Modifiable" : "Verrouillé (>48h)"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appel */}
        {sessionData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Faire l'appel</CardTitle>
                  <CardDescription>
                    {sessionData.session.class_label} • {sessionData.students.length} élèves
                  </CardDescription>
                </div>
                <Button onClick={handleSaveAll} disabled={!sessionData.canModify || saving}>
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

              {!sessionData.canModify && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Le délai de modification est dépassé (48h). Contactez le personnel administratif pour modifier.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {sessionData.students.map((student) => {
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
                              disabled={!sessionData.canModify}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Présent
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "absent" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "absent")}
                              disabled={!sessionData.canModify}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Absent
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "late" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "late")}
                              disabled={!sessionData.canModify}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Retard
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "remote" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "remote")}
                              disabled={!sessionData.canModify}
                            >
                              <Wifi className="h-4 w-4 mr-1" />
                              Distanciel
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "excused" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "excused")}
                              disabled={!sessionData.canModify}
                            >
                              <Home className="h-4 w-4 mr-1" />
                              Excusé
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus?.status === "excluded" ? "default" : "outline"}
                              onClick={() => handleStatusChange(student.student_id, "excluded")}
                              disabled={!sessionData.canModify}
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
                              disabled={!sessionData.canModify}
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
                              disabled={!sessionData.canModify}
                              className="mt-1"
                              rows={2}
                              maxLength={500}
                              placeholder="Motif de l'absence..."
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