"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { X, GraduationCap, Loader2, Calendar, CheckCircle } from "lucide-react"
import { termsApi, type CreateTermInput } from "@/lib/api/term"

interface TermPresetModalProps {
  academicYear: number
  onClose: () => void
  onCreated: () => void
}

type PresetType = "trimester" | "semester"

interface PresetConfig {
  type: PresetType
  label: string
  description: string
  periods: Array<{
    name: string
    startMonth: number
    startDay: number
    endMonth: number
    endDay: number
  }>
}

const PRESETS: PresetConfig[] = [
  {
    type: "trimester",
    label: "Trimestres (3 périodes)",
    description: "Septembre-Novembre, Décembre-Février, Mars-Juin",
    periods: [
      { name: "Trimestre 1", startMonth: 9, startDay: 1, endMonth: 11, endDay: 30 },
      { name: "Trimestre 2", startMonth: 12, startDay: 1, endMonth: 2, endDay: 28 },
      { name: "Trimestre 3", startMonth: 3, startDay: 1, endMonth: 6, endDay: 30 },
    ],
  },
  {
    type: "semester",
    label: "Semestres (2 périodes)",
    description: "Septembre-Janvier, Février-Juin",
    periods: [
      { name: "Semestre 1", startMonth: 9, startDay: 1, endMonth: 1, endDay: 31 },
      { name: "Semestre 2", startMonth: 2, startDay: 1, endMonth: 6, endDay: 30 },
    ],
  },
]

export function TermPresetModal({ academicYear, onClose, onCreated }: TermPresetModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetType>("trimester")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string[]>([])

  // Empêcher le scroll du body quand le modal est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const getDateForPeriod = (month: number, day: number, isEnd: boolean = false): string => {
    // L'année scolaire commence en septembre de academicYear
    // et se termine en juin de academicYear + 1
    let year = academicYear
    
    // Si le mois est avant septembre (1-8), c'est l'année suivante
    if (month < 9) {
      year = academicYear + 1
    }

    // Gérer le 28/29 février
    if (month === 2 && day > 28) {
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
      day = isLeapYear ? 29 : 28
    }

    // Gérer les mois avec 30 jours
    if ([4, 6, 9, 11].includes(month) && day > 30) {
      day = 30
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const handleCreate = async () => {
    setError(null)
    setProgress([])

    const preset = PRESETS.find(p => p.type === selectedPreset)
    if (!preset) return

    try {
      setIsSubmitting(true)

      // Créer chaque période
      for (let i = 0; i < preset.periods.length; i++) {
        const period = preset.periods[i]
        
        setProgress(prev => [...prev, `Création de ${period.name}...`])

        const createData: CreateTermInput = {
          name: period.name,
          startDate: getDateForPeriod(period.startMonth, period.startDay),
          endDate: getDateForPeriod(period.endMonth, period.endDay, true),
          academicYear: academicYear,
          isCurrent: i === 0, // La première période est la courante par défaut
        }

        const response = await termsApi.createTerm(createData)

        if (!response.success) {
          setError(`Erreur lors de la création de ${period.name}: ${response.error}`)
          return
        }

        setProgress(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = `✓ ${period.name} créé`
          return updated
        })

        // Petit délai pour l'UX
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Succès
      setProgress(prev => [...prev, "✓ Toutes les périodes ont été créées !"])
      
      // Attendre un peu avant de fermer
      await new Promise(resolve => setTimeout(resolve, 500))
      
      onCreated()
    } catch (err) {
      console.error("Error creating terms:", err)
      setError("Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedConfig = PRESETS.find(p => p.type === selectedPreset)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Créer depuis un modèle</h2>
              <p className="text-sm text-muted-foreground">
                Année {academicYear}-{academicYear + 1}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Choix du modèle */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Choisissez votre système</Label>
            
            <RadioGroup
              value={selectedPreset}
              onValueChange={(value) => setSelectedPreset(value as PresetType)}
              disabled={isSubmitting}
            >
              {PRESETS.map((preset) => (
                <label
                  key={preset.type}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedPreset === preset.type
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <RadioGroupItem value={preset.type} className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {preset.description}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Aperçu des périodes */}
          {selectedConfig && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Aperçu des périodes</Label>
              <div className="space-y-2">
                {selectedConfig.periods.map((period, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{period.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(getDateForPeriod(period.startMonth, period.startDay)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {" → "}
                        {new Date(getDateForPeriod(period.endMonth, period.endDay, true)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    {idx === 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Courante
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {progress.length > 0 && (
            <div className="space-y-2 p-4 rounded-lg bg-green-50 border border-green-200">
              {progress.map((msg, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-green-700">
                  {msg.startsWith("✓") ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {msg.replace("✓ ", "")}
                </div>
              ))}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-slate-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Créer {selectedConfig?.periods.length} périodes
          </Button>
        </div>
      </div>
    </div>
  )
}
