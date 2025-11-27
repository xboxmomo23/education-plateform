"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
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
import { getWeekStart, addWeeksToStart, getDateForDay, formatWeekLabel } from "@/lib/date"

// Configuration Algérienne
const DAYS_CONFIG = {
  days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
  daysMap: { 1: 'Dimanche', 2: 'Lundi', 3: 'Mardi', 4: 'Mercredi', 5: 'Jeudi' },
  daysNumbers: [1, 2, 3, 4, 5] as const,
}

const { days: DAYS, daysMap: DAYS_MAP, daysNumbers: DAYS_NUMBERS } = DAYS_CONFIG

export default function StaffEmploisDuTempsPage() {
  // ==================== ÉTATS GÉNÉRAUX ====================
  
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Mode de l'établissement
  const [timetableMode, setTimetableMode] = useState<'classic' | 'dynamic'>('classic')
  
  // Templates
  const [templates, setTemplates] = useState<CourseTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null)
  
  // ==================== NAVIGATION (Architecture durable) ====================
  
  // 1. Référence stable : semaine initiale (ne change JAMAIS après le montage)
  const initialWeekRef = useRef(getWeekStart())
  
  // 2. État simple : offset par rapport à la semaine initiale
  const [weekOffset, setWeekOffset] = useState(0)
  
  // 3. Calcul dérivé : semaine courante (calculée automatiquement, pas de setState)
  const currentWeekStart = useMemo(
    () => addWeeksToStart(initialWeekRef.current, weekOffset),
    [weekOffset]
  )
  
  // 4. Label formaté (dérivé aussi)
  const weekLabel = useMemo(
    () => formatWeekLabel(currentWeekStart),
    [currentWeekStart]
  )
  
  // ==================== DONNÉES ====================
  
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [instances, setInstances] = useState<TimetableInstance[]>([])
  const [overrides, setOverrides] = useState<any[]>([])
  
  // ==================== CHARGEMENT ====================
  
  const [loading, setLoading] = useState(false)
  
  // AbortController pour annuler les requêtes obsolètes
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // ==================== MODALS ====================
  
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

  // ==================== INITIALISATION ====================

  useEffect(() => {
    loadTimetableConfig()
    loadStaffClasses()
  }, [])

  // ==================== FONCTIONS DE CHARGEMENT ====================

  const loadTimetableConfig = async () => {
    try {
      const response = await establishmentApi.getTimetableConfig()
      if (response.success) {
        setTimetableMode(response.data.timetable_mode)
      }
    } catch (error) {
      console.error('❌ Erreur chargement config:', error)
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
      console.error('❌ Erreur chargement classes:', error)
    }
  }

  const loadTemplates = useCallback(async () => {
    if (!selectedClassId) return

    try {
      const response = await timetableApi.getTemplates(selectedClassId)
      if (response.success) {
        setTemplates(response.data)
      }
    } catch (error) {
      console.error('❌ Erreur chargement templates:', error)
    }
  }, [selectedClassId])

  // ==================== CHARGEMENT DONNÉES AVEC ANNULATION ====================

  const loadTimetableData = useCallback(async (weekStart: string, signal: AbortSignal) => {
    if (!selectedClassId) return

    try {
      setLoading(true)

      if (timetableMode === 'classic') {
        // Mode Classic : Template + Overrides
        const [entriesRes, overridesRes] = await Promise.all([
          timetableApi.getClassTimetable(selectedClassId),
          timetableOverrideApi.getForWeek(selectedClassId, weekStart),
        ])

        // Vérifier si la requête n'a pas été annulée
        if (signal.aborted) {
          console.log('⏹️ Requête annulée (classic):', weekStart)
          return
        }

        if (entriesRes.success) setEntries(entriesRes.data)
        if (overridesRes.success) setOverrides(overridesRes.data)
        setInstances([])

        console.log('✅ Données chargées (classic):', { weekStart, entriesCount: entriesRes.data?.length || 0 })

      } else {
        // Mode Dynamic : Instances
        const instancesRes = await timetableInstanceApi.getForWeek(selectedClassId, weekStart)

        if (signal.aborted) {
          console.log('⏹️ Requête annulée (dynamic):', weekStart)
          return
        }

        if (instancesRes.success) setInstances(instancesRes.data)
        setEntries([])
        setOverrides([])

        console.log('✅ Données chargées (dynamic):', { weekStart, instancesCount: instancesRes.data?.length || 0 })
      }

    } catch (error: any) {
      // Ignorer les erreurs d'annulation
      if (error.name === 'AbortError') {
        console.log('⏹️ Requête annulée:', weekStart)
        return
      }
      console.error('❌ Erreur chargement emploi du temps:', error)
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }, [selectedClassId, timetableMode])


  

  // ==================== EFFET : Chargement automatique avec annulation ====================

  useEffect(() => {
    // Condition de garde
    if (!selectedClassId) {
      setEntries([])
      setInstances([])
      setOverrides([])
      return
    }

    console.log('🔄 Déclenchement chargement:', { 
      weekStart: currentWeekStart, 
      offset: weekOffset,
      mode: timetableMode 
    })

    // 1. Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      console.log('⏹️ Annulation requête précédente')
    }

    // 2. Créer un nouveau contrôleur pour cette requête
    const controller = new AbortController()
    abortControllerRef.current = controller

    // 3. Charger les templates (pas de signal ici, requête rapide)
    loadTemplates()

    // 4. Lancer le chargement des données avec signal d'annulation
    loadTimetableData(currentWeekStart, controller.signal)

    // 5. Cleanup : annuler si le composant unmount ou si les deps changent
    return () => {
      controller.abort()
      abortControllerRef.current = null
    }
  }, [selectedClassId, currentWeekStart, timetableMode, loadTimetableData, loadTemplates, weekOffset])

  // ==================== NAVIGATION ====================

  const handlePreviousWeek = () => {
    setWeekOffset(prev => prev - 1)
  }

  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1)
  }

  const handleReturnToCurrentWeek = () => {
    setWeekOffset(0)
  }

  // ==================== CALLBACKS APRÈS ACTIONS ====================

  const refreshCurrentWeek = useCallback(() => {
    console.log('🔄 Rafraîchissement semaine courante')
    
    // Annuler requête en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Créer nouveau contrôleur et recharger
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    loadTimetableData(currentWeekStart, controller.signal)
  }, [currentWeekStart, loadTimetableData])

  // ==================== GESTION DES TEMPLATES ====================

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

      const targetDate = getDateForDay(currentWeekStart, day)

      console.log('🎯 Création instance:', {
        template: selectedTemplate,
        course_id: selectedTemplate.course_id,  // ✅ Vérifier que cette propriété existe
        classId: selectedTemplate.class_id,
        weekStart: currentWeekStart,
        dayOfWeek: day,
        startTime,
        endTime,
        room: selectedTemplate.default_room,
        targetDate,
      })

      // ✅ CORRECTION : Utiliser course_id au lieu de template_id
      const response = await timetableInstanceApi.create({
        course_id: selectedTemplate.course_id,  // ✅ C'est la colonne qui existe en base
        class_id: selectedTemplate.class_id,
        week_start_date: currentWeekStart,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        room: selectedTemplate.default_room || undefined,  // ✅ Convertir null en undefined
        created_from_template: true,  // ✅ Marquer comme créé depuis template
      })

      if (response.success) {
        console.log('✅ Instance créée:', response.data)
        refreshCurrentWeek()
        setSelectedTemplate(null)
      }
    } catch (error) {
      console.error('❌ Erreur création instance:', error)
    }
 }
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return

    try {
      const response = await timetableApi.deleteTemplate(templateId)
      if (response.success) {
        loadTemplates()
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null)
        }
      }
    } catch (error) {
      console.error('❌ Erreur suppression template:', error)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) return

    try {
      if (timetableMode === 'classic') {
        const response = await timetableApi.deleteEntry(entryId)
        if (response.success) {
          refreshCurrentWeek()
        }
      } else {
        const response = await timetableInstanceApi.delete(entryId)
        if (response.success) {
          refreshCurrentWeek()
        }
      }
    } catch (error) {
      console.error('❌ Erreur suppression cours:', error)
    }
  }

  // ==================== CALCULS STATISTIQUES ====================

  const displayedEntries = useMemo(() => {
    if (timetableMode === 'classic') {
      return entries.map(entry => {
        const override = overrides.find(
          o => o.timetable_entry_id === entry.id && o.override_date === currentWeekStart
        )
        
        if (override?.is_cancelled) return null
        
        return {
          ...entry,
          room: override?.new_room || entry.room,
          start_time: override?.new_start_time || entry.start_time,
          end_time: override?.new_end_time || entry.end_time,
          override_date: override?.override_date,
        }
      }).filter(Boolean)
    } else {
      return instances
    }
  }, [entries, instances, overrides, currentWeekStart, timetableMode])

  const totalCourses = displayedEntries.length

  const totalHours = useMemo(() => {
    return displayedEntries.reduce((sum, entry: any) => {
      const [startH, startM] = entry.start_time.split(':').map(Number)
      const [endH, endM] = entry.end_time.split(':').map(Number)
      const duration = (endH * 60 + endM) - (startH * 60 + startM)
      return sum + duration / 60
    }, 0)
  }, [displayedEntries])

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(displayedEntries.map((e: any) => e.subject_name))
    return subjects.size
  }, [displayedEntries])

  const uniqueTeachers = useMemo(() => {
    const teachers = new Set(
      displayedEntries
        .map((e: any) => e.teacher_name)
        .filter(Boolean)
    )
    return teachers.size
  }, [displayedEntries])

  // ==================== FILTRAGE CLASSES ====================

  const filteredClasses = useMemo(() => {
    if (!searchQuery) return classes
    
    const query = searchQuery.toLowerCase()
    return classes.filter(c => 
      c.class_name?.toLowerCase().includes(query) ||
      c.level_name?.toLowerCase().includes(query)
    )
  }, [classes, searchQuery])

  // ==================== RENDU ====================

  return (
    <DashboardLayout requiredRole="staff">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Emplois du temps</h1>
          <p className="text-muted-foreground">
            Gérez les emplois du temps de toutes les classes
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Templates */}
          <div className="col-span-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    📋 Mes Templates
                  </h3>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full mb-4"
                  onClick={() => setShowCreateTemplateModal(true)}
                >
                  + Créer un template
                </Button>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleUseTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {template.subject_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {template.teacher_name || 'Professeur Demo'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs">
                              {template.default_duration}min
                            </span>
                            <span className="text-xs text-primary">
                              🔴 {template.default_room || '305'}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-9 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <ModeIndicator mode={timetableMode} />
                    
                    <Select
                      value={selectedClassId}
                      onValueChange={setSelectedClassId}
                    >
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Sélectionner une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClasses.map((c) => (
                          <SelectItem key={c.class_id} value={c.class_id}>
                            {c.level_name} - {c.class_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {timetableMode === 'dynamic' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCopyWeekModal(true)}
                        disabled={!selectedClassId}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier une autre semaine
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGenerateModal(true)}
                        disabled={!selectedClassId}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Copier depuis template
                      </Button>
                    </div>
                  )}
                </div>

                {/* Navigation semaine */}
                <div className="flex items-center justify-between mb-6 p-4 bg-muted rounded-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousWeek}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Semaine précédente
                  </Button>

                  <div className="text-center">
                    <div className="font-semibold">{weekLabel}</div>
                    {weekOffset !== 0 && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleReturnToCurrentWeek}
                        className="text-xs"
                      >
                        Retour à cette semaine
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextWeek}
                  >
                    Semaine suivante
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Grille emploi du temps */}
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-4">Chargement...</p>
                  </div>
                ) : !selectedClassId ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Sélectionnez une classe pour voir l'emploi du temps
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                      <div className="grid grid-cols-6 gap-2">
                        {/* Header */}
                        <div className="font-semibold p-2">Horaire</div>
                        {DAYS.map(day => (
                          <div key={day} className="font-semibold p-2 text-center">
                            {day}
                          </div>
                        ))}

                        {/* Time slots */}
                        {Array.from({ length: 8 }, (_, i) => i + 8).map(hour => (
                          <React.Fragment key={hour}>
                            <div className="p-2 text-sm text-muted-foreground">
                              {hour}:00
                            </div>

                            {DAYS_NUMBERS.map(dayNum => {
                              const targetDate = getDateForDay(currentWeekStart, dayNum)
                              
                              const hourEntries = displayedEntries.filter((entry: any) => {
                                const entryHour = parseInt(entry.start_time.split(':')[0])
                                return entry.day_of_week === dayNum && entryHour === hour
                              })

                              //console.log('📆 Date calculée:', {
                               // dayOfWeek: dayNum,
                               // weekStart: currentWeekStart,
                               // targetDate,
                             // })

                              return (
                                <div
                                  key={`${dayNum}-${hour}`}
                                  className={`min-h-[80px] p-2 border rounded cursor-pointer transition-colors relative ${
                                    selectedTemplate
                                      ? 'hover:bg-primary/5 hover:border-primary'
                                      : 'hover:bg-muted'
                                  }`}
                                  onClick={() => handleTimeSlotClick(dayNum, hour)}
                                >
                                  {hourEntries.map((entry: any) => {
                                    // ✅ AJOUT 1 : CALCULER LA DURÉE ICI (avant isOverride)
                                    const [startH, startM] = entry.start_time.split(':').map(Number)
                                    const [endH, endM] = entry.end_time.split(':').map(Number)
                                    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM)
                                    const durationHours = durationMinutes / 60
                                    const CELL_HEIGHT_PX = 80
                                    const courseHeightPx = durationHours * CELL_HEIGHT_PX - 8
                                    // ✅ FIN AJOUT 1
                                    
                                    const isOverride = !!entry.override_date
                                    const isCancelled = entry.is_cancelled
                                    
                                    return (
                                      <div
                                        key={entry.id}
                                        // ✅ AJOUT 2 : Ajouter "absolute top-1 left-1 right-1" ici
                                        className={`p-2 rounded text-xs absolute top-1 left-1 right-1 ${
                                          isCancelled
                                            ? 'bg-red-100 border-red-300'
                                            : isOverride
                                            ? 'bg-yellow-100 border-yellow-300'
                                            : 'bg-blue-100 border-blue-300'
                                        } border overflow-auto`}
                                        // ✅ AJOUT 3 : Ajouter le style inline ici
                                        style={{
                                          height: `${courseHeightPx}px`,
                                          minHeight: `${courseHeightPx}px`,
                                          zIndex: 10,
                                        }}
                                        // ✅ FIN AJOUT 3
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                              {entry.subject_name}
                                            </div>
                                            <div className="text-muted-foreground truncate">
                                              {entry.start_time} - {entry.end_time}
                                            </div>
                                            <div className="text-muted-foreground truncate">
                                              {entry.teacher_name || 'Professeur Demo'}
                                            </div>
                                            <div className="text-primary font-medium">
                                              🔴 {entry.room || '305'}
                                            </div>
                                            {timetableMode === 'dynamic' && (
                                              <div className="text-xs text-muted-foreground mt-1">
                                                📅 {targetDate}
                                              </div>
                                            )}
                                          </div>

                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                <MoreVertical className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              {timetableMode === 'classic' ? (
                                                <>
                                                  <DropdownMenuItem
                                                    onClick={() => {
                                                      setEditingEntry({ ...entry, override_date: currentWeekStart })
                                                      setShowCancelModal(true)
                                                    }}
                                                  >
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Annuler ce cours
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={() => {
                                                      setEditingEntry({ ...entry, override_date: currentWeekStart })
                                                      setShowChangeRoomModal(true)
                                                    }}
                                                  >
                                                    <Home className="h-4 w-4 mr-2" />
                                                    Changer de salle
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={() => {
                                                      setEditingEntry({ ...entry, override_date: currentWeekStart })
                                                      setShowModifyTimeModal(true)
                                                    }}
                                                  >
                                                    <Clock className="h-4 w-4 mr-2" />
                                                    Modifier l'horaire
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={() => {
                                                      setEditingEntry(entry)
                                                      setShowEditEntryModal(true)
                                                    }}
                                                  >
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Modifier le template
                                                  </DropdownMenuItem>
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
                          </React.Fragment>
                        ))}
                      </div>
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
            refreshCurrentWeek()
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
            refreshCurrentWeek()
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
            refreshCurrentWeek()
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
            refreshCurrentWeek()
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
            refreshCurrentWeek()
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
            refreshCurrentWeek()
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
            refreshCurrentWeek()
            setShowGenerateModal(false)
          }}
        />
      )}
    </DashboardLayout>
  )
}