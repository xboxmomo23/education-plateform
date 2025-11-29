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
  type TimetableInstanceForAttendance,
  type StudentWithAttendance,
  type AttendanceStatus,
  type AttendanceRecordInput 
} from "@/lib/api/attendance-new"
import { getUserSession } from "@/lib/auth-new"
import { Calendar, Clock, AlertCircle, Check, Save, Users, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function ProfesseurPresencePage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [instances, setInstances] = useState<TimetableInstanceForAttendance[]>([])
  const [selectedInstance, setSelectedInstance] = useState<TimetableInstanceForAttendance | null>(null)
  const [students, setStudents] = useState<StudentWithAttendance[]>([])
  const [canModify, setCanModify] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const user = getUserSession()

  // Charger les instances quand la date change
  useEffect(() => {
    loadInstances()
  }, [selectedDate])

  const loadInstances = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await attendanceApi.getTeacherInstances(selectedDate)

      if (response.success && response.data) {
        setInstances(response.data)
        
        // Réinitialiser la sélection
        setSelectedInstance(null)
        setStudents([])
      } else {
        setError(response.error || "Erreur lors du chargement des créneaux")
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const loadInstanceDetails = async (instance: TimetableInstanceForAttendance) => {
    try {
      setLoading(true)
      setError(null)

      const response = await attendanceApi.getInstanceStudents(instance.id)

      if (response.success && response.data) {
        setSelectedInstance(instance)
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
    field: 'status' | 'late_duration' | 'notes',
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
    if (!selectedInstance) return

    if (!canModify) {
      setError("Vous ne pouvez plus modifier cette présence (délai de 48h dépassé)")
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Préparer les données
      const records: AttendanceRecordInput[] = students.map(student => ({
        student_id: student.student_id,
        status: (student.status || 'present') as AttendanceStatus,
        late_duration: student.status === 'late' ? student.late_duration || 0 : undefined,
        notes: student.notes || undefined,
      }))

      const response = await attendanceApi.saveAttendance(selectedInstance.id, records)

      if (response.success && response.data) {
        setSuccess(response.data.message || `${records.length} présence(s) enregistrée(s)`)
        
        // Recharger les détails pour avoir les IDs
        setTimeout(() => {
          loadInstanceDetails(selectedInstance)
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

        {/* Liste des créneaux EDT */}
        <Card>
          <CardHeader>
            <CardTitle>Mes cours du {format(new Date(selectedDate), "EEEE d MMMM yyyy", { locale: fr })}</CardTitle>
            <CardDescription>{instances.length} créneau(x) trouvé(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !selectedInstance && (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
            )}

            {!loading && instances.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Aucun cours trouvé pour cette date</AlertDescription>
              </Alert>
            )}

            {!loading && instances.length > 0 && (
              <div className="space-y-3">
                {instances.map((instance) => (
                  <Card
                    key={instance.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedInstance?.id === instance.id ? 'border-primary' : ''
                    }`}
                    onClick={() => loadInstanceDetails(instance)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: instance.subject_color || '#6366f1' }}
                            />
                            <h4 className="font-medium">{instance.subject_name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {instance.class_label} • {instance.start_time} - {instance.end_time}
                            {instance.room && ` • Salle ${instance.room}`}
                          </p>
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {instance.start_time}
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
        {selectedInstance && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedInstance.subject_name} - {selectedInstance.class_label}
                  </CardTitle>
                  <CardDescription>
                    {selectedInstance.start_time} - {selectedInstance.end_time}
                    {selectedInstance.room && ` • Salle ${selectedInstance.room}`}
                  </CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Users className="h-3 w-3 mr-1" />
                  {students.length} élèves
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canModify && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
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
                  <Card key={student.student_id} className="hover:shadow transition-shadow">
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
                              value={student.late_duration || 0}
                              onChange={(e) =>
                                updateStudentStatus(
                                  student.student_id,
                                  'late_duration',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              disabled={!canModify}
                            />
                          </div>
                        )}

                        {/* Notes */}
                        <div className={student.status === 'late' ? 'md:col-span-3' : 'md:col-span-5'}>
                          <Label className="text-xs text-muted-foreground">Notes (optionnel)</Label>
                          <Input
                            type="text"
                            placeholder="Commentaire..."
                            value={student.notes || ''}
                            onChange={(e) =>
                              updateStudentStatus(student.student_id, 'notes', e.target.value)
                            }
                            disabled={!canModify}
                          />
                        </div>
                      </div>

                      {/* Afficher la justification si elle existe */}
                      {student.is_justified && student.justification_reason && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                          <strong className="text-blue-900">Justification :</strong>{' '}
                          {student.justification_reason}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {canModify && (
                <Button
                  onClick={handleSaveAttendance}
                  disabled={saving || students.length === 0}
                  className="w-full"
                  size="lg"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Enregistrement..." : "Enregistrer l'appel"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}