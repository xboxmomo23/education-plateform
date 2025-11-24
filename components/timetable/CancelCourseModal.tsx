"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"
import { timetableOverrideApi } from "@/lib/api/timetable-override"

interface CancelCourseModalProps {
  entry: any // TimetableEntry
  overrideDate: string // Format YYYY-MM-DD
  onClose: () => void
  onSuccess: () => void
}

const DAYS_MAP = {
  1: 'Dimanche',
  2: 'Lundi',
  3: 'Mardi',
  4: 'Mercredi',
  5: 'Jeudi'
}

export function CancelCourseModal({ entry, overrideDate, onClose, onSuccess }: CancelCourseModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)

      await timetableOverrideApi.create({
        template_entry_id: entry.id,
        override_date: overrideDate,
        override_type: 'cancel',
        reason: reason || undefined,
      })

      onSuccess()
    } catch (error) {
      console.error('Erreur annulation cours:', error)
      alert('Erreur lors de l\'annulation du cours')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Annuler un cours</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations du cours */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-red-900">
                Cours à annuler
              </span>
            </div>
            
            <div className="space-y-1 text-sm">
              <div><strong>Matière :</strong> {entry.subject_name}</div>
              <div><strong>Date :</strong> {DAYS_MAP[entry.day_of_week as keyof typeof DAYS_MAP]} {new Date(overrideDate).toLocaleDateString('fr-FR')}</div>
              <div><strong>Horaire :</strong> {entry.start_time} - {entry.end_time}</div>
              <div><strong>Professeur :</strong> {entry.teacher_name}</div>
              {entry.room && <div><strong>Salle :</strong> {entry.room}</div>}
            </div>
          </div>

          {/* Raison */}
          <div>
            <Label>Raison de l'annulation (optionnel)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Professeur absent - maladie"
              rows={3}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cette information sera visible par les élèves et parents
            </p>
          </div>

          {/* Avertissement */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm">
            <p className="text-amber-900">
              ⚠️ <strong>Attention :</strong> Ce cours sera marqué comme annulé uniquement pour cette date. 
              Le template (emploi du temps type) ne sera pas modifié.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              variant="destructive"
            >
              {loading ? 'Annulation...' : 'Confirmer l\'annulation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}