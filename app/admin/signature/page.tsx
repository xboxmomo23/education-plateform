"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AdminBackButton } from "@/components/admin/AdminBackButton"
import {
  Save,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileSignature,
  User,
} from "lucide-react"
import Link from "next/link"

export default function AdminSignaturePage() {
  const [directorName, setDirectorName] = useState("")
  const [directorSignature, setDirectorSignature] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Charger les données au montage
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `http://localhost:5000/api/establishment/director-signature`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )

      const data = await response.json()

      if (data.success && data.data) {
        setDirectorName(data.data.directorName || "")
        setDirectorSignature(data.data.directorSignature || null)
      }
    } catch (err) {
      console.error("Erreur chargement:", err)
      setError("Impossible de charger les données")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setError("Veuillez sélectionner une image (PNG, JPG)")
      return
    }

    // Vérifier la taille (max 500KB)
    if (file.size > 500 * 1024) {
      setError("L'image est trop grande (max 500 KB)")
      return
    }

    // Convertir en base64
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      setDirectorSignature(base64)
      setError(null)
    }
    reader.onerror = () => {
      setError("Erreur lors de la lecture du fichier")
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveSignature = () => {
    setDirectorSignature(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch(
        `http://localhost:5000/api/establishment/director-signature`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            directorName,
            directorSignature,
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        setSuccess("Signature du directeur mise à jour avec succès")
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || "Erreur lors de l'enregistrement")
      }
    } catch (err) {
      console.error("Erreur sauvegarde:", err)
      setError("Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  // ========================================
  // RENDU - CHARGEMENT
  // ========================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // ========================================
  // RENDU PRINCIPAL
  // ========================================

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* BOUTON RETOUR */}
        <AdminBackButton className="mb-6" />

        <div className="space-y-6">
          {/* HEADER */}
          <div className="border-b pb-6">
            <h1 className="text-4xl font-bold text-slate-900">
              Signature du directeur
            </h1>
            <p className="text-muted-foreground mt-2">
              Configurez la signature qui apparaîtra sur les bulletins
            </p>
          </div>

          {/* ALERTES */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* FORMULAIRE */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations du directeur
              </CardTitle>
              <CardDescription>
                Ces informations seront affichées sur tous les bulletins validés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nom du directeur */}
              <div className="space-y-2">
                <Label htmlFor="directorName">Nom et titre officiel</Label>
                <Input
                  id="directorName"
                  placeholder="Ex: M. Jean Dupont, Directeur"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ce nom apparaîtra sous la signature sur les bulletins
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Image de signature
              </CardTitle>
              <CardDescription>
                Uploadez une image de la signature du directeur (PNG ou JPG, max 500 KB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Aperçu de la signature */}
              {directorSignature ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <p className="text-sm text-muted-foreground mb-2">Aperçu :</p>
                    <div className="border-b pb-4">
                      <p className="text-sm font-medium mb-2">Le Chef d'Établissement</p>
                      <img
                        src={directorSignature}
                        alt="Signature du directeur"
                        className="max-h-20 object-contain"
                      />
                      {directorName && (
                        <p className="text-sm mt-2">{directorName}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRemoveSignature}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer la signature
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune signature configurée
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choisir une image
                  </Button>
                </div>
              )}

              {/* Input file caché */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Bouton changer si signature existe */}
              {directorSignature && (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Changer l'image
                </Button>
              )}
            </CardContent>
          </Card>

          {/* INFO BOX */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Comment ça fonctionne ?</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Scannez la signature manuscrite du directeur</li>
                    <li>Ou utilisez une signature créée sur tablette</li>
                    <li>L'image sera automatiquement ajoutée aux bulletins validés par le staff</li>
                    <li>Formats acceptés : PNG, JPG (fond transparent recommandé)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BOUTON SAUVEGARDER */}
          <div className="flex justify-end gap-4">
            <Link href="/admin">
              <Button variant="outline">Annuler</Button>
            </Link>
            <Button onClick={handleSave} disabled={isSaving} size="lg">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
