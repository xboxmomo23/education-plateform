"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { timetableApi, type TimetableEntry, type CourseTemplate } from "@/lib/api/timetable"
import { useAuth } from "@/hooks/useAuth"
import { Plus, ChevronLeft, ChevronRight, Calendar, Trash2, MoreVertical, Search } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateTemplateModal } from "@/components/timetable/CreateTemplateModal"
import { CreateFromTemplateModal } from "@/components/timetable/CreateFromTemplateModal"
import { EditTemplateModal } from "@/components/timetable/EditTemplateModal"
import { EditEntryModal } from "@/components/timetable/EditEntryModal"
import { Pencil } from "lucide-react" // Ajouter à la ligne des imports lucide-react

// ✅ SYSTÈME 100% ALGÉRIEN
const DAYS_CONFIG = {
  days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
  daysMap: { 
    1: 'Dimanche',
    2: 'Lundi', 
    3: 'Mardi', 
    4: 'Mercredi', 
    5: 'Jeudi'
  },
  daysNumbers: [1, 2, 3, 4, 5],
}

const DAYS = DAYS_CONFIG.days
const DAYS_MAP = DAYS_CONFIG.daysMap
const DAYS_NUMBERS = DAYS_CONFIG.daysNumbers

export default function StaffEmploiDuTempsPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [templates, setTemplates] = useState<CourseTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false)
  const [showEditEntryModal, setShowEditEntryModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CourseTemplate | null>(null)
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null)
    
  // Modals
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [showCreateFromTemplateModal, setShowCreateFromTemplateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ day: number; hour: number } | null>(null)
  
  // Navigation par semaine
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [weekLabel, setWeekLabel] = useState('')

  const { userId } = useAuth()

  useEffect(() => {
    if (userId) {
      loadStaffClasses()
    }
  }, [userId])

  useEffect(() => {
    if (selectedClassId) {
      loadTimetable()
      loadTemplates()
    }
  }, [selectedClassId])

  // Calculer le label de la semaine
  useEffect(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    
    // Aller au dimanche (jour 0)
    const dayOfWeek = today.getDay()
    startOfWeek.setDate(today.getDate() - dayOfWeek + (currentWeekOffset * 7))
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 4) // Dimanche + 4 = Jeudi
    
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

  const loadTemplates = async () => {
    try {
      const response = await timetableApi.getTemplates(selectedClassId)
      if (response.success) {
        setTemplates(response.data)
      }
    } catch (error) {
      console.error('Erreur chargement templates:', error)
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

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Supprimer ce template ? Les cours créés ne seront pas supprimés.')) {
      return
    }

    try {
      await timetableApi.deleteTemplate(templateId)
      loadTemplates()
    } catch (error) {
      console.error('Erreur suppression template:', error)
      alert('Erreur lors de la suppression du template')
    }
  }

  const handleUseTemplate = (template: CourseTemplate) => {
    setSelectedTemplate(template)
    // L'utilisateur va maintenant cliquer sur une case horaire
  }

  const handleTimeSlotClick = (day: number, hour: number) => {
    if (!selectedTemplate) {
      alert('Sélectionnez d\'abord un template dans la bibliothèque')
      return
    }

    setSelectedTimeSlot({ day, hour })
    setShowCreateFromTemplateModal(true)
  }

  const handleTemplateCreated = () => {
    loadTemplates()
    setShowCreateTemplateModal(false)
  }

  const handleEntryCreated = () => {
    loadTimetable()
    setShowCreateFromTemplateModal(false)
    setSelectedTemplate(null)
    setSelectedTimeSlot(null)
  }

  const getEntriesForDay = (dayOfWeek: number) => {
    return entries.filter(e => e.day_of_week === dayOfWeek).sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    )
  }

  const filteredTemplates = templates.filter(t => 
    t.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout requiredRole="staff">
      <div className="flex h-[calc(100vh-80px)] gap-4">
        {/* PARTIE 1/2 - Continuer dans le prochain message */}
        {/* ========== BIBLIOTHÈQUE DE TEMPLATES (GAUCHE) ========== */}
        <div className="w-80 flex-shrink-0">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">📖 Mes Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedTemplate ? '✅ Template sélectionné' : 'Cliquez pour utiliser'}
              </p>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto space-y-4">
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

              {/* Bouton créer template */}
              <Button
                onClick={() => setShowCreateTemplateModal(true)}
                variant="outline"
                className="w-full"
                disabled={!selectedClassId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un template
              </Button>

              {/* Liste des templates */}
              <div className="space-y-2">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {templates.length === 0 
                      ? 'Aucun template. Créez-en un !'
                      : 'Aucun résultat'
                    }
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{
                        borderLeftWidth: '4px',
                        borderLeftColor: template.subject_color || '#3b82f6',
                      }}
                      onClick={() => handleUseTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {template.subject_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {template.teacher_name}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {template.default_duration}min
                            </Badge>
                            {template.default_room && (
                              <Badge variant="outline" className="text-xs">
                                📍 {template.default_room}
                              </Badge>
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

                      {selectedTemplate?.id === template.id && (
                        <div className="mt-2 text-xs text-primary font-medium">
                          → Cliquez sur une case horaire
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========== CALENDRIER (DROITE) ========== */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Navigation semaine + sélection classe */}
          <div className="space-y-4">
            {/* Sélection classe */}
            <Card>
              <CardContent className="pt-6">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
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

            {/* Navigation par semaine */}
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
                          className="text-xs h-auto p-0"
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
          </div>

          {/* Grille emploi du temps */}
          <Card className="flex-1 overflow-hidden">
            <CardHeader>
              <CardTitle>Emploi du temps</CardTitle>
              {selectedTemplate && (
                <div className="text-sm text-primary">
                  📌 Template sélectionné : <strong>{selectedTemplate.subject_name}</strong>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplate(null)}
                    className="ml-2"
                  >
                    Annuler
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {loading ? (
                <div className="text-center py-12">Chargement...</div>
              ) : (
                <>
                  {/* Grille des jours */}
                  {/* Grille emploi du temps avec heures à gauche */}
                  <div className="flex gap-2">
                    {/* Colonne des heures */}
                    <div className="w-16 flex-shrink-0">
                      <div className="h-12 mb-3"></div> {/* Espace pour l'en-tête */}
                      {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(hour => (
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
                          {/* En-tête du jour */}
                          <h3 className="font-medium text-center mb-3 sticky top-0 bg-white py-2 h-12">
                            {DAYS[idx]}
                          </h3>
                          
                          {/* Créneaux horaires */}
                          <div className="space-y-2 relative">
                            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(hour => {
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
                                    // Calculer la durée en heures
                                    const [startH, startM] = entry.start_time.split(':').map(Number)
                                    const [endH, endM] = entry.end_time.split(':').map(Number)
                                    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM)
                                    const durationHours = durationMinutes / 60
                                    
                                    // Calculer le nombre de cases à occuper
                                    const numberOfSlots = Math.ceil(durationHours)
                                    
                                    // Calculer la hauteur : (cases × 80px) + (espacements × 8px)
                                    const height = (numberOfSlots * 80) + ((numberOfSlots - 1) * 8)  // ✅ NOUVELLE LIGNE
                                    
                                    return (
                                      <div
                                        key={entry.id}
                                        className="p-2 rounded border mb-1 group relative"
                                        style={{
                                          backgroundColor: entry.subject_color ? `${entry.subject_color}20` : '#f0f0f0',
                                          borderColor: entry.subject_color || '#ccc',
                                          minHeight: `${height}px`,
                                          height: `${height}px`,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="flex items-start justify-between h-full">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-xs truncate">
                                              {entry.subject_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                              {entry.start_time} - {entry.end_time}
                                            </div>
                                            <div className="text-xs mt-0.5">{entry.teacher_name}</div>
                                            {entry.room && <div className="text-xs">📍 {entry.room}</div>}
                                            
                                            {/* Afficher la durée si > 1h30 */}
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
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                    )
                                  })}

                                  {/* Indicateur si template sélectionné */}
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

                  {/* Statistiques */}
                  <div className="grid grid-cols-4 gap-4 pt-4 border-t">
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showCreateTemplateModal && (
        <CreateTemplateModal
          classId={selectedClassId}
          onClose={() => setShowCreateTemplateModal(false)}
          onSuccess={handleTemplateCreated}
        />
      )}

      {showCreateFromTemplateModal && selectedTemplate && selectedTimeSlot && (
        <CreateFromTemplateModal
          template={selectedTemplate}
          dayOfWeek={selectedTimeSlot.day}
          defaultHour={selectedTimeSlot.hour}
          onClose={() => {
            setShowCreateFromTemplateModal(false)
            setSelectedTemplate(null)
            setSelectedTimeSlot(null)
          }}
          onSuccess={handleEntryCreated}
        />
      )}

      {/* Modal modification template */}
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

      {/* Modal modification cours */}
      {showEditEntryModal && editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => {
            setShowEditEntryModal(false)
            setEditingEntry(null)
          }}
          onSuccess={() => {
            loadTimetable()
            setShowEditEntryModal(false)
            setEditingEntry(null)
          }}
        />
      )}
    </DashboardLayout>
  )
}