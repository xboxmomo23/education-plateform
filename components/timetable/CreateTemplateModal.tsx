"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { timetableApi } from "@/lib/api/timetable"

interface CreateTemplateModalProps {
  classId: string
  onClose: () => void
  onSuccess: () => void
}

export function CreateTemplateModal({ classId, onClose, onSuccess }: CreateTemplateModalProps) {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    course_id: '',
    default_duration: 90,
    default_room: '',
  })

  useEffect(() => {
    loadCourses()
  }, [classId])

  const loadCourses = async () => {
    try {
      const response = await timetableApi.getAvailableCourses(classId)
      if (response.success) {
        setCourses(response.data)
      }
    } catch (error) {
      console.error('Erreur chargement cours:', error)
    }
  }

  const handleSubmit = async () => {
    if (!formData.course_id) {
      alert('Veuillez sélectionner un cours')
      return
    }

    try {
      setLoading(true)
      await timetableApi.createTemplate(formData)
      onSuccess()
    } catch (error) {
      console.error('Erreur création template:', error)
      alert('Erreur lors de la création du template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un template de cours</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Cours (Matière + Professeur)</Label>
            <Select
              value={formData.course_id}
              onValueChange={(value) => setFormData({ ...formData, course_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un cours" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.course_id} value={course.course_id}>
                    {course.subject_name} - {course.teacher_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Durée par défaut (minutes)</Label>
            <Select
              value={formData.default_duration.toString()}
              onValueChange={(value) => setFormData({ ...formData, default_duration: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1h (60 min)</SelectItem>
                <SelectItem value="90">1h30 (90 min)</SelectItem>
                <SelectItem value="120">2h (120 min)</SelectItem>
                <SelectItem value="150">2h30 (150 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Salle par défaut</Label>
            <Input
              type="text"
              value={formData.default_room}
              onChange={(e) => setFormData({ ...formData, default_room: e.target.value })}
              placeholder="Ex: 302"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Vous pourrez la modifier lors de la création de chaque cours
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Création...' : 'Créer le template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}