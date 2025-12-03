"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Plus, 
  FileText, 
  Calendar, 
  Clock, 
  Edit2, 
  Eye,
  EyeOff,
  Archive,
  ExternalLink,
  Award,
  Filter,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import { 
  assignmentsApi, 
  Assignment, 
  TeacherAssignmentFilters,
  isAssignmentOverdue,
  formatDueDateShort,
  TeacherCourse,
  getStatusLabel
} from "@/lib/api/assignments"
//import { timetableApi } from "@/lib/api/timetable"
import { CreateAssignmentModal } from "@/components/assignments/CreateAssignmentModal"
import { EditAssignmentModal } from "@/components/assignments/EditAssignmentModal"

interface ClassInfo {
  id: string;
  label: string;
  code: string;
}

export default function TeacherAssignmentsPage() {
  // États
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [filters, setFilters] = useState<TeacherAssignmentFilters>({})
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)

  // Charger les classes au montage
  useEffect(() => {
    loadClasses()
  }, [])

  // Charger les devoirs quand les filtres changent
  useEffect(() => {
    loadAssignments()
  }, [filters])

  const loadClasses = async () => {
    try {
      const response = await assignmentsApi.getTeacherCourses()
      if (response.success && Array.isArray(response.data)) {
        const uniqueClasses = new Map<string, ClassInfo>()
        response.data.forEach((course: TeacherCourse) => {
          if (!uniqueClasses.has(course.class_id)) {
            uniqueClasses.set(course.class_id, {
              id: course.class_id,
              label: course.class_label,
              code: course.class_code
            })
          }
        })
        setClasses(Array.from(uniqueClasses.values()))
      }
    } catch (err) {
      console.error('Erreur chargement classes:', err)
    }
  }

  const loadAssignments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await assignmentsApi.getTeacherAssignments(filters)
      
      if (response.success) {
        setAssignments(response.data)
      } else {
        setError('Erreur lors du chargement des devoirs')
      }
    } catch (err: any) {
      console.error('Erreur chargement devoirs:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  // Appliquer les filtres
  const applyFilters = useCallback(() => {
    const newFilters: TeacherAssignmentFilters = {}
    
    if (selectedClassId && selectedClassId !== 'all') {
      newFilters.classId = selectedClassId
    }
    if (selectedStatus && selectedStatus !== 'all') {
      newFilters.status = selectedStatus as 'draft' | 'published'
    }
    if (fromDate) {
      newFilters.fromDueAt = fromDate
    }
    if (toDate) {
      newFilters.toDueAt = toDate
    }
    
    setFilters(newFilters)
  }, [selectedClassId, selectedStatus, fromDate, toDate])

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSelectedClassId('')
    setSelectedStatus('all')
    setFromDate('')
    setToDate('')
    setFilters({})
  }

  // Actions sur les devoirs
  const handlePublish = async (assignment: Assignment) => {
    try {
      await assignmentsApi.publishAssignment(assignment.id)
      loadAssignments()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la publication')
    }
  }

  const handleUnpublish = async (assignment: Assignment) => {
    try {
      await assignmentsApi.unpublishAssignment(assignment.id)
      loadAssignments()
    } catch (err: any) {
      alert(err.message || 'Erreur lors du retrait')
    }
  }

  const handleArchive = async (assignment: Assignment) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver ce devoir ?')) return

    try {
      await assignmentsApi.deleteAssignment(assignment.id)
      loadAssignments()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'archivage')
    }
  }

  // Grouper les devoirs par statut
  const draftAssignments = assignments.filter(a => a.status === 'draft')
  const publishedAssignments = assignments.filter(a => a.status === 'published')
  const overduePublished = publishedAssignments.filter(isAssignmentOverdue)
  const upcomingPublished = publishedAssignments.filter(a => !isAssignmentOverdue(a))

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Mes devoirs
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les devoirs et exercices pour vos classes
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau devoir
          </Button>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Classe */}
              <div>
                <label className="text-sm font-medium mb-1 block">Classe</label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Statut */}
              <div>
                <label className="text-sm font-medium mb-1 block">Statut</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="draft">Brouillons</SelectItem>
                    <SelectItem value="published">Publiés</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date début */}
              <div>
                <label className="text-sm font-medium mb-1 block">Du</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              {/* Date fin */}
              <div>
                <label className="text-sm font-medium mb-1 block">Au</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              {/* Actions filtres */}
              <div className="flex items-end gap-2">
                <Button onClick={applyFilters} className="flex-1">
                  Appliquer
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contenu principal */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Chargement des devoirs...
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={loadAssignments} className="mt-4">
              Réessayer
            </Button>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-muted-foreground">Aucun devoir trouvé</p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Créer mon premier devoir
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Brouillons */}
            {draftAssignments.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <EyeOff className="h-5 w-5 text-yellow-600" />
                  Brouillons ({draftAssignments.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {draftAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onEdit={() => setEditingAssignment(assignment)}
                      onPublish={() => handlePublish(assignment)}
                      onArchive={() => handleArchive(assignment)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Publiés - À venir */}
            {upcomingPublished.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  Publiés - À venir ({upcomingPublished.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingPublished.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onEdit={() => setEditingAssignment(assignment)}
                      onUnpublish={() => handleUnpublish(assignment)}
                      onArchive={() => handleArchive(assignment)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Publiés - En retard */}
            {overduePublished.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-600" />
                  Date limite passée ({overduePublished.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {overduePublished.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onEdit={() => setEditingAssignment(assignment)}
                      onUnpublish={() => handleUnpublish(assignment)}
                      onArchive={() => handleArchive(assignment)}
                      isOverdue
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showCreateModal && (
          <CreateAssignmentModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              loadAssignments()
            }}
          />
        )}

        {editingAssignment && (
          <EditAssignmentModal
            assignment={editingAssignment}
            onClose={() => setEditingAssignment(null)}
            onSuccess={() => {
              setEditingAssignment(null)
              loadAssignments()
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

// =========================
// Composant AssignmentCard
// =========================

interface AssignmentCardProps {
  assignment: Assignment;
  onEdit: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onArchive: () => void;
  isOverdue?: boolean;
}

function AssignmentCard({ 
  assignment, 
  onEdit, 
  onPublish, 
  onUnpublish, 
  onArchive,
  isOverdue 
}: AssignmentCardProps) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200' : ''}`}>
      <CardContent className="p-4">
        {/* En-tête avec badge matière */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded flex-shrink-0"
              style={{ backgroundColor: assignment.subject_color || '#666' }}
            />
            <span className="text-sm font-medium text-gray-700">
              {assignment.subject_name}
            </span>
          </div>
          <Badge variant={assignment.status === 'published' ? 'default' : 'secondary'}>
            {getStatusLabel(assignment.status)}
          </Badge>
        </div>

        {/* Titre */}
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {assignment.title}
        </h3>

        {/* Classe */}
        <p className="text-sm text-muted-foreground mb-2">
          {assignment.class_label}
        </p>

        {/* Date limite */}
        <div className={`flex items-center gap-2 text-sm mb-3 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
          <Calendar className="h-4 w-4" />
          <span>
            {isOverdue ? 'Était à rendre le ' : 'À rendre pour le '}
            {formatDueDateShort(assignment.due_at)}
          </span>
        </div>

        {/* Points max */}
        {assignment.max_points && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Award className="h-4 w-4" />
            <span>/ {assignment.max_points} pts</span>
          </div>
        )}

        {/* URL ressource */}
        {assignment.resource_url && (
          <a
            href={assignment.resource_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3"
          >
            <ExternalLink className="h-3 w-3" />
            Voir la ressource
          </a>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t">
          <Button size="sm" variant="outline" onClick={onEdit} className="flex-1">
            <Edit2 className="h-3 w-3 mr-1" />
            Modifier
          </Button>
          
          {onPublish && (
            <Button size="sm" variant="default" onClick={onPublish}>
              <Eye className="h-3 w-3 mr-1" />
              Publier
            </Button>
          )}
          
          {onUnpublish && (
            <Button size="sm" variant="secondary" onClick={onUnpublish}>
              <EyeOff className="h-3 w-3 mr-1" />
              Retirer
            </Button>
          )}
          
          <Button size="sm" variant="ghost" onClick={onArchive} className="text-red-600 hover:text-red-700">
            <Archive className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
