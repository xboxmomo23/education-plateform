"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { timetableOverrideApi } from "@/lib/api/timetable-override"

interface ChangeRoomModalProps {
  entry: any
  overrideDate: string
  onClose: () => void
  onSuccess: () => void
}

export function ChangeRoomModal({ entry, overrideDate, onClose, onSuccess }: ChangeRoomModalProps) {
  const [newRoom, setNewRoom] = useState(entry.room || '')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!newRoom.trim()) {
      alert('Veuillez indiquer une salle')
      return
    }

    try {
      setLoading(true)

      await timetableOverrideApi.create({
        template_entry_id: entry.id,
        override_date: overrideDate,
        override_type: 'modify_room',
        new_room: newRoom,
        reason: reason || undefined,
      })

      onSuccess()
    } catch (error) {
      console.error('Erreur changement salle:', error)
      alert('Erreur lors du changement de salle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Changer la salle</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Infos cours */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <div><strong>{entry.subject_name}</strong></div>
            <div>{entry.start_time} - {entry.end_time}</div>
            <div>{entry.teacher_name}</div>
            <div className="text-muted-foreground">
              {new Date(overrideDate).toLocaleDateString('fr-FR')}
            </div>
          </div>

          {/* Salle actuelle */}
          {entry.room && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <strong>Salle actuelle :</strong> {entry.room}
            </div>
          )}

          {/* Nouvelle salle */}
          <div>
            <Label>Nouvelle salle</Label>
            <Input
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="Ex: 201"
              className="mt-1"
            />
          </div>

          {/* Raison */}
          <div>
            <Label>Raison (optionnel)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Salle 302 en travaux"
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Enregistrement...' : 'Changer la salle'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}