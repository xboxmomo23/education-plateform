"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Save, AlertCircle } from "lucide-react"
import type { Devoir, DevoirStatus } from "@/lib/devoirs/types"
import { MOCK_COURSES, MOCK_CLASSES } from "@/lib/devoirs/mockDevoirs"

interface DevoirFormModalProps {
  devoir?: Devoir | null
  authorEmail: string
  authorName: string
  onClose: () => void
  onSave: (data: Partial<Devoir>) => Promise<void>
}

export function DevoirFormModal({ devoir, authorEmail, authorName, onClose, onSave }: DevoirFormModalProps) {
  const [formData, setFormData] = useState({
    title: devoir?.title || "",
    description: devoir?.description || "",
    courseId: devoir?.courseId || "",
    classIds: devoir?.classIds || [],
    dueDate: devoir?.dueDate || new Date().toISOString().split("T")[0],
    status: (devoir?.status || "draft") as DevoirStatus,
    resourceUrl: devoir?.resourceUrl || "",
    priority: devoir?.priority || "medium",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Filter courses for this teacher
  const teacherCourses = MOCK_COURSES.filter((c) => c.teacherEmail === authorEmail)

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis"
    }

    if (!formData.courseId) {
      newErrors.courseId = "Veuillez sélectionner un cours"
    }

    if (formData.classIds.length === 0) {
      newErrors.classIds = "Veuillez sélectionner au moins une classe"
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "La date de remise est requise"
    } else if (formData.status === "published") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(formData.dueDate)
      if (dueDate < today) {
        newErrors.dueDate = "La date de remise doit être dans le futur pour un devoir publié"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setIsSaving(true)
    try {
      const course = MOCK_COURSES.find((c) => c.id === formData.courseId)
      const classes = MOCK_CLASSES.filter((c) => formData.classIds.includes(c.id))

      await onSave({
        ...formData,
        courseName: course?.name || "",
        classNames: classes.map((c) => c.name),
        authorEmail,
        authorName,
      })
      onClose()
    } catch (error) {
      console.error("[v0] Error saving devoir:", error)
      alert("Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleClass = (classId: string) => {
    setFormData((prev) => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter((id) => id !== classId)
        : [...prev.classIds, classId],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{devoir ? "Modifier le devoir" : "Créer un devoir"}</CardTitle>
              <CardDescription>
                {devoir ? "Modifier les informations du devoir" : "Créer un nouveau devoir pour vos élèves"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Titre */}
          <div>
            <label className="text-sm font-medium">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full rounded-md border ${errors.title ? "border-red-500" : "border-input"} bg-background px-3 py-2 text-sm mt-1`}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Exercices chapitre 5"
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez le devoir en détail..."
            />
          </div>

          {/* Cours */}
          <div>
            <label className="text-sm font-medium">
              Cours <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full rounded-md border ${errors.courseId ? "border-red-500" : "border-input"} bg-background px-3 py-2 text-sm mt-1`}
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
            >
              <option value="">Sélectionner un cours</option>
              {teacherCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            {errors.courseId && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.courseId}
              </p>
            )}
          </div>

          {/* Classes */}
          <div>
            <label className="text-sm font-medium">
              Classes <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {MOCK_CLASSES.map((classe) => (
                <Badge
                  key={classe.id}
                  variant={formData.classIds.includes(classe.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleClass(classe.id)}
                >
                  {classe.name}
                </Badge>
              ))}
            </div>
            {errors.classIds && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.classIds}
              </p>
            )}
          </div>

          {/* Date de remise */}
          <div>
            <label className="text-sm font-medium">
              Date de remise <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={`w-full rounded-md border ${errors.dueDate ? "border-red-500" : "border-input"} bg-background px-3 py-2 text-sm mt-1`}
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
            {errors.dueDate && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.dueDate}
              </p>
            )}
          </div>

          {/* Priorité */}
          <div>
            <label className="text-sm font-medium">Priorité</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            >
              <option value="low">Normal</option>
              <option value="medium">Moyen</option>
              <option value="high">Urgent</option>
            </select>
          </div>

          {/* URL de ressource */}
          <div>
            <label className="text-sm font-medium">Ressource externe (optionnel)</label>
            <input
              type="url"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              value={formData.resourceUrl}
              onChange={(e) => setFormData({ ...formData, resourceUrl: e.target.value })}
              placeholder="https://example.com/document.pdf"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lien vers un document, vidéo ou autre ressource en ligne
            </p>
          </div>

          {/* Statut */}
          <div>
            <label className="text-sm font-medium">Statut</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={formData.status === "draft"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as DevoirStatus })}
                />
                <span className="text-sm">Brouillon (non visible par les élèves)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={formData.status === "published"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as DevoirStatus })}
                />
                <span className="text-sm">Publié (visible par les élèves)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button className="flex-1" onClick={handleSubmit} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Enregistrement..." : devoir ? "Enregistrer" : "Créer"}
            </Button>
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose} disabled={isSaving}>
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
