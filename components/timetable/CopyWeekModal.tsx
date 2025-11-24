"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AlertCircle } from "lucide-react"
import { timetableInstanceApi } from "@/lib/api/timetable-instance"

interface CopyWeekModalProps {
  classId: string
  sourceWeek: string
  onClose: () => void
  onSuccess: () => void
}

export function CopyWeekModal({ classId, sourceWeek, onClose, onSuccess }: CopyWeekModalProps) {
  const [targetWeek, setTargetWeek] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!targetWeek) {
      alert('Veuillez sélectionner une semaine cible')
      return
    }

    if (targetWeek === sourceWeek) {
      alert('La semaine cible doit être différente de la semaine source')
      return
    }

    try {
      setLoading(true)

      const result = await timetableInstanceApi.copyWeek(classId, sourceWeek, targetWeek)

      alert(`${result.data.count} cours copiés avec succès`)
      onSuccess()
    } catch (error) {
      console.error('Erreur copie semaine:', error)
      alert('Erreur lors de la copie')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copier une semaine</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <div className="font-medium">Semaine source</div>
            <div className="text-muted-foreground">
              Dimanche {new Date(sourceWeek).toLocaleDateString('fr-FR')}
            </div>
          </div>

          <div>
            <Label>Semaine cible (Dimanche)</Label>
            <Input
              type="date"
              value={targetWeek}
              onChange={(e) => setTargetWeek(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Sélectionnez un dimanche (début de semaine)
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <strong>Attention :</strong> Les cours existants de la semaine cible seront remplacés par ceux de la semaine source.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Copie en cours...' : 'Copier la semaine'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}