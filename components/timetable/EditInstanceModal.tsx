"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { timetableInstanceApi, type TimetableInstance } from "@/lib/api/timetable-instance"

const DAYS_MAP: { [key: number]: string } = {
  1: 'Dimanche',
  2: 'Lundi',
  3: 'Mardi',
  4: 'Mercredi',
  5: 'Jeudi',
}

interface EditInstanceModalProps {
  instance: TimetableInstance
  onClose: () => void
  onSuccess: () => void
}

export function EditInstanceModal({ instance, onClose, onSuccess }: EditInstanceModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    day_of_week: instance.day_of_week,
    start_time: instance.start_time,
    end_time: instance.end_time,
    room: instance.room || '',
    notes: instance.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await timetableInstanceApi.update(instance.id, {
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        room: formData.room || undefined,
        notes: formData.notes || undefined,
      })

      if (response.success) {
        onSuccess()
      } else {
        setError('Erreur lors de la modification')
      }
    } catch (err: any) {
      console.error('❌ Erreur modification instance:', err)
      setError(err.message || 'Erreur lors de la modification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le cours</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Matière (lecture seule) */}
          <div className="space-y-2">
            <Label>Matière</Label>
            <Input 
              value={instance.subject_name || 'N/A'} 
              disabled 
              className="bg-gray-50"
            />
          </div>

          {/* Professeur (lecture seule) */}
          <div className="space-y-2">
            <Label>Professeur</Label>
            <Input 
              value={instance.teacher_name || 'N/A'} 
              disabled 
              className="bg-gray-50"
            />
          </div>

          {/* Jour de la semaine */}
          <div className="space-y-2">
            <Label>Jour de la semaine</Label>
            <Select
              value={formData.day_of_week.toString()}
              onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DAYS_MAP).map(([day, label]) => (
                  <SelectItem key={day} value={day}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Heure de début */}
          <div className="space-y-2">
            <Label>Heure de début</Label>
            <Input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />
          </div>

          {/* Heure de fin */}
          <div className="space-y-2">
            <Label>Heure de fin</Label>
            <Input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
            />
          </div>

          {/* Salle */}
          <div className="space-y-2">
            <Label>Salle</Label>
            <Input
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              placeholder="Ex: Salle 205"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes supplémentaires..."
              rows={3}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Modification...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}