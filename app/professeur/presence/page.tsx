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
  type AttendanceStatus 
} from "@/lib/api/attendance"
import { getUserSession } from "@/lib/auth-new"
import { Calendar, Clock, AlertCircle, Check, X, Save, Users } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function ProfesseurPresencePage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null)
  const [students, setStudents] = useState<StudentAttendanceData[]>([])
  const [canModify, setCanModify] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const user = getUserSession()

  // Charger les sessions quand la date change
  useEffect(() => {
    loadSessions()
  }, [selectedDate])

  const loadSessions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await attendanceApi.getSessions(selectedDate)

      if (response.success && response.data) {
        setSessions(response.data)
        
        // Réinitialiser la session sélectionnée
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

    if (!canModify) {
      setError("Vous ne pouvez plus modifier cette présence (délai de 48h dépassé)")
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Préparer les données
      const records = students.map(student => ({
        student_id: student.student_id,
        status: (student.status || 'present') as AttendanceStatus,
        late_minutes: student.status === 'late' ? student.late_minutes || 0 : undefined,
        justification: student.justification || undefined,
      }))

      const response = await attendanceApi.bulkSaveAttendance(selectedSession.id, records)

      if (response.success && response.data) {
        setSuccess(response.data.message || `${records.length} présence(s) enregistrée(s)`)
        
        // Recharger les détails pour avoir les IDs des records
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

  const getStatusLabel = (status: AttendanceStatus | null) => {
    switch (status) {
      case 'present': return 'Présent'
      case 'absent': return 'Absent'
      case 'late': return 'Retard'
      case 'excused': return 'Excusé'
      case 'remote': return 'À distance'
      case 'excluded': return 'Exclu'
      default: return 'Non renseigné'
    }
  }

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Faire l'appel</h1>
          <p className="text-muted-foreground">Enregistrez les présences de vos élèves</p>
        </div>

        {/* Sélecteur de date */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Sélectionner une date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs"
            />
          </CardContent>
        </Card>

        {/* Liste des sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Mes cours du {format(new Date(selectedDate), "EEEE d MMMM yyyy", { locale: fr })}</CardTitle>
            <CardDescription>{sessions.length} cours trouvé(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !selectedSession && (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
            )}

            {!loading && sessions.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Aucun cours trouvé pour cette date</AlertDescription>
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
                            {session.class_label} • {session.scheduled_start} - {session.scheduled_end}
                          </p>
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {session.scheduled_start}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulaire d'appel */}
        {selectedSession && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedSession.subject_name} - {selectedSession.class_label}
                  </CardTitle>
                  <CardDescription>
                    {selectedSession.scheduled_start} - {selectedSession.scheduled_end}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(null)}>
                  <Users className="h-3 w-3 mr-1" />
                  {students.length} élèves
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canModify && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Vous ne pouvez plus modifier cette présence (délai de 48h dépassé)
                  </AlertDescription>
                </Alert>
              )}

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
                        {/* Nom de l'élève */}
                        <div className="md:col-span-4 flex items-center">
                          <div>
                            <p className="font-medium">{student.student_name}</p>
                            <p className="text-sm text-muted-foreground">{student.student_no}</p>
                          </div>
                        </div>

                        {/* Statut */}
                        <div className="md:col-span-3">
                          <Label className="text-xs text-muted-foreground">Statut</Label>
                          <Select
                            value={student.status || 'present'}
                            onValueChange={(value) =>
                              updateStudentStatus(student.student_id, 'status', value as AttendanceStatus)
                            }
                            disabled={!canModify}
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

                        {/* Retard (si statut = late) */}
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
                              disabled={!canModify}
                            />
                          </div>
                        )}

                        {/* Justification */}
                        <div className={student.status === 'late' ? 'md:col-span-3' : 'md:col-span-5'}>
                          <Label className="text-xs text-muted-foreground">Justification (optionnel)</Label>
                          <Input
                            type="text"
                            placeholder="Motif..."
                            value={student.justification || ''}
                            onChange={(e) =>
                              updateStudentStatus(student.student_id, 'justification', e.target.value)
                            }
                            disabled={!canModify}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {canModify && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveAttendance}
                    disabled={saving || students.length === 0}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Enregistrement..." : "Enregistrer l'appel"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}