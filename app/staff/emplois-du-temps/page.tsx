"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { timetableApi, type TimetableEntry, type CreateEntryData } from "@/lib/api/timetable"
import { useAuth } from "@/hooks/useAuth"
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight, Calendar, Edit, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// 🌍 CONFIGURATION PAYS - Algérie ou France
const COUNTRY_CONFIG = {
  ALGERIA: {
    days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
    daysMap: { 0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi' },
    daysNumbers: [0, 1, 2, 3, 4], // Dimanche = 0
  },
  FRANCE: {
    days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
    daysMap: { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi' },
    daysNumbers: [1, 2, 3, 4, 5],
  }
}

// ✅ CHOISIR LE PAYS ICI
const CURRENT_COUNTRY = 'ALGERIA' // Changer en 'FRANCE' si besoin
const DAYS = COUNTRY_CONFIG[CURRENT_COUNTRY].days
const DAYS_MAP = COUNTRY_CONFIG[CURRENT_COUNTRY].daysMap
const DAYS_NUMBERS = COUNTRY_CONFIG[CURRENT_COUNTRY].daysNumbers

interface MultiDayFormData {
  course_id: string
  selectedDays: number[]
  start_time: string
  end_time: string
  commonRoom: string
  customRooms: { [day: number]: string }
  useCustomRooms: boolean
}

export default function StaffEmploiDuTempsPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // 📅 Navigation par semaine
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [weekLabel, setWeekLabel] = useState('')
  
  // 📝 Formulaire multi-jours
  const [multiDayForm, setMultiDayForm] = useState<MultiDayFormData>({
    course_id: '',
    selectedDays: [],
    start_time: '08:00',
    end_time: '09:00',
    commonRoom: '',
    customRooms: {},
    useCustomRooms: false,
  })

  const { userId } = useAuth()

  useEffect(() => {
    if (userId) {
      loadStaffClasses()
    }
  }, [userId])

  useEffect(() => {
    if (selectedClassId) {
      loadTimetable()
      loadCourses()
    }
  }, [selectedClassId])

  // 📅 Calculer le label de la semaine
  useEffect(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    
    // Aller au dimanche de la semaine
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? 0 : -dayOfWeek // Dimanche = 0
    startOfWeek.setDate(today.getDate() + diff + (currentWeekOffset * 7))
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 4) // Dimanche + 4 jours = Jeudi
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })
    }
    
    setWeekLabel(`Semaine du ${formatDate(startOfWeek)} au ${formatDate(endOfWeek)}`)
  }, [currentWeekOffset])

  const loadStaffClasses = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:5000/api/timetable/staff/classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setClasses(data.data)
        if (data.data.length > 0) {
          setSelectedClassId(data.data[0].id)
        }
      }
    } catch (error) {
      console.error('Erreur chargement classes:', error)
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
      console.error('Erreur chargement emploi du temps:', error)
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
      console.error('Erreur chargement cours:', error)
    }
  }

  // 🆕 CRÉATION MULTIPLE DE CRÉNEAUX
  const handleCreateMultipleEntries = async () => {
    if (multiDayForm.selectedDays.length === 0) {
      alert('Veuillez sélectionner au moins un jour')
      return
    }

    if (!multiDayForm.course_id) {
      alert('Veuillez sélectionner une matière')
      return
    }

    try {
      const entriesToCreate: CreateEntryData[] = multiDayForm.selectedDays.map(day => ({
        course_id: multiDayForm.course_id,
        day_of_week: day,
        start_time: multiDayForm.start_time,
        end_time: multiDayForm.end_time,
        room: multiDayForm.useCustomRooms 
          ? (multiDayForm.customRooms[day] || multiDayForm.commonRoom)
          : multiDayForm.commonRoom,
      }))

      const response = await timetableApi.bulkCreateEntries(entriesToCreate)
      
      if (response.success) {
        setShowModal(false)
        loadTimetable()
        
        // Reset form
        setMultiDayForm({
          course_id: '',
          selectedDays: [],
          start_time: '08:00',
          end_time: '09:00',
          commonRoom: '',
          customRooms: {},
          useCustomRooms: false,
        })
      }
    } catch (error) {
      console.error('Erreur création créneaux:', error)
      alert('Erreur lors de la création des créneaux')
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
      console.error('Erreur suppression:', error)
      alert('Erreur lors de la suppression')
    }
  }

  // 🆕 DUPLIQUER UN CRÉNEAU SUR TOUTE LA SEMAINE
  const handleDuplicateToWeek = async (entry: TimetableEntry) => {
    const daysToCreate = DAYS_NUMBERS.filter(day => {
      // Ne pas créer sur le jour actuel
      return day !== entry.day_of_week &&
        // Ne pas créer si un créneau existe déjà à la même heure
        !entries.some(e => 
          e.day_of_week === day && 
          e.start_time === entry.start_time &&
          e.course_id === entry.course_id
        )
    })

    if (daysToCreate.length === 0) {
      alert('Tous les jours ont déjà ce créneau')
      return
    }

    if (!confirm(`Dupliquer ce cours sur ${daysToCreate.length} jour(s) ?`)) {
      return
    }

    try {
      const entriesToCreate: CreateEntryData[] = daysToCreate.map(day => ({
        course_id: entry.course_id,
        day_of_week: day,
        start_time: entry.start_time,
        end_time: entry.end_time,
        room: entry.room || '',
      }))

      await timetableApi.bulkCreateEntries(entriesToCreate)
      loadTimetable()
    } catch (error) {
      console.error('Erreur duplication:', error)
      alert('Erreur lors de la duplication')
    }
  }

  const getEntriesForDay = (dayOfWeek: number) => {
    return entries.filter(e => e.day_of_week === dayOfWeek).sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )
  }

  const toggleDay = (day: number) => {
    setMultiDayForm(prev => {
      const newSelectedDays = prev.selectedDays.includes(day)
        ? prev.selectedDays.filter(d => d !== day)
        : [...prev.selectedDays, day]
      return { ...prev, selectedDays: newSelectedDays }
    })
  }

  const toggleCustomRooms = () => {
    setMultiDayForm(prev => ({
      ...prev,
      useCustomRooms: !prev.useCustomRooms,
      customRooms: !prev.useCustomRooms ? {} : prev.customRooms,
    }))
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
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter des cours
            </Button>
          </div>
        </div>

        {/* 🆕 NAVIGATION PAR SEMAINE */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentWeekOffset(prev => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Semaine précédente
              </Button>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <div className="font-semibold">{weekLabel}</div>
                  {currentWeekOffset !== 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs"
                      onClick={() => setCurrentWeekOffset(0)}
                    >
                      Retour à cette semaine
                    </Button>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
              >
                Semaine suivante
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

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
                {DAYS_NUMBERS.map((dayNum, idx) => (
                  <div key={dayNum}>
                    <h3 className="font-medium text-center mb-3">
                      {DAYS[idx]}
                    </h3>
                    <div className="space-y-2">
                      {getEntriesForDay(dayNum).map(entry => (
                        <div
                          key={entry.id}
                          className="p-3 rounded border hover:shadow-md transition-shadow group relative"
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
                              {entry.room && <div className="text-xs">📍 {entry.room}</div>}
                            </div>
                            
                            {/* 🆕 MENU D'ACTIONS */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDuplicateToWeek(entry)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Dupliquer sur toute la semaine
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* 🆕 MODAL DE CRÉATION MULTIPLE AMÉLIORÉE */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter des cours</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Sélection matière */}
              <div>
                <Label>Matière</Label>
                <Select
                  value={multiDayForm.course_id}
                  onValueChange={(value) => setMultiDayForm({ ...multiDayForm, course_id: value })}
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

              {/* Horaire */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Heure début</Label>
                  <Input
                    type="time"
                    value={multiDayForm.start_time}
                    onChange={(e) => setMultiDayForm({ ...multiDayForm, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Heure fin</Label>
                  <Input
                    type="time"
                    value={multiDayForm.end_time}
                    onChange={(e) => setMultiDayForm({ ...multiDayForm, end_time: e.target.value })}
                  />
                </div>
              </div>

              {/* 🆕 SÉLECTION MULTIPLE DE JOURS */}
              <div>
                <Label className="mb-3 block">Jours de la semaine</Label>
                <div className="grid grid-cols-5 gap-2">
                  {DAYS_NUMBERS.map((dayNum, idx) => (
                    <div
                      key={dayNum}
                      className={`flex items-center space-x-2 p-3 rounded border cursor-pointer transition-colors ${
                        multiDayForm.selectedDays.includes(dayNum)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleDay(dayNum)}
                    >
                      <Checkbox
                        checked={multiDayForm.selectedDays.includes(dayNum)}
                        onCheckedChange={() => toggleDay(dayNum)}
                      />
                      <label className="text-sm font-medium cursor-pointer">
                        {DAYS[idx]}
                      </label>
                    </div>
                  ))}
                </div>
                {multiDayForm.selectedDays.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {multiDayForm.selectedDays.length} jour(s) sélectionné(s)
                  </div>
                )}
              </div>

              {/* 🆕 SALLE COMMUNE OU PERSONNALISÉE */}
              <div>
                <Label>Salle de classe</Label>
                <Input
                  value={multiDayForm.commonRoom}
                  onChange={(e) => setMultiDayForm({ ...multiDayForm, commonRoom: e.target.value })}
                  placeholder="Ex: 201"
                  disabled={multiDayForm.useCustomRooms}
                />
                
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleCustomRooms}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {multiDayForm.useCustomRooms ? 'Utiliser la même salle' : 'Personnaliser par jour'}
                  </Button>
                </div>

                {/* 🆕 PERSONNALISATION PAR JOUR */}
                {multiDayForm.useCustomRooms && multiDayForm.selectedDays.length > 0 && (
                  <div className="mt-4 space-y-2 p-4 bg-gray-50 rounded">
                    <div className="text-sm font-medium mb-2">Salles par jour :</div>
                    {multiDayForm.selectedDays.map(day => (
                      <div key={day} className="flex items-center gap-2">
                        <Label className="w-24 text-sm">
                          {DAYS[DAYS_NUMBERS.indexOf(day)]} :
                        </Label>
                        <Input
                          value={multiDayForm.customRooms[day] || multiDayForm.commonRoom}
                          onChange={(e) => setMultiDayForm(prev => ({
                            ...prev,
                            customRooms: { ...prev.customRooms, [day]: e.target.value }
                          }))}
                          placeholder="Ex: 201"
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bouton de création */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateMultipleEntries}
                  disabled={multiDayForm.selectedDays.length === 0 || !multiDayForm.course_id}
                >
                  Créer {multiDayForm.selectedDays.length > 0 ? `${multiDayForm.selectedDays.length} créneau(x)` : 'les créneaux'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}