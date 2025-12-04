"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { X, Calendar, Loader2 } from "lucide-react"
import { termsApi, type Term, type CreateTermInput, type UpdateTermInput } from "@/lib/api/term"

interface TermModalProps {
  term: Term | null  // null = création, Term = édition
  academicYear: number
  onClose: () => void
  onSaved: () => void
}

export function TermModal({ term, academicYear, onClose, onSaved }: TermModalProps) {
  const isEditing = !!term

  const [formData, setFormData] = useState({
    name: term?.name || "",
    startDate: term?.startDate?.split('T')[0] || "",
    endDate: term?.endDate?.split('T')[0] || "",
    isCurrent: term?.isCurrent || false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Empêcher le scroll du body quand le modal est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError("Le nom est requis")
      return
    }
    if (!formData.startDate || !formData.endDate) {
      setError("Les dates sont requises")
      return
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError("La date de début doit être avant la date de fin")
      return
    }

    try {
      setIsSubmitting(true)

      if (isEditing && term) {
        // Mise à jour
        const updateData: UpdateTermInput = {
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          isCurrent: formData.isCurrent,
        }

        const response = await termsApi.updateTerm(term.id, updateData)

        if (!response.success) {
          setError(response.error || "Erreur lors de la mise à jour")
          return
        }
      } else {
        // Création
        const createData: CreateTermInput = {
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          isCurrent: formData.isCurrent,
          academicYear: academicYear,
        }

        const response = await termsApi.createTerm(createData)

        if (!response.success) {
          setError(response.error || "Erreur lors de la création")
          return
        }
      }

      onSaved()
    } catch (err) {
      console.error("Error saving term:", err)
      setError("Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isEditing ? "Modifier la période" : "Nouvelle période"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Année {academicYear}-{academicYear + 1}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la période *</Label>
              <Input
                id="name"
                placeholder="Ex: Trimestre 1, Semestre 1..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Date de début */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            {/* Date de fin */}
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            {/* Période courante */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label htmlFor="isCurrent" className="font-medium">
                  Période courante
                </Label>
                <p className="text-sm text-muted-foreground">
                  Affichée par défaut aux élèves
                </p>
              </div>
              <Switch
                id="isCurrent"
                checked={formData.isCurrent}
                onCheckedChange={(checked) => setFormData({ ...formData, isCurrent: checked })}
              />
            </div>

            {/* Erreur */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-slate-50">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Enregistrer" : "Créer la période"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
