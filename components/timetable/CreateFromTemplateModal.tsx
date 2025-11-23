"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
  const [endTime, setEndTime] = useState('')
  const [manualEndTime, setManualEndTime] = useState(false)

  // Calculer l'heure de fin automatiquement
  useEffect(() => {
    if (!manualEndTime) {
      const [hours, minutes] = startTime.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + template.default_duration
      const endHours = Math.floor(totalMinutes / 60)
      const endMinutes = totalMinutes % 60
      setEndTime(`${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`)
    }
  }, [startTime, manualEndTime, template.default_duration])

  const calculateDuration = () => {
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const duration = (endH * 60 + endM) - (startH * 60 + startM)
    return duration
  }

  const handleSubmit = async () => {
  const duration = calculateDuration()
  
  if (duration <= 0) {
    alert('L\'heure de fin doit être après l\'heure de début')
    return
  }

  if (duration > 360) {
    if (!confirm('Ce cours dure plus de 6 heures. Êtes-vous sûr ?')) {
      return
    }
  }

  try {
    setLoading(true)
    
    console.log('📝 Création cours depuis template:', {
      template_id: template.id,
      course_id: template.course_id,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      room: room || null,
    })
    
    // Créer le cours directement avec toutes les infos
    const response = await fetch('http://localhost:5000/api/timetable/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        course_id: template.course_id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room: room || null,
      }),
    })

    const data = await response.json()
    console.log('📦 Réponse création cours:', data)

    if (response.ok) {
      console.log('✅ Cours créé avec succès')
      onSuccess()
    } else {
      console.error('❌ Erreur serveur:', data)
      if (response.status === 409) {
        alert('Conflit détecté : ' + data.error)
      } else {
        alert('Erreur : ' + data.error)
      }
    }
  } catch (error: any) {
    console.error('❌ Erreur création cours:', error)
    alert('Erreur lors de la création du cours')
  } finally {
    setLoading(false)
  }
}

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
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
                {DAYS_MAP[dayOfWeek as keyof typeof DAYS_MAP]}
              </Badge>
              {!manualEndTime && (
                <Badge variant="outline">
                  Durée : {template.default_duration} min
                </Badge>
              )}
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

          {/* Toggle pour heure de fin manuelle */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-medium">Personnaliser la durée</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Modifier l'heure de fin manuellement
              </p>
            </div>
            <Switch
              checked={manualEndTime}
              onCheckedChange={setManualEndTime}
            />
          </div>

          {/* Heure de fin */}
          <div>
            <Label>Heure de fin</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={!manualEndTime}
              className={!manualEndTime ? 'bg-gray-50' : ''}
            />
            {!manualEndTime ? (
              <p className="text-xs text-muted-foreground mt-1">
                Calculée automatiquement : {startTime} + {template.default_duration} min
              </p>
            ) : (
              <p className="text-xs text-blue-600 mt-1">
                ✏️ Durée personnalisée : {calculateDuration()} min
              </p>
            )}
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