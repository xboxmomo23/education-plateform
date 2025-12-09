"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, X } from "lucide-react"
import { gradesApi } from "@/lib/api/grade"

interface CreateEvaluationModalProps {
  courseId: string
  termId: string
  onClose: () => void
  onSuccess: (evaluationId: string) => void
}

export function CreateEvaluationModal({ courseId, termId, onClose, onSuccess }: CreateEvaluationModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    type: "controle" as "controle" | "devoir" | "participation" | "examen",
    coefficient: "1",
    maxScale: "20",
    evalDate: new Date().toISOString().split("T")[0],
    description: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.evalDate) {
      setError("Le titre et la date sont obligatoires")
      return
    }

    if (!termId) {
      setError("Veuillez sélectionner une période valide avant de créer une évaluation")
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const response = await gradesApi.createEvaluation({
        courseId,
        termId,
        title: formData.title,
        type: formData.type,
        coefficient: parseFloat(formData.coefficient),
        maxScale: parseFloat(formData.maxScale),
        evalDate: formData.evalDate,
        description: formData.description || undefined,
      })

      if (response.success && response.data) {
        alert("Évaluation créée avec succès !")
        onSuccess(response.data.id)
        onClose()
      } else {
        setError(response.error || "Erreur lors de la création")
      }
    } catch (err) {
      console.error("Erreur création évaluation:", err)
      setError("Impossible de créer l'évaluation")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Créer une évaluation</CardTitle>
              <CardDescription>Ajoutez une nouvelle évaluation pour ce cours</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="title">Titre de l'évaluation *</Label>
              <Input
                id="title"
                placeholder="Ex: Contrôle chapitre 3"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type *</Label>
                <select
                  id="type"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="controle">Contrôle</option>
                  <option value="devoir">Devoir</option>
                  <option value="participation">Participation</option>
                  <option value="examen">Examen</option>
                </select>
              </div>

              <div>
                <Label htmlFor="evalDate">Date *</Label>
                <Input
                  id="evalDate"
                  type="date"
                  value={formData.evalDate}
                  onChange={(e) => setFormData({ ...formData, evalDate: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="coefficient">Coefficient *</Label>
                <Input
                  id="coefficient"
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={formData.coefficient}
                  onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="maxScale">Barème *</Label>
                <Input
                  id="maxScale"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxScale}
                  onChange={(e) => setFormData({ ...formData, maxScale: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 min-h-[80px]"
                placeholder="Description de l'évaluation..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={1000}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={isSaving}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {isSaving ? "Création..." : "Créer l'évaluation"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
