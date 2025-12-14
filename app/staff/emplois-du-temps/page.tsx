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
  Copy,
  Download,
  FileDown
} from "lucide-react"
import { timetableApi } from "@/lib/api/timetable"
import { timetableInstanceApi, type TimetableInstance } from "@/lib/api/timetable-instance"
import { establishmentApi } from "@/lib/api/establishment"
import { EditTemplateModal } from "@/components/timetable/EditTemplateModal"
import { EditInstanceModal } from "@/components/timetable/EditInstanceModal"
import { CreateTemplateModal } from "@/components/timetable/CreateTemplateModal"
import { CopyWeekModal } from "@/components/timetable/CopyWeekModal"
import { GenerateFromTemplateModal } from "@/components/timetable/GenerateFromTemplateModal"
import { ModeIndicator } from "@/components/timetable/ModeIndicator"
import type { CourseTemplate } from "@/lib/api/timetable"
import { getWeekStart, addWeeksToStart, getDateForDay, formatWeekLabel } from "@/lib/date"
import { API_BASE_URL } from "@/lib/api/config"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"

// Configuration Algérienne
const DAYS_CONFIG = {
  days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
  daysMap: { 1: 'Dimanche', 2: 'Lundi', 3: 'Mardi', 4: 'Mercredi', 5: 'Jeudi' },
  daysNumbers: [1, 2, 3, 4, 5] as const,
}

const { days: DAYS, daysMap: DAYS_MAP, daysNumbers: DAYS_NUMBERS } = DAYS_CONFIG
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8)

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "classe"

