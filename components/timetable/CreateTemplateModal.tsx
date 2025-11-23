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

interface Subject {
  subject_id: string
  subject_name: string
  subject_color: string
}

interface Teacher {
  teacher_id: string
  teacher_name: string
}

export function CreateTemplateModal({ classId, onClose, onSuccess }: CreateTemplateModalProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  
  const [formData, setFormData] = useState({
    subject_id: '',
    teacher_id: '',
    course_id: '', // Sera créé ou récupéré
    default_duration: 90,
    default_room: '',
  })

  useEffect(() => {
    loadSubjects()
  }, [classId])

  useEffect(() => {
    if (formData.subject_id) {
      loadTeachersForSubject(formData.subject_id)
    } else {
      setTeachers([])
      setFormData(prev => ({ ...prev, teacher_id: '' }))
    }
  }, [formData.subject_id])

  const loadSubjects = async () => {
    try {
      const response = await timetableApi.getAvailableCourses(classId)
      if (response.success) {
        // Extraire les matières uniques
        const uniqueSubjects = response.data.reduce((acc: Subject[], course: any) => {
          if (!acc.find(s => s.subject_id === course.subject_id)) {
            acc.push({
              subject_id: course.subject_id,
              subject_name: course.subject_name,
              subject_color: course.subject_color,
            })
          }
          return acc
        }, [])
        setSubjects(uniqueSubjects)
      }
    } catch (error) {
      console.error('Erreur chargement matières:', error)
    }
  }

  const loadTeachersForSubject = async (subjectId: string) => {
    try {
      setLoadingTeachers(true)
      const response = await timetableApi.getAvailableCourses(classId)
      if (response.success) {
        // Filtrer les profs qui enseignent cette matière à cette classe
        const teachersForSubject = response.data
          .filter((course: any) => course.subject_id === subjectId)
          .map((course: any) => ({
            teacher_id: course.teacher_id,
            teacher_name: course.teacher_name,
            course_id: course.course_id, // On garde le course_id
          }))
        
        setTeachers(teachersForSubject)
        
        // Si un seul prof, le sélectionner automatiquement
        if (teachersForSubject.length === 1) {
          setFormData(prev => ({
            ...prev,
            teacher_id: teachersForSubject[0].teacher_id,
            course_id: teachersForSubject[0].course_id,
          }))
        }
      }
    } catch (error) {
      console.error('Erreur chargement profs:', error)
    } finally {
      setLoadingTeachers(false)
    }
  }

  const handleTeacherChange = async (teacherId: string) => {
    setFormData(prev => ({ ...prev, teacher_id: teacherId }))
    
    // Récupérer le course_id correspondant
    const response = await timetableApi.getAvailableCourses(classId)
    if (response.success) {
      const course = response.data.find(
        (c: any) => c.subject_id === formData.subject_id && c.teacher_id === teacherId
      )
      
      if (course) {
        setFormData(prev => ({ ...prev, course_id: course.course_id }))
      } else {
        // Si le cours n'existe pas, il faut le créer
        // Pour l'instant, on peut créer via l'API
        alert('Ce cours n\'existe pas encore dans le système. Contactez l\'admin.')
      }
    }
  }

  const handleSubmit = async () => {
    if (!formData.subject_id) {
      alert('Veuillez sélectionner une matière')
      return
    }
    if (!formData.teacher_id) {
      alert('Veuillez sélectionner un professeur')
      return
    }
    if (!formData.course_id) {
      alert('Erreur : cours introuvable')
      return
    }

    try {
      setLoading(true)
      await timetableApi.createTemplate({
        course_id: formData.course_id,
        default_duration: formData.default_duration,
        default_room: formData.default_room,
      })
      onSuccess()
    } catch (error: any) {
      console.error('Erreur création template:', error)
      if (error.message.includes('409')) {
        alert('Un template existe déjà pour ce cours')
      } else {
        alert('Erreur lors de la création du template')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un template de cours</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Matière */}
          <div>
            <Label>Matière</Label>
            <Select
              value={formData.subject_id}
              onValueChange={(value) => setFormData({ ...formData, subject_id: value, teacher_id: '', course_id: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une matière" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
                  <SelectItem key={subject.subject_id} value={subject.subject_id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: subject.subject_color }}
                      />
                      {subject.subject_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Professeur */}
          <div>
            <Label>Professeur</Label>
            <Select
              value={formData.teacher_id}
              onValueChange={handleTeacherChange}
              disabled={!formData.subject_id || loadingTeachers}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingTeachers 
                    ? "Chargement..." 
                    : !formData.subject_id 
                    ? "Sélectionnez d'abord une matière"
                    : teachers.length === 0
                    ? "Aucun professeur disponible"
                    : "Sélectionner un professeur"
                } />
              </SelectTrigger>
              <SelectContent>
                {teachers.map(teacher => (
                  <SelectItem key={teacher.teacher_id} value={teacher.teacher_id}>
                    {teacher.teacher_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.subject_id && teachers.length === 0 && !loadingTeachers && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Aucun professeur n'enseigne cette matière à cette classe
              </p>
            )}
          </div>

          {/* Durée */}
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
            <p className="text-xs text-muted-foreground mt-1">
              Vous pourrez modifier la durée lors de chaque création de cours
            </p>
          </div>

          {/* Salle */}
          <div>
            <Label>Salle par défaut</Label>
            <Input
              type="text"
              value={formData.default_room}
              onChange={(e) => setFormData({ ...formData, default_room: e.target.value })}
              placeholder="Ex: 302"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optionnel - Vous pourrez la modifier pour chaque cours
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !formData.course_id}>
              {loading ? 'Création...' : 'Créer le template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}