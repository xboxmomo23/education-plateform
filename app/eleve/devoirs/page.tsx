"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  FileText, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Award,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Filter,
  BookOpen
} from "lucide-react"
import { 
  assignmentsApi, 
  Assignment,
  isAssignmentOverdue,
  isAssignmentDueToday,
  isAssignmentDueThisWeek,
  isAssignmentDueThisMonth,
  formatDueDate,
  formatDueDateShort
} from "@/lib/api/assignments"

type FilterPeriod = 'all' | 'week' | 'month';

export default function StudentAssignmentsPage() {
  // États
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')

  // Charger les devoirs au montage
  useEffect(() => {
    loadAssignments()
  }, [])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await assignmentsApi.getStudentAssignments()
      
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

  // Extraire les matières uniques pour le filtre
  const subjects = useMemo(() => {
    const uniqueSubjects = new Map<string, { name: string; color: string }>()
    assignments.forEach(a => {
      if (a.subject_name && !uniqueSubjects.has(a.subject_name)) {
        uniqueSubjects.set(a.subject_name, {
          name: a.subject_name,
          color: a.subject_color || '#666'
        })
      }
    })
    return Array.from(uniqueSubjects.values())
  }, [assignments])

  // Filtrer les devoirs
  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments]

    // Filtre par matière
    if (subjectFilter && subjectFilter !== 'all') {
      filtered = filtered.filter(a => a.subject_name === subjectFilter)
    }

    // Filtre par période
    if (periodFilter === 'week') {
      filtered = filtered.filter(a => isAssignmentDueThisWeek(a) || isAssignmentOverdue(a))
    } else if (periodFilter === 'month') {
      filtered = filtered.filter(a => isAssignmentDueThisMonth(a) || isAssignmentOverdue(a))
    }

    return filtered
  }, [assignments, subjectFilter, periodFilter])

  // Grouper les devoirs par section
  const overdueAssignments = filteredAssignments.filter(isAssignmentOverdue)
  const todayAssignments = filteredAssignments.filter(a => !isAssignmentOverdue(a) && isAssignmentDueToday(a))
  const upcomingAssignments = filteredAssignments.filter(a => !isAssignmentOverdue(a) && !isAssignmentDueToday(a))

  // Informations sur la classe (depuis le premier devoir)
  const classLabel = assignments[0]?.class_label || 'Ma classe'

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Mes devoirs
        </h1>
        <p className="text-muted-foreground mt-1">
          {classLabel} — Année scolaire 2024-2025
        </p>
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filtrer :</span>
            </div>

            {/* Filtre période */}
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as FilterPeriod)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les devoirs</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre matière */}
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Matière" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les matières</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.name} value={subject.name}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded flex-shrink-0"
                        style={{ backgroundColor: subject.color }}
                      />
                      {subject.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Compteur */}
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredAssignments.length} devoir{filteredAssignments.length > 1 ? 's' : ''}
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
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <p className="text-muted-foreground">Aucun devoir à afficher</p>
          <p className="text-sm text-gray-400 mt-2">
            {periodFilter !== 'all' || subjectFilter !== 'all' 
              ? 'Essayez de modifier les filtres'
              : 'Vous êtes à jour !'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section : En retard */}
          {overdueAssignments.length > 0 && (
            <AssignmentSection
              title="En retard"
              icon={<AlertCircle className="h-5 w-5 text-red-600" />}
              assignments={overdueAssignments}
              variant="overdue"
            />
          )}

          {/* Section : Aujourd'hui */}
          {todayAssignments.length > 0 && (
            <AssignmentSection
              title="Aujourd'hui"
              icon={<Clock className="h-5 w-5 text-orange-600" />}
              assignments={todayAssignments}
              variant="today"
            />
          )}

          {/* Section : À venir */}
          {upcomingAssignments.length > 0 && (
            <AssignmentSection
              title="À venir"
              icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
              assignments={upcomingAssignments}
              variant="upcoming"
            />
          )}
        </div>
      )}
    </div>
  )
}

// =========================
// Composant AssignmentSection
// =========================

interface AssignmentSectionProps {
  title: string;
  icon: React.ReactNode;
  assignments: Assignment[];
  variant: 'overdue' | 'today' | 'upcoming';
}

function AssignmentSection({ title, icon, assignments, variant }: AssignmentSectionProps) {
  const borderColor = {
    overdue: 'border-red-200',
    today: 'border-orange-200',
    upcoming: 'border-blue-200'
  }[variant]

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        {icon}
        {title}
        <Badge variant="secondary" className="ml-2">
          {assignments.length}
        </Badge>
      </h2>
      <div className="space-y-3">
        {assignments.map((assignment) => (
          <StudentAssignmentCard
            key={assignment.id}
            assignment={assignment}
            borderColor={borderColor}
          />
        ))}
      </div>
    </div>
  )
}

// =========================
// Composant StudentAssignmentCard
// =========================

interface StudentAssignmentCardProps {
  assignment: Assignment;
  borderColor: string;
}

function StudentAssignmentCard({ assignment, borderColor }: StudentAssignmentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isOverdue = isAssignmentOverdue(assignment)

  return (
    <Card className={`${borderColor} transition-all hover:shadow-md ${isOverdue ? 'bg-red-50/50' : ''}`}>
      <CardContent className="p-4">
        {/* Ligne principale */}
        <div className="flex items-start gap-4">
          {/* Badge matière */}
          <div
            className="w-2 h-full min-h-[60px] rounded-full flex-shrink-0"
            style={{ backgroundColor: assignment.subject_color || '#666' }}
          />

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            {/* En-tête */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <span className="text-sm font-medium text-gray-600">
                  {assignment.subject_name}
                </span>
                <h3 className="font-semibold text-lg">
                  {assignment.title}
                </h3>
              </div>

              {/* Points */}
              {assignment.max_points && (
                <Badge variant="outline" className="flex-shrink-0">
                  <Award className="h-3 w-3 mr-1" />
                  {assignment.max_points} pts
                </Badge>
              )}
            </div>

            {/* Date limite */}
            <div className={`flex items-center gap-2 text-sm mb-2 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              <Calendar className="h-4 w-4" />
              <span>
                {isOverdue ? 'Était à rendre le ' : 'À rendre pour le '}
                {formatDueDateShort(assignment.due_at)}
              </span>
            </div>

            {/* Description (expandable) */}
            {assignment.description && (
              <div className="mt-3">
                <p className={`text-sm text-gray-700 ${expanded ? '' : 'line-clamp-2'}`}>
                  {assignment.description}
                </p>
                {assignment.description.length > 150 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-sm text-blue-600 hover:underline mt-1"
                  >
                    {expanded ? 'Voir moins' : 'Voir plus'}
                  </button>
                )}
              </div>
            )}

            {/* Lien ressource */}
            {assignment.resource_url && (
              <a
                href={assignment.resource_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-3 bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir la ressource
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
