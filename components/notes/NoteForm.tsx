"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { Note, EvaluationType } from "@/lib/notes/types"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface NoteFormProps {
  note?: Note
  onSubmit: (data: NoteFormData) => void
  onCancel: () => void
  isLoading?: boolean
  students?: Array<{ id: string; name: string }>
  subjects?: Array<{ id: string; name: string }>
  readOnly?: boolean
  showPermissionMessage?: string
}

export interface NoteFormData {
  studentId: string
  studentName: string
  subjectId: string
  subjectName: string
  value: number
  coefficient: number
  type: EvaluationType
  date: string
  comment?: string
}

export function NoteForm({
  note,
  onSubmit,
  onCancel,
  isLoading = false,
  students = [],
  subjects = [],
  readOnly = false,
  showPermissionMessage,
}: NoteFormProps) {
  const [formData, setFormData] = useState<NoteFormData>({
    studentId: note?.studentId || "",
    studentName: note?.studentName || "",
    subjectId: note?.subjectId || "",
    subjectName: note?.subjectName || "",
    value: note?.value || 0,
    coefficient: note?.coefficient || 1,
    type: note?.type || "Contrôle",
    date: note?.date || new Date().toISOString().split("T")[0],
    comment: note?.comment || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update form when note changes
  useEffect(() => {
    if (note) {
      setFormData({
        studentId: note.studentId,
        studentName: note.studentName,
        subjectId: note.subjectId,
        subjectName: note.subjectName,
        value: note.value,
        coefficient: note.coefficient,
        type: note.type,
        date: note.date,
        comment: note.comment || "",
      })
    }
  }, [note])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.studentId) {
      newErrors.studentId = "Veuillez sélectionner un élève"
    }
    if (!formData.subjectId) {
      newErrors.subjectId = "Veuillez sélectionner une matière"
    }
    if (formData.value < 0 || formData.value > 20) {
      newErrors.value = "La note doit être entre 0 et 20"
    }
    if (formData.coefficient < 1) {
      newErrors.coefficient = "Le coefficient doit être positif"
    }
    if (!formData.type) {
      newErrors.type = "Veuillez sélectionner un type d'évaluation"
    }
    if (!formData.date) {
      newErrors.date = "Veuillez sélectionner une date"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onSubmit(formData)
  }

  const handleStudentChange = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    setFormData({
      ...formData,
      studentId,
      studentName: student?.name || "",
    })
  }

  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId)
    setFormData({
      ...formData,
      subjectId,
      subjectName: subject?.name || "",
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Permission message */}
      {showPermissionMessage && (
        <div className="rounded-lg border border-orange-500 bg-orange-500/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-500">Modification restreinte</p>
              <p className="text-sm text-muted-foreground mt-1">{showPermissionMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Student selection */}
      <div>
        <label className="text-sm font-medium">
          Élève <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 disabled:opacity-50"
          value={formData.studentId}
          onChange={(e) => handleStudentChange(e.target.value)}
          disabled={readOnly || !!note}
        >
          <option value="">Sélectionner un élève</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
        {errors.studentId && <p className="text-sm text-red-500 mt-1">{errors.studentId}</p>}
      </div>

      {/* Subject selection */}
      <div>
        <label className="text-sm font-medium">
          Matière <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 disabled:opacity-50"
          value={formData.subjectId}
          onChange={(e) => handleSubjectChange(e.target.value)}
          disabled={readOnly || !!note}
        >
          <option value="">Sélectionner une matière</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        {errors.subjectId && <p className="text-sm text-red-500 mt-1">{errors.subjectId}</p>}
      </div>

      {/* Grade value */}
      <div>
        <label className="text-sm font-medium">
          Note (sur 20) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="0"
          max="20"
          step="0.5"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 disabled:opacity-50"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: Number.parseFloat(e.target.value) || 0 })}
          disabled={readOnly}
        />
        {errors.value && <p className="text-sm text-red-500 mt-1">{errors.value}</p>}
        <p className="text-xs text-muted-foreground mt-1">Valeur entre 0 et 20</p>
      </div>

      {/* Type and Coefficient */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 disabled:opacity-50"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as EvaluationType })}
            disabled={readOnly}
          >
            <option value="Contrôle">Contrôle</option>
            <option value="Devoir">Devoir</option>
            <option value="Participation">Participation</option>
            <option value="Examen">Examen</option>
          </select>
          {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">
            Coefficient <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="5"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 disabled:opacity-50"
            value={formData.coefficient}
            onChange={(e) => setFormData({ ...formData, coefficient: Number.parseInt(e.target.value) || 1 })}
            disabled={readOnly}
          />
          {errors.coefficient && <p className="text-sm text-red-500 mt-1">{errors.coefficient}</p>}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="text-sm font-medium">
          Date d'évaluation <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 disabled:opacity-50"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          disabled={readOnly}
        />
        {errors.date && <p className="text-sm text-red-500 mt-1">{errors.date}</p>}
      </div>

      {/* Comment */}
      <div>
        <label className="text-sm font-medium">Commentaire</label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 min-h-20 disabled:opacity-50"
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          placeholder="Commentaire optionnel..."
          disabled={readOnly}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={isLoading || readOnly}>
          {isLoading ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
