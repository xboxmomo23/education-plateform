"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X, Save, AlertCircle } from "lucide-react"
import { api } from "@/lib/api/client"

interface EditGradeModalProps {
  gradeId: string
  onClose: () => void
  onSuccess: () => void
}

export function EditGradeModal({ gradeId, onClose, onSuccess }: EditGradeModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>("")
  
  // Form data
  const [gradeData, setGradeData] = useState({
    value: "",
    absent: false,
    comment: "",
    max_scale: 20,
    student_name: "",
    subject_name: "",
    evaluation_title: "",
    coefficient: 1
  })

  useEffect(() => {
    loadGrade()
  }, [gradeId])

  const loadGrade = async () => {
    try {
      setLoading(true)
      setError("")
      
      const response = await api.get(`/grades/${gradeId}`)
      
      if (response.success && response.data) {
        setGradeData({
          value: response.data.value?.toString() || "",
          absent: response.data.absent || false,
          comment: response.data.comment || "",
          max_scale: response.data.max_scale || 20,
          student_name: response.data.student_name || "",
          subject_name: response.data.subject_name || "",
          evaluation_title: response.data.evaluation_title || "",
          coefficient: response.data.coefficient || 1
        })
      } else {
        setError("Impossible de charger la note")
      }
    } catch (err) {
      console.error("Erreur chargement note:", err)
      setError("Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError("")
      
      const updates: any = {
        absent: gradeData.absent,
        comment: gradeData.comment || null
      }
      
      // Si non absent, envoyer la valeur
      if (!gradeData.absent) {
        const numValue = parseFloat(gradeData.value)
        if (isNaN(numValue) || numValue < 0 || numValue > gradeData.max_scale) {
          setError(`La note doit être entre 0 et ${gradeData.max_scale}`)
          setSaving(false)
          return
        }
        updates.value = numValue
      } else {
        updates.value = null
      }
      
      const response = await api.put(`/grades/${gradeId}`, updates)
      
      if (response.success) {
        alert("Note modifiée avec succès !")
        onSuccess()
        onClose()
      } else {
        setError(response.error || "Erreur lors de la modification")
      }
    } catch (err) {
      console.error("Erreur modification note:", err)
      setError("Erreur lors de la modification")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Modifier la note</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {gradeData.student_name} - {gradeData.subject_name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {gradeData.evaluation_title}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500 bg-red-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Checkbox Absent / Non noté */}
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-slate-50">
              <input
                type="checkbox"
                id="absent"
                checked={gradeData.absent}
                onChange={(e) => setGradeData({ ...gradeData, absent: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="absent" className="cursor-pointer">
                <span className="font-medium">Marquer comme non noté (absent justifié)</span>
                <p className="text-xs text-muted-foreground mt-1">
                  La note ne comptera pas dans la moyenne
                </p>
              </Label>
            </div>

            {/* Note */}
            {!gradeData.absent && (
              <div>
                <Label htmlFor="value">
                  Note (sur {gradeData.max_scale}) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  max={gradeData.max_scale}
                  step="0.5"
                  value={gradeData.value}
                  onChange={(e) => setGradeData({ ...gradeData, value: e.target.value })}
                  placeholder={`Entre 0 et ${gradeData.max_scale}`}
                  className="mt-1"
                  required={!gradeData.absent}
                />
              </div>
            )}

            {/* Commentaire */}
            <div>
              <Label htmlFor="comment">Commentaire</Label>
              <textarea
                id="comment"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 min-h-[80px]"
                value={gradeData.comment}
                onChange={(e) => setGradeData({ ...gradeData, comment: e.target.value })}
                placeholder="Commentaire sur la note..."
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {gradeData.comment.length}/500 caractères
              </p>
            </div>

            {/* Infos lecture seule */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Coefficient</p>
                <Badge variant="outline" className="mt-1">
                  {gradeData.coefficient}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Barème</p>
                <Badge variant="outline" className="mt-1">
                  /{gradeData.max_scale}
                </Badge>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={saving || (!gradeData.absent && !gradeData.value)}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={saving}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}