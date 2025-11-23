"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { timetableApi, type CourseTemplate } from "@/lib/api/timetable"

interface EditTemplateModalProps {
  template: CourseTemplate
  onClose: () => void
  onSuccess: () => void
}

export function EditTemplateModal({ template, onClose, onSuccess }: EditTemplateModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    default_duration: template.default_duration,
    default_room: template.default_room || '',
  })

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await timetableApi.updateTemplate(template.id, formData)
      onSuccess()
    } catch (error) {
      console.error('Erreur modification template:', error)
      alert('Erreur lors de la modification du template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations non modifiables */}
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
            <p className="text-xs text-muted-foreground">
              Ces informations ne peuvent pas être modifiées. Supprimez et recréez le template si nécessaire.
            </p>
          </div>

          {/* Durée modifiable */}
          <div>
            <Label>Durée par défaut</Label>
            <Select
              value={formData.default_duration.toString()}
              onValueChange={(value) => setFormData({ ...formData, default_duration: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">1h (60 min)</SelectItem>
                <SelectItem value="90">1h30 (90 min)</SelectItem>
                <SelectItem value="120">2h (120 min)</SelectItem>
                <SelectItem value="150">2h30 (150 min)</SelectItem>
                <SelectItem value="180">3h (180 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Salle modifiable */}
          <div>
            <Label>Salle par défaut</Label>
            <Input
              type="text"
              value={formData.default_room}
              onChange={(e) => setFormData({ ...formData, default_room: e.target.value })}
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