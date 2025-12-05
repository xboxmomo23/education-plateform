"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  Check,
  Loader2,
  Save,
} from "lucide-react"
import { termsApi, type Term } from "@/lib/api/term"
import { reportCardApi, type ClassReportCard } from "@/lib/api/reportCard"

// ============================================
// TYPES
// ============================================

interface ClassInfo {
  id: string
  label: string
  level: string
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function StaffBulletinsPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null)
  const [reportCards, setReportCards] = useState<ClassReportCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReportCards, setIsLoadingReportCards] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal appréciation
  const [showAppreciationModal, setShowAppreciationModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<ClassReportCard | null>(null)

  // Validation en cours
  const [validatingStudentId, setValidatingStudentId] = useState<string | null>(null)
  const [validatingAll, setValidatingAll] = useState(false)

  // Charger les classes et périodes au montage
  useEffect(() => {
    loadInitialData()
  }, [])

  // Charger les bulletins quand la classe ou période change
  useEffect(() => {
    if (selectedClassId && selectedTermId) {
      loadReportCards()
    }
  }, [selectedClassId, selectedTermId])

  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Charger les classes
      const classesResponse = await fetch(
        `http://localhost:5000/api/classes`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      )
      const classesData = await classesResponse.json()

      if (classesData.success && classesData.data) {
        setClasses(classesData.data.map((c: any) => ({
          id: c.id,
          label: c.label || c.name,
          level: c.level || '',
        })))

        if (classesData.data.length > 0) {
          setSelectedClassId(classesData.data[0].id)
        }
      }

      // Charger les périodes
      const termsResponse = await termsApi.getTerms()
      if (termsResponse.success && termsResponse.data) {
        setTerms(termsResponse.data)

        // Sélectionner la période courante
        const currentTerm = termsResponse.data.find((t) => t.isCurrent)
        if (currentTerm) {
          setSelectedTermId(currentTerm.id)
        } else if (termsResponse.data.length > 0) {
          setSelectedTermId(termsResponse.data[0].id)
        }
      }
    } catch (err) {
      console.error("Erreur chargement initial:", err)
      setError("Impossible de charger les données")
    } finally {
      setIsLoading(false)
    }
  }

  const loadReportCards = async () => {
    if (!selectedClassId || !selectedTermId) return

    try {
      setIsLoadingReportCards(true)
      setError(null)

      const response = await reportCardApi.getClassReportCards(selectedClassId, selectedTermId)

      if (response.success && response.data) {
        setReportCards(response.data)
      } else {
        setError(response.error || "Erreur lors du chargement des bulletins")
      }
    } catch (err) {
      console.error("Erreur chargement bulletins:", err)
      setError("Impossible de charger les bulletins")
    } finally {
      setIsLoadingReportCards(false)
    }
  }

  const handleValidateStudent = async (studentId: string) => {
    if (!selectedTermId) return

    try {
      setValidatingStudentId(studentId)

      const response = await reportCardApi.validate(studentId, selectedTermId)

      if (response.success) {
        // Recharger les bulletins
        await loadReportCards()
      } else {
        alert(response.error || "Erreur lors de la validation")
      }
    } catch (err) {
      console.error("Erreur validation:", err)
      alert("Erreur lors de la validation")
    } finally {
      setValidatingStudentId(null)
    }
  }

  const handleValidateAll = async () => {
    if (!selectedClassId || !selectedTermId) return

    if (!confirm("Voulez-vous valider tous les bulletins de cette classe ?")) {
      return
    }

    try {
      setValidatingAll(true)

      const response = await reportCardApi.validateClass(selectedClassId, selectedTermId)

      if (response.success) {
        alert(`${response.data?.validatedCount || 0} bulletins validés`)
        await loadReportCards()
      } else {
        alert(response.error || "Erreur lors de la validation")
      }
    } catch (err) {
      console.error("Erreur validation classe:", err)
      alert("Erreur lors de la validation")
    } finally {
      setValidatingAll(false)
    }
  }

  const handleOpenAppreciation = (student: ClassReportCard) => {
    setSelectedStudent(student)
    setShowAppreciationModal(true)
  }

  // Statistiques
  const totalStudents = reportCards.length
  const validatedCount = reportCards.filter((r) => r.validated_at).length
  const pendingCount = totalStudents - validatedCount

  // ========================================
  // RENDU - CHARGEMENT
  // ========================================

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="staff">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ========================================
  // RENDU PRINCIPAL
  // ========================================

  return (
    <DashboardLayout requiredRole="staff">
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Validation des bulletins
              </h1>
              <p className="text-muted-foreground mt-2">
                Gérer les appréciations et valider les bulletins
              </p>
            </div>
            <Button
              onClick={loadReportCards}
              variant="outline"
              size="sm"
              disabled={isLoadingReportCards}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingReportCards ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* SÉLECTEURS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sélectionner une classe et une période
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* Sélecteur de classe */}
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Classe</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedClassId || ""}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sélecteur de période */}
              <div className="sm:w-48">
                <label className="text-sm font-medium mb-2 block">Période</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedTermId || ""}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                >
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bouton valider tout */}
              <Button
                onClick={handleValidateAll}
                disabled={validatingAll || pendingCount === 0}
              >
                {validatingAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Valider tous
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* STATISTIQUES */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStudents}</p>
                  <p className="text-sm text-muted-foreground">Élèves</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{validatedCount}</p>
                  <p className="text-sm text-muted-foreground">Validés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-full">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ERREUR */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* LISTE DES ÉLÈVES */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Bulletins des élèves
            </CardTitle>
            <CardDescription>
              Cliquez sur un élève pour ajouter l'appréciation du conseil
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReportCards ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Chargement des bulletins...</p>
              </div>
            ) : reportCards.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucun élève trouvé pour cette classe
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reportCards.map((student) => (
                  <div
                    key={student.student_id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      student.validated_at
                        ? "bg-green-50 border-green-200"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    {/* Infos élève */}
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium">{student.student_name}</p>
                        {student.council_appreciation && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {student.council_appreciation}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Statut et actions */}
                    <div className="flex items-center gap-3">
                      {/* Badge statut */}
                      {student.validated_at ? (
                        <Badge className="bg-green-100 text-green-700">
                          <Check className="h-3 w-3 mr-1" />
                          Validé
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      )}

                      {/* Bouton appréciation */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAppreciation(student)}
                        disabled={!!student.validated_at}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Appréciation
                      </Button>

                      {/* Bouton valider */}
                      <Button
                        size="sm"
                        onClick={() => handleValidateStudent(student.student_id)}
                        disabled={!!student.validated_at || validatingStudentId === student.student_id}
                      >
                        {validatingStudentId === student.student_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Valider
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL APPRÉCIATION */}
      {showAppreciationModal && selectedStudent && selectedTermId && (
        <CouncilAppreciationModal
          studentId={selectedStudent.student_id}
          studentName={selectedStudent.student_name}
          termId={selectedTermId}
          currentAppreciation={selectedStudent.council_appreciation || ""}
          onClose={() => {
            setShowAppreciationModal(false)
            setSelectedStudent(null)
          }}
          onSaved={() => {
            setShowAppreciationModal(false)
            setSelectedStudent(null)
            loadReportCards()
          }}
        />
      )}
    </DashboardLayout>
  )
}

// ============================================
// MODAL APPRÉCIATION DU CONSEIL
// ============================================

interface CouncilAppreciationModalProps {
  studentId: string
  studentName: string
  termId: string
  currentAppreciation: string
  onClose: () => void
  onSaved: () => void
}

function CouncilAppreciationModal({
  studentId,
  studentName,
  termId,
  currentAppreciation,
  onClose,
  onSaved,
}: CouncilAppreciationModalProps) {
  const [appreciation, setAppreciation] = useState(currentAppreciation)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const response = await reportCardApi.setCouncilAppreciation(
        studentId,
        termId,
        appreciation
      )

      if (response.success) {
        onSaved()
      } else {
        alert(response.error || "Erreur lors de l'enregistrement")
      }
    } catch (err) {
      console.error("Erreur sauvegarde:", err)
      alert("Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Appréciation du conseil</h2>
          <p className="text-sm text-muted-foreground">{studentName}</p>
        </div>

        {/* Content */}
        <div className="p-4">
          <label className="text-sm font-medium mb-2 block">
            Appréciation
          </label>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            rows={5}
            placeholder="Saisir l'appréciation du conseil de classe..."
            value={appreciation}
            onChange={(e) => setAppreciation(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Cette appréciation apparaîtra sur le bulletin de l'élève.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-slate-50">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
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
  )
}