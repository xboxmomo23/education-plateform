"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, 
  RefreshCw, 
  BookOpen, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  Award,
  Edit
} from "lucide-react"
import { api } from "@/lib/api/client"
import { EditGradeModal } from "@/components/notes/EditGradeModal"

// ============================================
// TYPES
// ============================================

/**
 * Informations d'un enfant
 */
interface Child {
  id: string
  name: string
  className: string
}

/**
 * Données d'une note (format API backend)
 */
interface GradeData {
  id: string
  evaluation_id: string
  evaluation_title: string
  evaluation_type: string
  subject_name: string
  subject_code: string
  normalized_value: number | null
  coefficient: number
  max_scale: number
  eval_date: string
  comment?: string
  class_name: string
  class_average?: number
  class_min?: number
  class_max?: number
  absent: boolean
  student_name: string
}

/**
 * Données groupées par enfant avec sa moyenne calculée
 */
interface ChildWithGrades {
  child: Child
  grades: GradeData[]
  moyenne: number
  totalNotes: number
  totalMatières: number
}

/**
 * Format de la réponse API /api/grades/children
 * Note: On laisse TypeScript inférer le type depuis api.get()
 * car ApiResponse<T> a data?: T (optionnel)
 */
/* interface ChildrenGradesResponse {
  success: boolean
  data: Array<{
    student: {
      id: string
      name: string
    }
    grades: GradeData[]
  }>
  error?: string
} */

// ============================================
// SOUS-COMPOSANTS
// ============================================

/**
 * Sélecteur d'enfant
 */
