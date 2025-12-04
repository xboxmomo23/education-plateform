"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  AlertCircle, 
  Calendar,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle,
  GraduationCap,
  BookOpen
} from "lucide-react"
import { termsApi, type Term } from "@/lib/api/term"
import { getUserSession } from "@/lib/auth"
import { TermModal } from "@/components/admin/TermModal"
import { TermPresetModal } from "@/components/admin/TermPresetModal"

// ============================================
// COMPOSANT PAGE
// ============================================

export default function AdminTermsPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [editingTerm, setEditingTerm] = useState<Term | null>(null)
  const [deletingTermId, setDeletingTermId] = useState<string | null>(null)

  const user = getUserSession()

  useEffect(() => {
    loadTerms()
  }, [selectedYear])

  const loadTerms = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await termsApi.getTerms(selectedYear)

      if (response.success && response.data) {
        setTerms(response.data)
      } else {
        setError(response.error || "Erreur lors du chargement")
      }
    } catch (err) {
      console.error("Error loading terms:", err)
      setError("Impossible de charger les périodes")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetCurrent = async (termId: string) => {
    try {
      const response = await termsApi.updateTerm(termId, { isCurrent: true })
      
      if (response.success) {
        loadTerms()
      } else {
        alert(response.error || "Erreur lors de la mise à jour")
      }
    } catch (err) {
      console.error("Error setting current term:", err)
      alert("Erreur lors de la mise à jour")
    }
  }

  const handleDelete = async (termId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette période ? Les évaluations liées ne seront plus associées à aucune période.")) {
      return
    }

    try {
      setDeletingTermId(termId)
      const response = await termsApi.deleteTerm(termId)

      if (response.success) {
        loadTerms()
      } else {
        alert(response.error || "Erreur lors de la suppression")
      }
    } catch (err) {
      console.error("Error deleting term:", err)
      alert("Erreur lors de la suppression")
    } finally {
      setDeletingTermId(null)
    }
  }

  const handleTermSaved = () => {
    setShowCreateModal(false)
    setEditingTerm(null)
    loadTerms()
  }

  const handlePresetsCreated = () => {
    setShowPresetModal(false)
    loadTerms()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getTermStatus = (term: Term) => {
    const now = new Date()
    const start = new Date(term.startDate)
    const end = new Date(term.endDate)

    if (now < start) return { label: "À venir", color: "bg-blue-100 text-blue-700" }
    if (now > end) return { label: "Terminée", color: "bg-gray-100 text-gray-700" }
    return { label: "En cours", color: "bg-green-100 text-green-700" }
  }

  // Générer la liste des années disponibles
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading && terms.length === 0) {
    return (
      <DashboardLayout requiredRole="staff">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground font-medium">Chargement des périodes...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ============================================
  // MAIN CONTENT
  // ============================================
  return (
    <DashboardLayout requiredRole="staff">
      <div className="space-y-6 pb-8">
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div className="border-b pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Gestion des périodes</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Configurez les trimestres ou semestres de votre établissement.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={loadTerms} variant="outline" size="icon" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SÉLECTEUR D'ANNÉE + ACTIONS */}
        {/* ============================================ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Sélecteur d'année */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Année scolaire :</span>
            <div className="flex gap-1">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                >
                  {year}-{year + 1}
                </Button>
              ))}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPresetModal(true)}
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Créer depuis un modèle
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle période
            </Button>
          </div>
        </div>

        {/* ============================================ */}
        {/* ERROR STATE */}
        {/* ============================================ */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-600">{error}</p>
                <Button variant="outline" size="sm" onClick={loadTerms}>
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================ */}
        {/* LISTE DES PÉRIODES */}
        {/* ============================================ */}
        {terms.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Aucune période configurée
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Créez vos trimestres ou semestres pour l'année {selectedYear}-{selectedYear + 1}.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => setShowPresetModal(true)}>
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Utiliser un modèle
                  </Button>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer manuellement
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {terms.map((term) => {
              const status = getTermStatus(term)
              const isDeleting = deletingTermId === term.id

              return (
                <Card key={term.id} className={term.isCurrent ? "border-primary border-2" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      {/* Infos de la période */}
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{term.name}</h3>
                            {term.isCurrent && (
                              <Badge className="bg-primary text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Période courante
                              </Badge>
                            )}
                            <Badge className={status.color}>{status.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Du {formatDate(term.startDate)} au {formatDate(term.endDate)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!term.isCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetCurrent(term.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Définir comme courante
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTerm(term)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(term.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* ============================================ */}
        {/* INFO CARD */}
        {/* ============================================ */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Comment fonctionnent les périodes ?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Les évaluations sont automatiquement rattachées à la période correspondant à leur date.</li>
                  <li>La période "courante" est celle affichée par défaut aux élèves.</li>
                  <li>Les bulletins ne peuvent être téléchargés qu'une fois la période terminée.</li>
                  <li>Vous pouvez utiliser un système trimestriel (3 périodes) ou semestriel (2 périodes).</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}
      
      {/* Modal création/édition */}
      {(showCreateModal || editingTerm) && (
        <TermModal
          term={editingTerm}
          academicYear={selectedYear}
          onClose={() => {
            setShowCreateModal(false)
            setEditingTerm(null)
          }}
          onSaved={handleTermSaved}
        />
      )}

      {/* Modal modèles prédéfinis */}
      {showPresetModal && (
        <TermPresetModal
          academicYear={selectedYear}
          onClose={() => setShowPresetModal(false)}
          onCreated={handlePresetsCreated}
        />
      )}
    </DashboardLayout>
  )
}
