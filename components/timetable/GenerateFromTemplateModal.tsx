"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { timetableInstanceApi } from "@/lib/api/timetable-instance"

interface GenerateFromTemplateModalProps {
  classId: string
  weekStartDate: string
  onClose: () => void
  onSuccess: () => void
}

export function GenerateFromTemplateModal({ 
  classId, 
  weekStartDate, 
  onClose, 
  onSuccess 
}: GenerateFromTemplateModalProps) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    try {
      setLoading(true)

      const result = await timetableInstanceApi.generateFromTemplate(classId, weekStartDate)

      alert(`${result.data.count} cours générés depuis le template`)
      onSuccess()
    } catch (error) {
      console.error('Erreur génération:', error)
      alert('Erreur lors de la génération')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Générer depuis le template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm">
            Voulez-vous copier l'emploi du temps type (template) vers cette semaine ?
          </p>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <div className="font-medium">Semaine cible</div>
            <div className="text-muted-foreground">
              Du {new Date(weekStartDate).toLocaleDateString('fr-FR')} au{' '}
              {new Date(new Date(weekStartDate).getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Attention :</strong> Tous les cours existants de cette semaine seront supprimés et remplacés par le template.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? 'Génération...' : 'Générer les cours'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}