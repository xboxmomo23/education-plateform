"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, FileText, Link as LinkIcon, Award } from "lucide-react"
import { assignmentsApi, CreateAssignmentData } from "@/lib/api/assignments"
import { timetableApi } from "@/lib/api/timetable"

interface Course {
  course_id: string;
  subject_name: string;
  subject_code: string;
  subject_color: string;
  teacher_name: string;
  class_id: string;
  class_label?: string;
}

interface CreateAssignmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedCourseId?: string;
}

export function CreateAssignmentModal({ onClose, onSuccess, preselectedCourseId }: CreateAssignmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateAssignmentData>({
    course_id: preselectedCourseId || '',
    title: '',
    description: '',
    due_at: '',
    status: 'draft',
    resource_url: '',
    max_points: undefined,
  })

  // Charger les cours au montage
  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setLoadingCourses(true)
      // Récupérer les classes gérées par le staff/enseignant
      const classesResponse = await timetableApi.getStaffClasses()
      
      if (classesResponse.success && Array.isArray(classesResponse.data)) {
        // Pour chaque classe, récupérer les cours
        const allCourses: Course[] = []
        
        for (const cls of classesResponse.data) {
          try {
            const coursesResponse = await timetableApi.getAvailableCourses(cls.id)
            if (coursesResponse.success && Array.isArray(coursesResponse.data)) {
              // Ajouter le label de classe aux cours
              const coursesWithClass = coursesResponse.data.map((c: any) => ({
                ...c,
                class_label: cls.label,
              }))
              allCourses.push(...coursesWithClass)
            }
          } catch (err) {
            console.warn(`Erreur chargement cours pour classe ${cls.id}:`, err)
          }
        }
        
        setCourses(allCourses)
      }
    } catch (error) {
      console.error('❌ Erreur chargement cours:', error)
      setError('Impossible de charger les cours')
    } finally {
      setLoadingCourses(false)
    }
  }

  const handleSubmit = async (publishImmediately: boolean = false) => {
    setError(null)

    // Validation
    if (!formData.course_id) {
      setError('Veuillez sélectionner un cours')
      return
    }
    if (!formData.title.trim()) {
      setError('Le titre est obligatoire')
      return
    }
    if (!formData.due_at) {
      setError('La date limite est obligatoire')
      return
    }

    try {
      setLoading(true)

      const dataToSend: CreateAssignmentData = {
        ...formData,
        status: publishImmediately ? 'published' : 'draft',
        // Nettoyer les champs vides
        resource_url: formData.resource_url?.trim() || undefined,
        max_points: formData.max_points || undefined,
        description: formData.description?.trim() || undefined,
      }

      const response = await assignmentsApi.createAssignment(dataToSend)

      if (response.success) {
        onSuccess()
      } else {
        setError('Erreur lors de la création du devoir')
      }
    } catch (err: any) {
      console.error('❌ Erreur création devoir:', err)
      setError(err.message || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  // Obtenir la date/heure minimale (maintenant)
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Créer un devoir
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loadingCourses ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des cours...
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">Aucun cours disponible</p>
              <p className="text-sm text-muted-foreground mt-2">
                Vous devez avoir des cours assignés pour créer des devoirs
              </p>
            </div>
          ) : (
            <>
              {/* Sélection du cours */}
              <div className="space-y-2">
                <Label>Cours (Matière + Classe) *</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un cours" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.course_id} value={course.course_id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded flex-shrink-0"
                            style={{ backgroundColor: course.subject_color || '#666' }}
                          />
                          <span>
                            {course.subject_name} - {course.class_label || 'Classe'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Titre */}
              <div className="space-y-2">
                <Label>Titre du devoir *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Exercices chapitre 3"
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description / Consignes</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Instructions détaillées pour les élèves..."
                  rows={4}
                  maxLength={5000}
                />
              </div>

              {/* Date limite */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date limite *
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.due_at}
                  onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                  min={getMinDateTime()}
                />
              </div>

              {/* URL de ressource */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Lien vers une ressource (optionnel)
                </Label>
                <Input
                  type="url"
                  value={formData.resource_url || ''}
                  onChange={(e) => setFormData({ ...formData, resource_url: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Lien vers un document, une vidéo, ou toute autre ressource
                </p>
              </div>

              {/* Points maximum */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Points maximum (optionnel)
                </Label>
                <Input
                  type="number"
                  value={formData.max_points || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    max_points: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="Ex: 20"
                  min={0}
                  max={999.99}
                  step={0.5}
                />
                <p className="text-xs text-muted-foreground">
                  Barème de notation si applicable
                </p>
              </div>

              {/* Erreur */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  Annuler
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => handleSubmit(false)} 
                  disabled={loading}
                >
                  {loading ? 'Création...' : 'Enregistrer (brouillon)'}
                </Button>
                <Button 
                  onClick={() => handleSubmit(true)} 
                  disabled={loading}
                >
                  {loading ? 'Création...' : 'Enregistrer & publier'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