export default function StaffEmploisDuTempsPage() {
  // ==================== ÉTATS GÉNÉRAUX ====================
  
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Mode de l'établissement
  const [timetableMode, setTimetableMode] = useState<'dynamic'>('dynamic')  
  // Templates
  const [templates, setTemplates] = useState<CourseTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null)
  const { settings } = useEstablishmentSettings()
  
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

  const academicYear = useMemo(() => {
    if (settings?.school_year) {
      return settings.school_year
    }
    const date = new Date(`${currentWeekStart}T00:00:00Z`)
    if (Number.isNaN(date.getTime())) return undefined
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
  }, [settings?.school_year, currentWeekStart])
  
  // ==================== DONNÉES ====================
  
  const [instances, setInstances] = useState<TimetableInstance[]>([])
  
  // ==================== CHARGEMENT ====================
  
  const [loading, setLoading] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  
  // AbortController pour annuler les requêtes obsolètes
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // ==================== MODALS ====================
  
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false)
  const [showEditInstanceModal, setShowEditInstanceModal] = useState(false)
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
        // timetable_mode supprimé - toujours en mode dynamic
        // Plus rien à faire ici pour le mode
      }
    } catch (error) {
      console.error('❌ Erreur chargement config:', error)
    }
  }

  // Ajouter en haut du fichier, avec les autres helpers
  function formatDateForAPI(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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
    // On utilise maintenant les COURS disponibles pour la classe
    const response = await timetableApi.getAvailableCourses(selectedClassId)

    if (response.success && Array.isArray(response.data)) {
      // On récupère éventuellement le label/code de la classe courante
      const currentClass = classes.find((c: any) => c.class_id === selectedClassId)

      const mapped = response.data.map((course: any, index: number) => ({
        // On "déguiser" chaque cours en CourseTemplate pour réutiliser le code existant
        id: course.course_id,
        course_id: course.course_id,
        default_duration: 60, // durée par défaut (1h)
        default_room: null,   // pour l'instant pas de salle par défaut côté cours
        display_order: index,
        subject_name: course.subject_name,
        subject_code: course.subject_code,
        subject_color: course.subject_color,
        teacher_name: course.teacher_name,
        class_label: currentClass?.class_label || currentClass?.code || "",
        class_id: selectedClassId,
      }))

      setTemplates(mapped)
    } else {
      setTemplates([])
    }
  } catch (error) {
    console.error("❌ Erreur chargement cours:", error)
    setTemplates([])
  }
}, [selectedClassId, classes])


  // ==================== CHARGEMENT DONNÉES AVEC ANNULATION ====================

  const loadTimetableData = useCallback(async (weekStart: string, signal: AbortSignal) => {
    if (!selectedClassId) return

    try {
      setLoading(true)

      // Mode Dynamic uniquement - Récupération des instances
      const instancesRes = await timetableInstanceApi.getForWeek(selectedClassId, weekStart)

      // Vérifier si la requête n'a pas été annulée
      if (signal.aborted) {
        console.log('⏹️ Requête annulée:', weekStart)
        return
      }

      if (instancesRes.success) {
        setInstances(instancesRes.data)
        console.log('✅ Données chargées (dynamic):', { 
          weekStart, 
          instancesCount: instancesRes.data?.length || 0 
        })
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
  }, [selectedClassId])  // ← timetableMode supprimé des dépendances


  

  // ==================== EFFET : Chargement automatique avec annulation ====================

  useEffect(() => {
    // Condition de garde
    if (!selectedClassId) {
      setInstances([])
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

  const handleExportPdf = useCallback(async (mode: 'color' | 'gray' = 'color') => {
    if (!selectedClassId) return

    try {
      setExportingPdf(true)
      const params = new URLSearchParams({
        weekStart: currentWeekStart,
        theme: mode,
        color: mode === 'gray' ? '0' : '1',
        format: 'carnet',
      })
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null

      const response = await fetch(
        `${API_BASE_URL}/staff/timetable/classes/${selectedClassId}/print?${params.toString()}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        throw new Error("Export impossible")
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      const classLabel = classes.find((c) => c.class_id === selectedClassId)?.class_label || "classe"

      anchor.href = downloadUrl
      anchor.download = `EDT_${slugify(classLabel)}_${currentWeekStart}_${mode}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("❌ Export PDF:", error)
      alert("Impossible de générer le PDF. Réessayez plus tard.")
    } finally {
      setExportingPdf(false)
    }
  }, [selectedClassId, currentWeekStart, classes])

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
    
    // Mode Dynamic : Créer directement l'instance
    createInstanceFromTemplate(day, hour)
  }

  const createInstanceFromTemplate = async (day: number, hour: number) => {
  if (!selectedTemplate || !selectedClassId) return  // ✅ Vérification ajoutée

  try {
    const startTime = `${hour.toString().padStart(2, '0')}:00`
    const [startH, startM] = startTime.split(':').map(Number)
    const duration = selectedTemplate.default_duration || 60  // ✅ Valeur par défaut
    const totalMinutes = startH * 60 + startM + duration
    const endH = Math.floor(totalMinutes / 60)
    const endM = totalMinutes % 60
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`

    // ✅ Formater correctement la date
    const weekStartFormatted = typeof currentWeekStart === 'string' 
      ? currentWeekStart 
      : formatDateForAPI(currentWeekStart)   
       
    console.log('📝 Création instance:', {
      course_id: selectedTemplate.course_id,
      class_id: selectedClassId,
      week_start_date: weekStartFormatted,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
    })

    await timetableInstanceApi.create({
      course_id: selectedTemplate.course_id,
      class_id: selectedClassId,  // ✅ Doit être défini
      week_start_date: weekStartFormatted,  // ✅ Format YYYY-MM-DD
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      room: selectedTemplate.default_room || undefined,
    })
    
    refreshCurrentWeek()
  } catch (error) {
    console.error('❌ Erreur création instance:', error)
    alert('Erreur lors de la création du cours')
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
      // Mode Dynamic : Supprimer l'instance
      const response = await timetableInstanceApi.delete(entryId)
      if (response.success) {
        refreshCurrentWeek()
      }
    } catch (error) {
      console.error('❌ Erreur suppression cours:', error)
    }
  }


  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry)
    
    // Mode dynamic : Modifier l'instance directement
    setShowEditInstanceModal(true)
  }

  // ==================== CALCULS STATISTIQUES ====================

  const displayedEntries = useMemo(() => {
    // Mode dynamic : Retourner directement les instances
    return instances
  }, [instances])

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
      c.level?.toLowerCase().includes(query) ||
      c.class_label?.toLowerCase().includes(query) ||
      c.code?.toLowerCase().includes(query)
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
                    📚 Cours de la classe
                  </h3>
                </div>

                

                

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
                              {template.default_duration ? `${template.default_duration}min` : '60min'}
                            </span>
                            <span className="text-xs text-primary">
                              🔴 {template.default_room || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Petit texte d'aide à droite à la place du menu */}
                        <span className="text-[11px] text-muted-foreground ml-2">
                          Cliquer pour utiliser
                        </span>
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
                            {c.class_label} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    {timetableMode === 'dynamic' && (
                      <>
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
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!selectedClassId || exportingPdf}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          {exportingPdf ? 'Export en cours…' : 'Exporter PDF'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExportPdf('color')}>
                          Version couleur
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportPdf('gray')}>
                          Version gris
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                    <div className="font-semibold">
                      {weekLabel}
                      {academicYear && ` — ${academicYear}`}
                    </div>
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
                        {HOURS.map(hour => (
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
                                              {/* Mode Dynamic uniquement */}
                                              <DropdownMenuItem
                                                onClick={() => handleEditEntry(entry)}
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

      


      {showEditInstanceModal && editingEntry && (
        <EditInstanceModal
          instance={editingEntry}
          onClose={() => {
            setShowEditInstanceModal(false)
            setEditingEntry(null)
          }}
          onSuccess={() => {
            refreshCurrentWeek()
            setShowEditInstanceModal(false)
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
