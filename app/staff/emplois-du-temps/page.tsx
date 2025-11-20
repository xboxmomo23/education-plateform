"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { timetableApi, type TimetableEntry, type CreateEntryData } from "@/lib/api/timetable"
import { getUserSession } from "@/lib/auth-new"
import { Plus, Copy, Trash2 } from "lucide-react"

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const DAYS_MAP = { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi' }

export default function StaffEmploiDuTempsPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState<CreateEntryData>({
    course_id: '',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '09:30',
    room: '',
  })

  const user = getUserSession()

  useEffect(() => {
    loadStaffClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      loadTimetable()
      loadCourses()
    }
  }, [selectedClassId])

  const loadStaffClasses = async () => {
    try {
      const response = await fetch('/api/attendance/staff/classes', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setClasses(data.data)
        if (data.data.length > 0) {
          setSelectedClassId(data.data[0].id)
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const loadTimetable = async () => {
    try {
      setLoading(true)
      const response = await timetableApi.getClassTimetable(selectedClassId)
      if (response.success) {
        setEntries(response.data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    try {
      const response = await timetableApi.getAvailableCourses(selectedClassId)
      if (response.success) {
        setCourses(response.data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const handleCreateEntry = async () => {
    try {
      const response = await timetableApi.createEntry(formData)
      if (response.success) {
        setShowModal(false)
        loadTimetable()
        // Reset form
        setFormData({
          course_id: '',
          day_of_week: 1,
          start_time: '08:00',
          end_time: '09:30',
          room: '',
        })
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la création du créneau')
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ?')) {
      return
    }

    try {
      await timetableApi.deleteEntry(entryId)
      loadTimetable()
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const getEntriesForDay = (dayOfWeek: number) => {
    return entries.filter(e => e.day_of_week === dayOfWeek).sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )
  }

  return (
    <DashboardLayout requiredRole="staff">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestion Emploi du Temps</h1>
            <p className="text-muted-foreground">Configurez les cours de vos classes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copier
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un cours
            </Button>
          </div>
        </div>

        {/* Sélection classe */}
        <Card>
          <CardHeader>
            <CardTitle>Sélectionner une classe</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une classe" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Grille emploi du temps */}
        {loading ? (
          <div className="text-center py-12">Chargement...</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Emploi du temps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(day => (
                  <div key={day}>
                    <h3 className="font-medium text-center mb-3">{DAYS_MAP[day as keyof typeof DAYS_MAP]}</h3>
                    <div className="space-y-2">
                      {getEntriesForDay(day).map(entry => (
                        <div
                          key={entry.id}
                          className="p-3 rounded border hover:shadow-md transition-shadow group"
                          style={{
                            backgroundColor: entry.subject_color ? `${entry.subject_color}20` : '#f0f0f0',
                            borderColor: entry.subject_color || '#ccc',
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{entry.subject_name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {entry.start_time} - {entry.end_time}
                              </div>
                              <div className="text-xs mt-1">{entry.teacher_name}</div>
                              <div className="text-xs">{entry.room}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Statistiques */}
              <div className="mt-6 grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{entries.length}</div>
                  <div className="text-sm text-muted-foreground">Cours total</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {entries.reduce((sum, e) => {
                      const [sh, sm] = e.start_time.split(':').map(Number)
                      const [eh, em] = e.end_time.split(':').map(Number)
                      return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60
                    }, 0).toFixed(1)}h
                  </div>
                  <div className="text-sm text-muted-foreground">Heures/semaine</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(entries.map(e => e.subject_name)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Matières</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded">
                  <div className="text-2xl font-bold text-orange-600">
                    {new Set(entries.map(e => e.teacher_name)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Professeurs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal création */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un cours</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Matière</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.course_id} value={course.course_id}>
                        {course.subject_name} - {course.teacher_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Jour</Label>
                <Select
                  value={formData.day_of_week.toString()}
                  onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Heure début</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Heure fin</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Salle</Label>
                <Input
                  value={formData.room || ''}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="Ex: 101"
                />
              </div>

              <Button onClick={handleCreateEntry} className="w-full">
                Créer le créneau
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}