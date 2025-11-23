"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { timetableApi, type TimetableEntry } from "@/lib/api/timetable"

interface EditEntryModalProps {
  entry: TimetableEntry
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

export function EditEntryModal({ entry, onClose, onSuccess }: EditEntryModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    day_of_week: entry.day_of_week,
    start_time: entry.start_time,
    end_time: entry.end_time,
    room: entry.room || '',
  })

  const calculateDuration = () => {
    const [startH, startM] = formData.start_time.split(':').map(Number)
    const [endH, endM] = formData.end_time.split(':').map(Number)
    return (endH * 60 + endM) - (startH * 60 + startM)
  }

  const handleSubmit = async () => {
    const duration = calculateDuration()
    
    if (duration <= 0) {
      alert('L\'heure de fin doit être après l\'heure de début')
      return
    }

    try {
      setLoading(true)
      await timetableApi.updateEntry(entry.id, formData)
      onSuccess()
    } catch (error: any) {
      console.error('Erreur modification:', error)
      if (error.message.includes('409')) {
        alert('Conflit détecté : un autre cours existe déjà à cet horaire')
      } else {
        alert('Erreur lors de la modification')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le cours</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations non modifiables */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: entry.subject_color }}
              />
              <span className="font-semibold">{entry.subject_name}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Professeur : {entry.teacher_name}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ℹ️ La matière et le professeur ne peuvent pas être modifiés
            </p>
          </div>

          {/* Jour */}
          <div>
            <Label>Jour de la semaine</Label>
            <Select
              value={formData.day_of_week.toString()}
              onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DAYS_MAP).map(([num, name]) => (
                  <SelectItem key={num} value={num}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Heure de début */}
          <div>
            <Label>Heure de début</Label>
            <Input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
          </div>

          {/* Heure de fin */}
          <div>
            <Label>Heure de fin</Label>
            <Input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
            <p className="text-xs text-blue-600 mt-1">
              Durée : {calculateDuration()} minutes
            </p>
          </div>

          {/* Salle */}
          <div>
            <Label>Salle</Label>
            <Input
              type="text"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              placeholder="Ex: 302"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}