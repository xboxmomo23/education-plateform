"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  Trash2, 
  Pencil,
  Calendar,
  XCircle,
  Home,
  Clock,
  UserX,
  Copy,
  Download
} from "lucide-react"
import { timetableApi, type TimetableEntry } from "@/lib/api/timetable"
import { timetableOverrideApi } from "@/lib/api/timetable-override"
import { timetableInstanceApi, type TimetableInstance } from "@/lib/api/timetable-instance"
import { establishmentApi } from "@/lib/api/establishment"
import { CreateTemplateModal } from "@/components/timetable/CreateTemplateModal"
import { CreateFromTemplateModal } from "@/components/timetable/CreateFromTemplateModal"
import { EditTemplateModal } from "@/components/timetable/EditTemplateModal"
import { EditEntryModal } from "@/components/timetable/EditEntryModal"
import { CancelCourseModal } from "@/components/timetable/CancelCourseModal"
import { ChangeRoomModal } from "@/components/timetable/ChangeRoomModal"
import { ModifyTimeModal } from "@/components/timetable/ModifyTimeModal"
import { CopyWeekModal } from "@/components/timetable/CopyWeekModal"
import { GenerateFromTemplateModal } from "@/components/timetable/GenerateFromTemplateModal"
import { ModeIndicator } from "@/components/timetable/ModeIndicator"
import type { CourseTemplate } from "@/lib/api/timetable"

// Configuration Algérienne
const DAYS_CONFIG = {
  days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
  daysMap: { 1: 'Dimanche', 2: 'Lundi', 3: 'Mardi', 4: 'Mercredi', 5: 'Jeudi' },
  daysNumbers: [1, 2, 3, 4, 5] as const,
}

const { days: DAYS, daysMap: DAYS_MAP, daysNumbers: DAYS_NUMBERS } = DAYS_CONFIG

