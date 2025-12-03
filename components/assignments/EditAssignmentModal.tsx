"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, FileText, Link as LinkIcon, Award, AlertCircle } from "lucide-react"
import { assignmentsApi, Assignment, UpdateAssignmentData, AssignmentStatus, TeacherCourse } from "@/lib/api/assignments"

interface EditAssignmentModalProps {
  assignment: Assignment;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditAssignmentModal({ assignment, onClose, onSuccess }: EditAssignmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [courses, setCourses] = useState<TeacherCourse[]>([])
  const [error, setError] = useState<string | null>(null)

  // Formater la date pour l'input datetime-local
  const formatDateForInput = (dateString: string): string => {
    const date = new Date(dateString)
    const offset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - offset * 60 * 1000)
    return localDate.toISOString().slice(0, 16)
  }

  const [formData, setFormData] = useState({
    course_id: assignment.course_id,
    title: assignment.title,
    description: assignment.description || '',
    due_at: formatDateForInput(assignment.due_at),
    status: assignment.status as AssignmentStatus,
    resource_url: assignment.resource_url || '',
    max_points: assignment.max_points || undefined,
  })

  // Charger les cours au montage
  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setLoadingCourses(true)
      // Récupérer les cours du professeur via la nouvelle API
      const response = await assignmentsApi.getTeacherCourses()
      
      if (response.success && Array.isArray(response.data)) {
        setCourses(response.data)
      }
    } catch (error) {
      console.error('❌ Erreur chargement cours:', error)
    } finally {
      setLoadingCourses(false)
    }
  }

  const handleSubmit = async () => {
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

      const dataToSend: UpdateAssignmentData = {
        title: formData.title,
        description: formData.description?.trim() || null,
        due_at: formData.due_at,
        status: formData.status,
        resource_url: formData.resource_url?.trim() || null,
        max_points: formData.max_points || null,
      }

      // Ajouter course_id seulement s'il a changé
      if (formData.course_id !== assignment.course_id) {
        dataToSend.course_id = formData.course_id
      }

      const response = await assignmentsApi.updateAssignment(assignment.id, dataToSend)

      if (response.success) {
        onSuccess()
      } else {
        setError('Erreur lors de la modification')
      }
    } catch (err: any) {
      console.error('❌ Erreur modification devoir:', err)
      setError(err.message || 'Erreur lors de la modification')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await assignmentsApi.publishAssignment(assignment.id)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la publication')
      setLoading(false)
    }
  }

  const handleUnpublish = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await assignmentsApi.unpublishAssignment(assignment.id)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erreur lors du retrait')
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm('Êtes-vous sûr de vouloir archiver ce devoir ?')) return

    try {
      setLoading(true)
      setError(null)
      
      await assignmentsApi.deleteAssignment(assignment.id)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'archivage')
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
            Modifier le devoir
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations sur le statut actuel */}
          <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Statut actuel :</span>
              <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                assignment.status === 'published' 
                  ? 'bg-green-100 text-green-700' 
                  : assignment.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {assignment.status === 'published' ? 'Publié' : 
                 assignment.status === 'draft' ? 'Brouillon' : 'Archivé'}
              </span>
            </div>
            <div className="flex gap-2">
              {assignment.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={handlePublish} disabled={loading}>
                  Publier
                </Button>
              )}
              {assignment.status === 'published' && (
                <Button size="sm" variant="outline" onClick={handleUnpublish} disabled={loading}>
                  Repasser en brouillon
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={handleArchive} disabled={loading}>
                Archiver
              </Button>
            </div>
          </div>

          {/* Sélection du cours */}
          <div className="space-y-2">
            <Label>Cours (Matière + Classe) *</Label>
            {loadingCourses ? (
              <div className="text-sm text-muted-foreground">Chargement...</div>
            ) : (
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
            )}
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
              value={formData.description}
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
              value={formData.resource_url}
              onChange={(e) => setFormData({ ...formData, resource_url: e.target.value })}
              placeholder="https://..."
            />
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
          </div>

          {/* Statut (modifiable) */}
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as AssignmentStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Avertissement si publié */}
          {assignment.status === 'published' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Attention :</strong> Ce devoir est déjà publié. 
                Les élèves peuvent le voir. Toute modification sera visible immédiatement.
              </div>
            </div>
          )}

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
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}