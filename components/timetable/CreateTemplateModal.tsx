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

interface Course {
  course_id: string
  subject_id: string
  subject_name: string
  subject_code: string
  subject_color: string
  teacher_id: string
  teacher_name: string
  class_id: string
  class_label: string
}

export function CreateTemplateModal({ classId, onClose, onSuccess }: CreateTemplateModalProps) {
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(true)
  
  const [formData, setFormData] = useState({
    course_id: '',
    default_duration: 90,
    default_room: '',
  })

  // Charger tous les cours au montage
  useEffect(() => {
    loadAllCourses()
  }, [classId])

  const loadAllCourses = async () => {
    console.log('🔄 Chargement des cours pour la classe:', classId)
    try {
      setLoadingCourses(true)
      const response = await timetableApi.getAvailableCourses(classId)
      console.log('📦 Réponse API:', response)
      
      if (response.success && Array.isArray(response.data)) {
        console.log('✅ Cours chargés:', response.data.length, 'cours')
        console.log('📋 Détails des cours:', response.data)
        setAllCourses(response.data)
      } else {
        console.error('❌ Format de réponse invalide:', response)
        setAllCourses([])
      }
    } catch (error) {
      console.error('❌ Erreur chargement cours:', error)
      setAllCourses([])
    } finally {
      setLoadingCourses(false)
    }
  }

  // Extraire les matières uniques
  const uniqueSubjects = allCourses.reduce((acc: any[], course) => {
    if (!acc.find(s => s.subject_id === course.subject_id)) {
      acc.push({
        subject_id: course.subject_id,
        subject_name: course.subject_name,
        subject_color: course.subject_color,
      })
    }
    return acc
  }, [])

  console.log('📚 Matières uniques extraites:', uniqueSubjects)

  // Extraire les cours pour la matière sélectionnée
  const coursesForSelectedSubject = allCourses.filter(
    course => course.course_id === formData.course_id
  )

  const handleCourseSelect = (courseId: string) => {
    console.log('🎯 Cours sélectionné:', courseId)
    const selectedCourse = allCourses.find(c => c.course_id === courseId)
    console.log('📝 Détails du cours:', selectedCourse)
    
    setFormData(prev => ({
      ...prev,
      course_id: courseId,
    }))
  }

  const handleSubmit = async () => {
    if (!formData.course_id) {
      alert('Veuillez sélectionner un cours (matière + professeur)')
      return
    }

    console.log('💾 Création template avec:', formData)

    try {
      setLoading(true)
      const response = await timetableApi.createTemplate({
        course_id: formData.course_id,
        default_duration: formData.default_duration,
        default_room: formData.default_room || undefined,
      })
      
      console.log('✅ Template créé:', response)
      onSuccess()
    } catch (error: any) {
      console.error('❌ Erreur création template:', error)
      if (error.message && error.message.includes('409')) {
        alert('Un template existe déjà pour ce cours')
      } else {
        alert('Erreur lors de la création du template: ' + (error.message || 'Erreur inconnue'))
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
          {loadingCourses ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des cours...
            </div>
          ) : allCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">Aucun cours disponible</p>
              <p className="text-sm text-muted-foreground mt-2">
                Contactez l'administrateur pour créer des cours pour cette classe
              </p>
            </div>
          ) : (
            <>
              {/* Sélection du cours (Matière + Professeur) */}
              <div>
                <Label>Cours (Matière + Professeur)</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={handleCourseSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un cours" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCourses.map((course) => (
                      <SelectItem key={course.course_id} value={course.course_id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded flex-shrink-0"
                            style={{ backgroundColor: course.subject_color }}
                          />
                          <span>{course.subject_name} - {course.teacher_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {allCourses.length} cours disponible(s) pour cette classe
                </p>
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
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || loadingCourses || !formData.course_id}
            >
              {loading ? 'Création...' : 'Créer le template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}