export default function StaffEmploisDuTempsPage() {
  // États généraux
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Mode de l'établissement
  const [timetableMode, setTimetableMode] = useState<'classic' | 'dynamic'>('classic')
  
  // Données emploi du temps
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [instances, setInstances] = useState<TimetableInstance[]>([])
  const [overrides, setOverrides] = useState<any[]>([])
  const [templates, setTemplates] = useState<CourseTemplate[]>([])
  
  // Navigation semaine
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [weekLabel, setWeekLabel] = useState('')
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    return startOfWeek.toISOString().split('T')[0]
  })  // ✅  
  // Templates
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null)
  
  // Modals
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [showCreateFromTemplateModal, setShowCreateFromTemplateModal] = useState(false)
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false)
  const [showEditEntryModal, setShowEditEntryModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showChangeRoomModal, setShowChangeRoomModal] = useState(false)
  const [showModifyTimeModal, setShowModifyTimeModal] = useState(false)
  const [showCopyWeekModal, setShowCopyWeekModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  
  const [editingTemplate, setEditingTemplate] = useState<CourseTemplate | null>(null)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ day: number; hour: number } | null>(null)

  // Charger la configuration de l'établissement
  useEffect(() => {
    loadTimetableConfig()
    loadStaffClasses()
  }, [])

  // Charger les données quand la classe change
  useEffect(() => {
    if (selectedClassId) {
      loadTemplates()
      loadTimetableData()
    }
  }, [selectedClassId, currentWeekOffset, timetableMode])

  // Calculer le label de la semaine
  useEffect(() => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Dimanche
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek + (currentWeekOffset * 7))
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 4) // Dimanche + 4 = Jeudi
    
    setCurrentWeekStart(startOfWeek.toISOString().split('T')[0])
    setWeekLabel(
      `Semaine du ${startOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    )
  }, [currentWeekOffset])

  const loadTimetableConfig = async () => {
    try {
      const response = await establishmentApi.getTimetableConfig()
      if (response.success) {
        setTimetableMode(response.data.timetable_mode)
      }
    } catch (error) {
      console.error('Erreur chargement config:', error)
    }
  }

  const loadStaffClasses = async () => {
    try {
      const response = await timetableApi.getStaffClasses()
      if (response.success && response.data.length > 0) {
        setClasses(response.data)
        setSelectedClassId(response.data[0].class_id)
      }
    } catch (error) {
      console.error('Erreur chargement classes:', error)
    }
  }

  const loadTimetableData = async () => {
    if (!selectedClassId) return

    try {
      setLoading(true)

      if (timetableMode === 'classic') {
        // Mode Classic : Template + Overrides
        const [entriesRes, overridesRes] = await Promise.all([
          timetableApi.getClassTimetable(selectedClassId),
          timetableOverrideApi.getForWeek(selectedClassId, currentWeekStart),
        ])

        if (entriesRes.success) setEntries(entriesRes.data)
        if (overridesRes.success) setOverrides(overridesRes.data)
      } else {
        // Mode Dynamic : Instances
        const instancesRes = await timetableInstanceApi.getForWeek(selectedClassId, currentWeekStart)
        if (instancesRes.success) setInstances(instancesRes.data)
      }
    } catch (error) {
      console.error('Erreur chargement emploi du temps:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    if (!selectedClassId) return

    try {
      const response = await timetableApi.getTemplates(selectedClassId)
      if (response.success) {
        setTemplates(response.data)
      }
    } catch (error) {
      console.error('Erreur chargement templates:', error)
    }
  }

  const handleUseTemplate = (template: CourseTemplate) => {
    setSelectedTemplate(template)
  }

  const handleTimeSlotClick = (day: number, hour: number) => {
    if (!selectedTemplate) return

    setSelectedTimeSlot({ day, hour })
    
    if (timetableMode === 'classic') {
      setShowCreateFromTemplateModal(true)
    } else {
      // Mode Dynamic : Créer directement l'instance
      createInstanceFromTemplate(day, hour)
    }
  }

  const createInstanceFromTemplate = async (day: number, hour: number) => {
    if (!selectedTemplate) return

    try {
      const startTime = `${hour.toString().padStart(2, '0')}:00`
      const [startH, startM] = startTime.split(':').map(Number)
      const totalMinutes = startH * 60 + startM + selectedTemplate.default_duration
      const endH = Math.floor(totalMinutes / 60)
      const endM = totalMinutes % 60
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`

      await timetableInstanceApi.create({
        class_id: selectedClassId,
        course_id: selectedTemplate.course_id,
        week_start_date: currentWeekStart,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        room: selectedTemplate.default_room || undefined,
      })

      loadTimetableData()
      setSelectedTemplate(null)
    } catch (error) {
      console.error('Erreur création instance:', error)
      alert('Erreur lors de la création du cours')
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Supprimer ce cours ?')) return

    try {
      if (timetableMode === 'classic') {
        await timetableApi.deleteEntry(entryId)
      } else {
        await timetableInstanceApi.delete(entryId)
      }
      loadTimetableData()
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Supprimer ce template ?')) return

    try {
      await timetableApi.deleteTemplate(templateId)
      loadTemplates()
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null)
      }
    } catch (error) {
      console.error('Erreur suppression template:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleCancelCourseForDate = (entry: any) => {
    const date = getDateForDayOfWeek(entry.day_of_week)
    setEditingEntry({ ...entry, override_date: date })
    setShowCancelModal(true)
  }

  const handleChangeRoomForDate = (entry: any) => {
    const date = getDateForDayOfWeek(entry.day_of_week)
    setEditingEntry({ ...entry, override_date: date })
    setShowChangeRoomModal(true)
  }

  const handleModifyTimeForDate = (entry: any) => {
    const date = getDateForDayOfWeek(entry.day_of_week)
    setEditingEntry({ ...entry, override_date: date })
    setShowModifyTimeModal(true)
  }

  const getDateForDayOfWeek = (dayOfWeek: number): string => {
  if (!currentWeekStart) return ''  // ✅ Sécurité
  
  const weekStart = new Date(currentWeekStart)
  const targetDate = new Date(weekStart)
  targetDate.setDate(weekStart.getDate() + (dayOfWeek - 1))
  return targetDate.toISOString().split('T')[0]
}

  const getEntriesForDay = (dayOfWeek: number) => {
    if (timetableMode === 'classic') {
      const dayEntries = entries.filter(e => e.day_of_week === dayOfWeek)
      const date = getDateForDayOfWeek(dayOfWeek)
      
      if (!date) return dayEntries  // ✅ Si pas de date, retourner sans overrides
      
      return dayEntries.map(entry => {
        const override = overrides.find(
          o => o.template_entry_id === entry.id && o.override_date === date
        )

        if (override) {
          if (override.override_type === 'cancel') {
            return { ...entry, status: 'cancelled', reason: override.reason }
          } else if (override.override_type === 'modify_room') {
            return { ...entry, room: override.new_room, status: 'modified' }
          } else if (override.override_type === 'modify_time') {
            return { 
              ...entry, 
              start_time: override.new_start_time, 
              end_time: override.new_end_time,
              status: 'modified' 
            }
          }
        }

        return { ...entry, status: 'normal' }
      }).sort((a, b) => a.start_time.localeCompare(b.start_time))
    } else {
      // Mode Dynamic : Instances
      return instances
        .filter(i => i.day_of_week === dayOfWeek)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
  }

  const filteredTemplates = templates.filter(t =>
    t.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Statistiques
  const totalCourses = timetableMode === 'classic' ? entries.length : instances.length
  const totalHours = timetableMode === 'classic'
    ? entries.reduce((sum, e) => {
        const [sh, sm] = e.start_time.split(':').map(Number)
        const [eh, em] = e.end_time.split(':').map(Number)
        return sum + ((eh * 60 + em) - (sh * 60 + sm))
      }, 0) / 60
    : instances.reduce((sum, i) => {
        const [sh, sm] = i.start_time.split(':').map(Number)
        const [eh, em] = i.end_time.split(':').map(Number)
        return sum + ((eh * 60 + em) - (sh * 60 + sm))
      }, 0) / 60

  const dataSource = timetableMode === 'classic' ? entries : instances
  const uniqueSubjects = new Set(dataSource.map(e => e.subject_name)).size
  const uniqueTeachers = new Set(dataSource.map(e => e.teacher_name)).size

  return (
    <DashboardLayout requiredRole="staff">
      <div className="flex h-screen overflow-hidden">
        {/* Bibliothèque de templates (gauche) */}
        <div className="w-80 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">📖 Mes Templates</h2>
              {selectedTemplate && (
                <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                  Sélectionné
                </span>
              )}
            </div>

            {selectedTemplate && (
              <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                → Cliquez sur une case horaire pour créer un cours
              </div>
            )}

            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Bouton créer */}
            <Button
              onClick={() => setShowCreateTemplateModal(true)}
              className="w-full"
              variant="outline"
            >
              + Créer un template
            </Button>

            {/* Liste des templates */}
            <div className="space-y-2">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ borderLeftWidth: '4px', borderLeftColor: template.subject_color }}
                  onClick={() => handleUseTemplate(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {template.subject_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {template.teacher_name}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {template.default_duration}min
                        </span>
                        {template.default_room && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            📍 {template.default_room}
                          </span>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingTemplate(template)
                            setShowEditTemplateModal(true)
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTemplate(template.id)
                          }}
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

              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchQuery ? 'Aucun template trouvé' : 'Aucun template créé'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendrier (droite) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header avec mode */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">📚 Emploi du temps</h1>
              <ModeIndicator mode={timetableMode} />
            </div>

            {/* Sélection classe */}
            <Card>
              <CardContent className="pt-6">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c, index) => (
                      <SelectItem key={c.class_id || `class-${index}`} value={c.class_id}>
                        {c.class_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Navigation semaine */}
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

                  <div className="text-center">
                    <div className="font-medium">{weekLabel}</div>
                    {currentWeekOffset !== 0 && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setCurrentWeekOffset(0)}
                        className="text-xs"
                      >
                        Retour à cette semaine
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                  >
                    Semaine suivante
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* Actions mode Dynamic */}
                {timetableMode === 'dynamic' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGenerateModal(true)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Copier depuis template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCopyWeekModal(true)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copier une autre semaine
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grille emploi du temps */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-4">Emploi du temps</h3>

                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Chargement...
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {/* Colonne des heures */}
                    <div className="w-16 flex-shrink-0">
                      <div className="h-12 mb-3"></div>
                      {[8, 9, 10, 11, 13, 14, 15, 16, 17, 18].map(hour => (
                        <div
                          key={hour}
                          className="h-20 flex items-center justify-end pr-2 text-sm text-muted-foreground font-medium"
                          style={{ minHeight: '80px' }}
                        >
                          {hour}:00
                        </div>
                      ))}
                    </div>

                    {/* Grille des jours */}
                    <div className="flex-1 grid grid-cols-5 gap-4">
                      {DAYS_NUMBERS.map((dayNum, idx) => (
                        <div key={dayNum}>
                          <h3 className="font-medium text-center mb-3 sticky top-0 bg-white py-2 h-12">
                            {DAYS[idx]}
                          </h3>

                          <div className="space-y-2 relative">
                            {[8, 9, 10, 11, 13, 14, 15, 16, 17, 18].map(hour => {
                              const hourEntries = getEntriesForDay(dayNum).filter(e => {
                                const [h] = e.start_time.split(':').map(Number)
                                return h === hour
                              })

                              return (
                                <div
                                  key={`${dayNum}-${hour}`}
                                  className={`min-h-[80px] p-2 rounded border-2 border-dashed transition-all relative ${
                                    selectedTemplate
                                      ? 'border-primary bg-primary/5 cursor-pointer hover:bg-primary/10'
                                      : 'border-gray-200'
                                  }`}
                                  onClick={() => selectedTemplate && handleTimeSlotClick(dayNum, hour)}
                                >
                                  {/* Cours existants */}
                                  {hourEntries.map(entry => {
                                    const [startH, startM] = entry.start_time.split(':').map(Number)
                                    const [endH, endM] = entry.end_time.split(':').map(Number)
                                    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM)
                                    const durationHours = durationMinutes / 60
                                    const numberOfSlots = Math.ceil(durationHours)
                                    const height = (numberOfSlots * 80) + ((numberOfSlots - 1) * 8)

                                    const isCancelled = (entry as any).status === 'cancelled'
                                    const isModified = (entry as any).status === 'modified'

                                    return (
                                      <div
                                        key={entry.id}
                                        className={`p-2 rounded border mb-1 group relative ${
                                          isCancelled ? 'opacity-50 bg-red-50' : ''
                                        }`}
                                        style={{
                                          backgroundColor: !isCancelled ? `${entry.subject_color}20` : undefined,
                                          borderColor: entry.subject_color || '#ccc',
                                          minHeight: `${height}px`,
                                          height: `${height}px`,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="flex items-start justify-between h-full">
                                          <div className="flex-1 min-w-0">
                                            <div className={`font-semibold text-xs truncate ${isCancelled ? 'line-through' : ''}`}>
                                              {entry.subject_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                              {entry.start_time} - {entry.end_time}
                                            </div>
                                            <div className="text-xs mt-0.5">{entry.teacher_name}</div>
                                            {entry.room && (
                                              <div className="text-xs">
                                                📍 {entry.room}
                                                {isModified && <span className="ml-1 text-blue-600">(modifié)</span>}
                                              </div>
                                            )}
                                            
                                            {isCancelled && (entry as any).reason && (
                                              <div className="text-xs text-red-600 mt-1">
                                                ⚠️ {(entry as any).reason}
                                              </div>
                                            )}

                                            {durationMinutes > 90 && (
                                              <div className="text-xs font-medium text-blue-600 mt-1">
                                                ⏱️ {Math.floor(durationHours)}h{durationMinutes % 60 > 0 ? (durationMinutes % 60) + 'min' : ''}
                                              </div>
                                            )}
                                          </div>

                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                              >
                                                <MoreVertical className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              {timetableMode === 'classic' ? (
                                                <>
                                                  <DropdownMenuItem
                                                    onClick={() => {
                                                      setEditingEntry(entry)
                                                      setShowEditEntryModal(true)
                                                    }}
                                                  >
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Modifier le template
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onClick={() => handleCancelCourseForDate(entry)}>
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Annuler ce jour
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => handleChangeRoomForDate(entry)}>
                                                    <Home className="h-4 w-4 mr-2" />
                                                    Changer la salle
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => handleModifyTimeForDate(entry)}>
                                                    <Clock className="h-4 w-4 mr-2" />
                                                    Modifier l'horaire
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                    className="text-red-600"
                                                  >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Supprimer du template
                                                  </DropdownMenuItem>
                                                </>
                                              ) : (
                                                <>
                                                  <DropdownMenuItem
                                                    onClick={() => {
                                                      setEditingEntry(entry)
                                                      setShowEditEntryModal(true)
                                                    }}
                                                  >
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Modifier
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                    className="text-red-600"
                                                  >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Supprimer
                                                  </DropdownMenuItem>
                                                </>
                                              )}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                    )
                                  })}

                                  {selectedTemplate && hourEntries.length === 0 && (
                                    <div className="text-center text-xs text-muted-foreground mt-6">
                                      Cliquer pour créer
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistiques */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{totalCourses}</div>
                  <div className="text-sm text-muted-foreground">Cours total</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-green-600">{totalHours.toFixed(1)}h</div>
                  <div className="text-sm text-muted-foreground">Heures/semaine</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-purple-600">{uniqueSubjects}</div>
                  <div className="text-sm text-muted-foreground">Matières</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-orange-600">{uniqueTeachers}</div>
                  <div className="text-sm text-muted-foreground">Professeurs</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateTemplateModal && (
        <CreateTemplateModal
          classId={selectedClassId}
          onClose={() => setShowCreateTemplateModal(false)}
          onSuccess={() => {
            loadTemplates()
            setShowCreateTemplateModal(false)
          }}
        />
      )}

      {showCreateFromTemplateModal && selectedTemplate && selectedTimeSlot && (
        <CreateFromTemplateModal
          template={selectedTemplate}
          dayOfWeek={selectedTimeSlot.day}
          defaultHour={selectedTimeSlot.hour}
          onClose={() => {
            setShowCreateFromTemplateModal(false)
            setSelectedTimeSlot(null)
          }}
          onSuccess={() => {
            loadTimetableData()
            setShowCreateFromTemplateModal(false)
            setSelectedTimeSlot(null)
            setSelectedTemplate(null)
          }}
        />
      )}

      {showEditTemplateModal && editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowEditTemplateModal(false)
            setEditingTemplate(null)
          }}
          onSuccess={() => {
            loadTemplates()
            setShowEditTemplateModal(false)
            setEditingTemplate(null)
          }}
        />
      )}

      {showEditEntryModal && editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => {
            setShowEditEntryModal(false)
            setEditingEntry(null)
          }}
          onSuccess={() => {
            loadTimetableData()
            setShowEditEntryModal(false)
            setEditingEntry(null)
          }}
        />
      )}

      {showCancelModal && editingEntry && (
        <CancelCourseModal
          entry={editingEntry}
          overrideDate={editingEntry.override_date}
          onClose={() => {
            setShowCancelModal(false)
            setEditingEntry(null)
          }}
          onSuccess={() => {
            loadTimetableData()
            setShowCancelModal(false)
            setEditingEntry(null)
          }}
        />
      )}

      {showChangeRoomModal && editingEntry && (
        <ChangeRoomModal
          entry={editingEntry}
          overrideDate={editingEntry.override_date}
          onClose={() => {
            setShowChangeRoomModal(false)
            setEditingEntry(null)
          }}
          onSuccess={() => {
            loadTimetableData()
            setShowChangeRoomModal(false)
            setEditingEntry(null)
          }}
        />
      )}

      {showModifyTimeModal && editingEntry && (
        <ModifyTimeModal
          entry={editingEntry}
          overrideDate={editingEntry.override_date}
          onClose={() => {
            setShowModifyTimeModal(false)
            setEditingEntry(null)
          }}
          onSuccess={() => {
            loadTimetableData()
            setShowModifyTimeModal(false)
            setEditingEntry(null)
          }}
        />
      )}

      {showCopyWeekModal && (
        <CopyWeekModal
          classId={selectedClassId}
          sourceWeek={currentWeekStart}
          onClose={() => setShowCopyWeekModal(false)}
          onSuccess={() => {
            loadTimetableData()
            setShowCopyWeekModal(false)
          }}
        />
      )}

      {showGenerateModal && (
        <GenerateFromTemplateModal
          classId={selectedClassId}
          weekStartDate={currentWeekStart}
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => {
            loadTimetableData()
            setShowGenerateModal(false)
          }}
        />
      )}
    </DashboardLayout>
  )
}