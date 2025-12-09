"use client"

import React, { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Calendar, Info } from "lucide-react"
import { timetableInstanceApi } from "@/lib/api/timetable-instance"
import {
  generateWeeksBetween,
  getPresetWeeks,
  getPresetLabel,
  formatDateRange,
  calculateTotalCourses,
} from "@/lib/date-utils"
import { getWeekStart } from "@/lib/date"

interface GenerateFromTemplateModalProps {
  classId: string
  weekStartDate: string  // Date de la semaine actuelle
  onClose: () => void
  onSuccess: () => void
}

type SelectionMode = 'single' | 'range' | 'preset'

// Nombre moyen de cours par semaine (vous pouvez l'ajuster)
const AVERAGE_COURSES_PER_WEEK = 20

export function GenerateFromTemplateModal({ 
  classId, 
  weekStartDate, 
  onClose, 
  onSuccess 
}: GenerateFromTemplateModalProps) {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<SelectionMode>('single')
  
  // États pour le mode "single"
  const [singleDate, setSingleDate] = useState(weekStartDate)
  
  // États pour le mode "range"
  const [rangeStart, setRangeStart] = useState(weekStartDate)
  const [rangeEnd, setRangeEnd] = useState(weekStartDate)
  
  // États pour le mode "preset"
  const [selectedPreset, setSelectedPreset] = useState<string>('end-of-year')

  // Calculer les semaines cibles selon le mode
  const targetWeeks = useMemo(() => {
    if (mode === 'single') {
      return singleDate ? [getWeekStart(singleDate)] : []
    } else if (mode === 'range') {
      if (!rangeStart || !rangeEnd) return []
      return generateWeeksBetween(rangeStart, rangeEnd)
    } else if (mode === 'preset') {
      return getPresetWeeks(selectedPreset)
    }
    return []
  }, [mode, singleDate, rangeStart, rangeEnd, selectedPreset])

  // Calculer les statistiques
  const weeksCount = targetWeeks.length
  const estimatedCourses = calculateTotalCourses(weeksCount, AVERAGE_COURSES_PER_WEEK)
  const estimatedTime = weeksCount < 5 ? '~1 seconde' : `~${Math.ceil(weeksCount / 5)} secondes`

  const handleGenerate = async () => {
    if (targetWeeks.length === 0) {
      alert('Aucune semaine sélectionnée')
      return
    }

    // Confirmation pour les grandes quantités
    if (estimatedCourses > 100) {
      const confirmed = confirm(
        `⚠️ ATTENTION\n\n` +
        `Vous allez créer environ ${estimatedCourses} cours dans ${weeksCount} semaines.\n\n` +
        `Cette opération peut prendre ${estimatedTime}.\n\n` +
        `Voulez-vous continuer ?`
      )
      if (!confirmed) return
    }

    try {
      setLoading(true)

      if (mode === 'single') {
        const [targetWeek] = targetWeeks
        const result = await timetableInstanceApi.generateFromTemplate(
          classId,
          weekStartDate,
          targetWeek
        )
        const created = result.data?.count ?? 0
        if (created > 0) {
          alert(`✅ ${created} cours générés pour la semaine du ${targetWeek}`)
        } else {
          alert(
            `⚠ Aucun cours généré. Vérifiez que la semaine modèle (${weekStartDate}) contient bien des cours.`
          )
        }
      } else {
        const result = await timetableInstanceApi.generateFromTemplateBulk(
          classId,
          weekStartDate,
          targetWeeks
        )

        const successCount = result.data.details.filter(d => d.success).length
        const errorCount = result.data.details.filter(d => !d.success).length
        const totalCreated = result.data.totalCreated

        if (errorCount === 0) {
          if (totalCreated > 0) {
            alert(`✅ ${totalCreated} cours générés dans ${successCount} semaines`)
          } else {
            alert(
              `⚠ Aucun cours généré. Assurez-vous que la semaine modèle (${weekStartDate}) contient des cours.`
            )
          }
        } else {
          alert(
            `⚠️ Génération partielle\n\n` +
            `✅ ${totalCreated} cours créés dans ${successCount} semaines\n` +
            `❌ ${errorCount} semaines en erreur\n\n` +
            `Vérifiez la console pour plus de détails.`
          )
          console.error('Erreurs de génération:', result.data.details.filter(d => !d.success))
        }
      }
      
      onSuccess()
    } catch (error) {
      console.error('Erreur génération:', error)
      alert('❌ Erreur lors de la génération des cours')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Générer depuis le template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 1️⃣ SÉLECTION DU MODE */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Mode de génération</Label>
            <RadioGroup value={mode} onValueChange={(val) => setMode(val as SelectionMode)}>
              {/* Mode : Semaine unique */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="single" id="mode-single" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="mode-single" className="cursor-pointer font-medium">
                    Semaine unique
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Générer les cours pour une seule semaine spécifique
                  </p>
                  {mode === 'single' && (
                    <div className="mt-3">
                      <Input
                        type="date"
                        value={singleDate}
                        onChange={(e) => setSingleDate(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Mode : Période continue */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="range" id="mode-range" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="mode-range" className="cursor-pointer font-medium">
                    Période continue
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Générer les cours pour toutes les semaines entre deux dates
                  </p>
                  {mode === 'range' && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">Date de début</Label>
                          <Input
                            type="date"
                            value={rangeStart}
                            onChange={(e) => setRangeStart(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Date de fin</Label>
                          <Input
                            type="date"
                            value={rangeEnd}
                            onChange={(e) => setRangeEnd(e.target.value)}
                          />
                        </div>
                      </div>
                      {rangeStart && rangeEnd && (
                        <p className="text-sm text-blue-600">
                          📅 {formatDateRange(rangeStart, rangeEnd)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mode : Raccourcis */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="preset" id="mode-preset" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="mode-preset" className="cursor-pointer font-medium">
                    Raccourcis rapides
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Générer les cours selon des périodes prédéfinies
                  </p>
                  {mode === 'preset' && (
                    <div className="mt-3">
                      <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                        <SelectTrigger className="max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="end-of-year">
                            🎄 {getPresetLabel('end-of-year')}
                          </SelectItem>
                          <SelectItem value="semester-2">
                            📚 {getPresetLabel('semester-2')}
                          </SelectItem>
                          <SelectItem value="full-year">
                            📅 {getPresetLabel('full-year')}
                          </SelectItem>
                          <SelectItem value="next-month">
                            📆 {getPresetLabel('next-month')}
                          </SelectItem>
                          <SelectItem value="next-quarter">
                            🗓️ {getPresetLabel('next-quarter')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 2️⃣ PRÉVISUALISATION */}
          {targetWeeks.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-blue-900">Résumé de la génération</div>
                  <div className="mt-2 space-y-1 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>Nombre de semaines :</span>
                      <span className="font-semibold">{weeksCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cours estimés :</span>
                      <span className="font-semibold">~{estimatedCourses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Temps estimé :</span>
                      <span className="font-semibold">{estimatedTime}</span>
                    </div>
                  </div>

                  {/* Afficher quelques semaines */}
                  {targetWeeks.length <= 5 && (
                    <div className="mt-3 text-xs text-blue-700">
                      <div className="font-medium mb-1">Semaines :</div>
                      {targetWeeks.map((week) => (
                        <div key={week}>
                          • {new Date(week).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3️⃣ AVERTISSEMENT */}
          {estimatedCourses > 100 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <strong>Attention :</strong> Cette opération va créer un grand nombre de cours.
                  Les cours existants dans ces semaines seront supprimés et remplacés par le template.
                </div>
              </div>
            </div>
          )}

          {/* 4️⃣ ACTIONS */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={loading || targetWeeks.length === 0}
              className="min-w-[200px]"
            >
              {loading ? (
                <>⏳ Génération en cours...</>
              ) : (
                <>📋 Générer {estimatedCourses > 0 ? `~${estimatedCourses} cours` : ''}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
