"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { timetableOverrideApi } from "@/lib/api/timetable-override"

interface ModifyTimeModalProps {
  entry: any
  overrideDate: string
  onClose: () => void
  onSuccess: () => void
}

export function ModifyTimeModal({ entry, overrideDate, onClose, onSuccess }: ModifyTimeModalProps) {
  const [startTime, setStartTime] = useState(entry.start_time)
  const [endTime, setEndTime] = useState(entry.end_time)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (startTime >= endTime) {
      alert('L\'heure de fin doit être après l\'heure de début')
      return
    }

    try {
      setLoading(true)

      await timetableOverrideApi.create({
        template_entry_id: entry.id,
        override_date: overrideDate,
        override_type: 'modify_time',
        new_start_time: startTime,
        new_end_time: endTime,
        reason: reason || undefined,
      })

      onSuccess()
    } catch (error) {
      console.error('Erreur modification horaire:', error)
      alert('Erreur lors de la modification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'horaire</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Infos */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <div><strong>{entry.subject_name}</strong></div>
            <div>{entry.teacher_name}</div>
            <div className="text-muted-foreground">
              {new Date(overrideDate).toLocaleDateString('fr-FR')}
            </div>
          </div>

          {/* Horaire actuel */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <strong>Horaire actuel :</strong> {entry.start_time} - {entry.end_time}
          </div>

          {/* Nouvel horaire */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Heure de début</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Heure de fin</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Raison */}
          <div>
            <Label>Raison (optionnel)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Retard transport scolaire"
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Enregistrement...' : 'Modifier l\'horaire'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}