function ChildSelector({
  children,
  selectedId,
  onChange,
}: {
  children: Child[]
  selectedId: string
  onChange: (id: string) => void
}) {
  const selectedChild = children.find((c) => c.id === selectedId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5" />
          Sélectionner un enfant ({children.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <select
          className="w-full max-w-2xl rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
        >
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name} - {child.className}
            </option>
          ))}
        </select>

        {selectedChild && (
          <div className="mt-3 flex gap-2">
            <Badge variant="secondary">{selectedChild.name}</Badge>
            <Badge variant="outline">{selectedChild.className}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Card de résumé avec moyenne générale (Hero card)
 */
function GradesSummaryCard({
  childName,
  moyenne,
  totalNotes,
  totalMatières,
}: {
  childName: string
  moyenne: number
  totalNotes: number
  totalMatières: number
}) {
  // Déterminer la couleur selon la moyenne
  const getMoyenneColor = (avg: number) => {
    if (avg >= 16) return "text-green-600"
    if (avg >= 14) return "text-blue-600"
    if (avg >= 12) return "text-yellow-600"
    if (avg >= 10) return "text-orange-600"
    return "text-red-600"
  }

  const getBadgeVariant = (avg: number) => {
    if (avg >= 10) return "default"
    return "destructive"
  }

  return (
    <Card className="border-2 shadow-lg bg-gradient-to-br from-blue-50 to-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Moyenne Générale
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {childName}
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-4xl font-bold ${getMoyenneColor(moyenne)}`}>
                  {moyenne.toFixed(2)}
                </span>
                <span className="text-lg text-muted-foreground font-medium">
                  /20
                </span>
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <Badge 
              className="text-sm px-3 py-1" 
              variant={getBadgeVariant(moyenne)}
            >
              {totalNotes} note{totalNotes > 1 ? "s" : ""}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {totalMatières} matière{totalMatières > 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Card individuelle pour une note
 */
function GradeCard({ grade, onEdit }: { grade: GradeData; onEdit: (gradeId: string) => void }) {
  // Icône selon le type d'évaluation
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "controle":
        return "📝"
      case "devoir":
        return "📋"
      case "examen":
        return "📄"
      case "participation":
        return "🗣️"
      default:
        return "📌"
    }
  }

  // Badge selon le type
  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      controle: "bg-blue-100 text-blue-700",
      devoir: "bg-green-100 text-green-700",
      examen: "bg-red-100 text-red-700",
      participation: "bg-purple-100 text-purple-700",
    }
    return colors[type] || "bg-gray-100 text-gray-700"
  }

  // Couleur de la note
  const getNoteColor = (note: number) => {
    if (note >= 16) return "text-green-600"
    if (note >= 14) return "text-blue-600"
    if (note >= 12) return "text-yellow-600"
    if (note >= 10) return "text-orange-600"
    return "text-red-600"
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <Card className="border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Partie gauche - Infos évaluation */}
          <div className="flex-1 space-y-2">
            {/* Titre et type */}
            <div className="flex items-start gap-2">
              <span className="text-xl">{getTypeIcon(grade.evaluation_type)}</span>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 leading-tight">
                  {grade.evaluation_title}
                </h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm font-medium text-slate-700">
                    {grade.subject_name}
                  </span>
                  <Badge className={`text-xs ${getTypeBadgeColor(grade.evaluation_type)}`}>
                    {grade.evaluation_type}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Date et coefficient */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(grade.eval_date)}
              </div>
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                Coef. {grade.coefficient}
              </div>
            </div>

            {/* Commentaire */}
            {grade.comment && (
              <p className="text-sm italic text-slate-600 border-l-2 border-slate-300 pl-3 mt-2">
                {grade.comment}
              </p>
            )}

            {/* Statistiques de classe */}
            {(grade.class_average != null || grade.class_min != null || grade.class_max != null) && (
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                <span className="font-medium">Classe :</span>
                {grade.class_average != null && (
                  <span className="ml-2">
                    Moy. {Number(grade.class_average).toFixed(1)}
                  </span>
                )}
                {grade.class_min != null && (
                  <span className="ml-2">
                    Min. {Number(grade.class_min).toFixed(1)}
                  </span>
                )}
                {grade.class_max != null && (
                  <span className="ml-2">
                    Max. {Number(grade.class_max).toFixed(1)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Partie droite - Note */}
          <div className="text-right flex flex-col items-end gap-2">
            {grade.absent ? (
              <div className="text-center">
                <Badge variant="destructive" className="text-sm">
                  Absent
                </Badge>
              </div>
            ) : (
              <>
                <div className={`text-3xl font-bold ${getNoteColor(grade.normalized_value || 0)}`}>
                  {grade.normalized_value != null ? Number(grade.normalized_value).toFixed(1) : '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  /{grade.max_scale}
                </div>
              </>
            )}
            
            {/* Bouton Modifier */}
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onEdit(grade.id)}
              className="mt-2"
            >
              <Edit className="h-3 w-3 mr-1" />
              Modifier
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ResponsableNotesPage() {
  // ========================================
  // ÉTATS
  // ========================================
  const [childrenData, setChildrenData] = useState<ChildWithGrades[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null)

  // ========================================
  // FONCTIONS
  // ========================================

  /**
   * Calcule la moyenne pondérée par coefficient
   */
  const calculateMoyenne = (grades: GradeData[]): number => {
    // Filtrer les notes valides (non absentes, avec valeur)
    const validGrades = grades.filter(
      (g: GradeData) => !g.absent && g.normalized_value !== null && g.normalized_value !== undefined
    )

    if (validGrades.length === 0) return 0

    // Calcul pondéré par coefficient (convertir en nombres)
    const totalPoints = validGrades.reduce(
      (sum, g) => sum + (Number(g.normalized_value) || 0) * Number(g.coefficient),
      0
    )
    const totalCoef = validGrades.reduce((sum, g) => sum + Number(g.coefficient), 0)

    return totalCoef > 0 ? totalPoints / totalCoef : 0
  }

  /**
   * Compte le nombre de matières uniques
   */
  const countUniqueSubjects = (grades: GradeData[]): number => {
    const subjects = new Set(grades.map((g) => g.subject_name))
    return subjects.size
  }

  /**
   * Charge les données depuis l'API
   */
  const loadData = async () => {
    try {
      setLoading(true)
      setError("")

      console.log("🔍 [DEBUG] Chargement des notes des enfants...")

      // ✅ Appel API unique
      const response = await api.get("/grades/managed-students")

      console.log("📦 [DEBUG] Réponse API:", response)

      if (!response.success) {
        throw new Error(response.error || "Erreur lors du chargement")
      }

      if (!response.data || response.data.length === 0) {
        setError("Aucun enfant associé à votre compte")
        setChildrenData([])
        return
      }

      // ✅ Transformer les données
      const transformedData: ChildWithGrades[] = response.data.map((item: any) => {
        const grades = item.grades || []
        const className = grades[0]?.class_name || "Classe inconnue"

        return {
          child: {
            id: item.student.id,
            name: item.student.name,
            className: className,
          },
          grades: grades,
          moyenne: calculateMoyenne(grades),
          totalNotes: grades.filter((g: GradeData) => !g.absent).length,
          totalMatières: countUniqueSubjects(grades),
        }
      })

      console.log("✅ [DEBUG] Données transformées:", transformedData)

      setChildrenData(transformedData)

      // Sélectionner le premier enfant par défaut
      if (transformedData.length > 0 && !selectedChildId) {
        setSelectedChildId(transformedData[0].child.id)
      }
    } catch (err: any) {
      console.error("❌ [ERROR] Chargement des données:", err)
      setError(err.message || "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  /**
   * Récupère l'enfant sélectionné
   */
  const getSelectedChild = (): ChildWithGrades | undefined => {
    return childrenData.find((c) => c.child.id === selectedChildId)
  }

  // ========================================
  // EFFETS
  // ========================================

  // Charger les données au montage
  useEffect(() => {
    loadData()
  }, [])

  // ========================================
  // RENDU - CHARGEMENT
  // ========================================

  if (loading && childrenData.length === 0) {
    return (
      <DashboardLayout requiredRole="staff">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground font-medium">
              Chargement des notes...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ========================================
  // RENDU - ERREUR CRITIQUE
  // ========================================

  if (error && childrenData.length === 0) {
    return (
      <DashboardLayout requiredRole="staff">
        <Card className="max-w-md mx-auto mt-8 border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  Erreur de chargement
                </h3>
                <p className="text-sm text-red-700 mt-2">{error}</p>
              </div>
              <Button onClick={loadData} variant="destructive" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  // ========================================
  // RENDU - AUCUN ENFANT
  // ========================================

  if (childrenData.length === 0) {
    return (
      <DashboardLayout requiredRole="staff">
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun enfant associé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Contactez l'établissement pour associer vos enfants à votre compte.
            </p>
            <Button onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  // ========================================
  // RENDU - PAGE PRINCIPALE
  // ========================================

  const selectedChild = getSelectedChild()
  const allChildren: Child[] = childrenData.map((c) => c.child)

  return (
    <DashboardLayout requiredRole="staff">
      <div className="space-y-6 pb-8">
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Notes de mes enfants
              </h1>
              <p className="text-muted-foreground mt-2">
                Suivi des résultats scolaires
              </p>
            </div>
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Actualiser
            </Button>
          </div>
        </div>

        {/* ============================================ */}
        {/* SÉLECTEUR ENFANT */}
        {/* ============================================ */}
        <ChildSelector
          children={allChildren}
          selectedId={selectedChildId}
          onChange={setSelectedChildId}
        />

        {/* ============================================ */}
        {/* ERREUR NON BLOQUANTE */}
        {/* ============================================ */}
        {error && childrenData.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ============================================ */}
        {/* CONTENU POUR L'ENFANT SÉLECTIONNÉ */}
        {/* ============================================ */}
        {selectedChild ? (
          <>
            {/* Moyenne Générale */}
            {selectedChild.grades.length > 0 && (
              <GradesSummaryCard
                childName={selectedChild.child.name}
                moyenne={selectedChild.moyenne}
                totalNotes={selectedChild.totalNotes}
                totalMatières={selectedChild.totalMatières}
              />
            )}

            {/* Liste des notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Notes détaillées
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    • {selectedChild.child.name}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Chargement des notes...
                    </p>
                  </div>
                ) : selectedChild.grades.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Aucune note disponible pour {selectedChild.child.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedChild.grades.map((grade) => (
                      <GradeCard 
                        key={grade.id} 
                        grade={grade}
                        onEdit={(gradeId) => setEditingGradeId(gradeId)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Veuillez sélectionner un enfant pour voir ses notes.
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      {/* Modal de modification de note */}
      {editingGradeId && (
        <EditGradeModal
          gradeId={editingGradeId}
          onClose={() => setEditingGradeId(null)}
          onSuccess={() => {
            setEditingGradeId(null)
            loadData() // Recharger les données après modification
          }}
        />
      )}
    </DashboardLayout>
  )
}