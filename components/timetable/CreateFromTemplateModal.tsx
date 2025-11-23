"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { timetableApi, type CourseTemplate } from "@/lib/api/timetable"

interface CreateFromTemplateModalProps {
  template: CourseTemplate
  dayOfWeek: number
  defaultHour: number
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

export function CreateFromTemplateModal({
  template,
  dayOfWeek,
  defaultHour,
  onClose,
  onSuccess
}: CreateFromTemplateModalProps) {
  const [loading, setLoading] = useState(false)
  const [room, setRoom] = useState(template.default_room || '')
  const [startTime, setStartTime] = useState(`${defaultHour.toString().padStart(2, '0')}:00`)

  // Calculer l'heure de fin basée sur la durée du template
  const calculateEndTime = () => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + template.default_duration
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await timetableApi.createFromTemplate({
        template_id: template.id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        room: room || undefined,
      })
      onSuccess()
    } catch (error: any) {
      console.error('Erreur création cours:', error)
      if (error.message.includes('409')) {
        alert('Conflit détecté : un cours existe déjà à cet horaire')
      } else {
        alert('Erreur lors de la création du cours')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un cours</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations du template */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: template.subject_color }}
              />
              <span className="font-semibold">{template.subject_name}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Professeur : {template.teacher_name}
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {template.default_duration} min
              </Badge>
              <Badge variant="outline">
                {DAYS_MAP[dayOfWeek as keyof typeof DAYS_MAP]}
              </Badge>
            </div>
          </div>

          {/* Heure de début */}
          <div>
            <Label>Heure de début</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* Heure de fin (calculée) */}
          <div>
            <Label>Heure de fin (automatique)</Label>
            <Input
              type="text"
              value={calculateEndTime()}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Calculée automatiquement : {startTime} + {template.default_duration} min
            </p>
          </div>

          {/* Salle */}
          <div>
            <Label>Salle</Label>
            <Input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Ex: 302"
            />
            {template.default_room && (
              <p className="text-xs text-muted-foreground mt-1">
                Par défaut : {template.default_room}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Création...' : 'Créer le cours'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}