"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/ui/list-skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  FileText,
} from "lucide-react"
import {
  assignmentsApi,
  type Assignment,
  isAssignmentOverdue,
  isAssignmentDueToday,
  isAssignmentDueThisWeek,
  isAssignmentDueThisMonth,
  formatDueDateShort,
} from "@/lib/api/assignments"
import { useParentChild } from "@/components/parent/ParentChildContext"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"

type FilterPeriod = "all" | "week" | "month"

export default function ParentAssignmentsPage() {
  const { selectedChild } = useParentChild()
  const { settings } = useEstablishmentSettings()
  const child = selectedChild ?? null
  const studentId = child?.id

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>("all")
  const [subjectFilter, setSubjectFilter] = useState<string>("all")

  useEffect(() => {
    if (studentId) {
      loadAssignments(studentId)
    } else {
      setLoading(false)
    }
  }, [studentId])

  const loadAssignments = async (targetStudentId: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await assignmentsApi.getAssignmentsForStudent(targetStudentId)
      if (response.success) {
        setAssignments(response.data)
      } else {
        setError("Erreur lors du chargement des devoirs")
      }
    } catch (err: any) {
      console.error("Erreur chargement devoirs parent:", err)
      setError(err.message || "Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const subjects = useMemo(() => {
    const uniqueSubjects = new Map<string, { name: string; color: string }>()
    assignments.forEach((a) => {
      if (a.subject_name && !uniqueSubjects.has(a.subject_name)) {
        uniqueSubjects.set(a.subject_name, {
          name: a.subject_name,
          color: a.subject_color || "#666",
        })
      }
    })
    return Array.from(uniqueSubjects.values())
  }, [assignments])

  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments]

    if (subjectFilter && subjectFilter !== "all") {
      filtered = filtered.filter((a) => a.subject_name === subjectFilter)
    }

    if (periodFilter === "week") {
      filtered = filtered.filter((a) => isAssignmentDueThisWeek(a) || isAssignmentOverdue(a))
    } else if (periodFilter === "month") {
      filtered = filtered.filter((a) => isAssignmentDueThisMonth(a) || isAssignmentOverdue(a))
    }

    return filtered
  }, [assignments, subjectFilter, periodFilter])

  const overdueAssignments = filteredAssignments.filter(isAssignmentOverdue)
  const todayAssignments = filteredAssignments.filter(
    (a) => !isAssignmentOverdue(a) && isAssignmentDueToday(a)
  )
  const upcomingAssignments = filteredAssignments.filter(
    (a) => !isAssignmentOverdue(a) && !isAssignmentDueToday(a)
  )

  const classLabel =
    assignments[0]?.class_label || child?.class_name || child?.student_number || "Classe de l'élève"

  if (!child || !studentId) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <h1 className="mb-2 text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Devoirs
        </h1>
        <p className="text-muted-foreground">
          Aucun enfant n’est associé à ce compte.
          {settings?.contactEmail
            ? ` Contactez ${settings.contactEmail} pour lier votre compte parent à un élève.`
            : " Contactez l’établissement pour lier votre compte parent à un élève."}
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Devoirs de {child.full_name}
        </h1>
        <p className="text-muted-foreground mt-1">{classLabel} — Année scolaire 2024-2025</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filtrer :</span>
            </div>

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
                        className="h-3 w-3 rounded flex-shrink-0"
                        style={{ backgroundColor: subject.color }}
                      />
                      {subject.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredAssignments.length} devoir{filteredAssignments.length > 1 ? "s" : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <ListSkeleton rows={6} className="py-6" />
      ) : error ? (
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={() => loadAssignments(studentId!)} className="mt-4">
            Réessayer
          </Button>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Aucun devoir à afficher"
          description={
            periodFilter !== "all" || subjectFilter !== "all"
              ? "Essayez de modifier les filtres pour voir plus de devoirs."
              : "Votre enfant est à jour !"
          }
          action={
            periodFilter !== "all" || subjectFilter !== "all" ? (
              <Button variant="outline" onClick={() => {
                setPeriodFilter("all")
                setSubjectFilter("all")
              }}>
                Réinitialiser les filtres
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {overdueAssignments.length > 0 && (
            <AssignmentSection
              title="En retard"
              icon={<AlertCircle className="h-5 w-5 text-red-600" />}
              assignments={overdueAssignments}
              variant="overdue"
            />
          )}

          {todayAssignments.length > 0 && (
            <AssignmentSection
              title="Aujourd'hui"
              icon={<Clock className="h-5 w-5 text-orange-600" />}
              assignments={todayAssignments}
              variant="today"
            />
          )}

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

interface AssignmentSectionProps {
  title: string
  icon: React.ReactNode
  assignments: Assignment[]
  variant: "overdue" | "today" | "upcoming"
}

function AssignmentSection({ title, icon, assignments, variant }: AssignmentSectionProps) {
  const borderColor = {
    overdue: "border-red-200",
    today: "border-orange-200",
    upcoming: "border-blue-200",
  }[variant]

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
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

interface StudentAssignmentCardProps {
  assignment: Assignment
  borderColor: string
}

function StudentAssignmentCard({ assignment, borderColor }: StudentAssignmentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isOverdue = isAssignmentOverdue(assignment)

  return (
    <Card className={`${borderColor} transition-all hover:shadow-md ${isOverdue ? "bg-red-50/50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className="min-h-[60px] w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: assignment.subject_color || "#666" }}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <span className="text-sm font-medium text-gray-600">{assignment.subject_name}</span>
                <h3 className="text-lg font-semibold">{assignment.title}</h3>
              </div>
              {assignment.max_points && (
                <Badge variant="outline" className="flex-shrink-0">
                  <Award className="mr-1 h-3 w-3" />
                  {assignment.max_points} pts
                </Badge>
              )}
            </div>

            <div
              className={`mb-2 flex items-center gap-2 text-sm ${
                isOverdue ? "text-red-600 font-medium" : "text-gray-600"
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>
                {isOverdue ? "Était à rendre le " : "À rendre pour le "}
                {formatDueDateShort(assignment.due_at)}
              </span>
            </div>

            {assignment.description && (
              <div className="mt-3">
                <p className={`text-sm text-gray-700 ${expanded ? "" : "line-clamp-2"}`}>
                  {assignment.description}
                </p>
                {assignment.description.length > 150 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1 text-sm text-blue-600 hover:underline"
                  >
                    {expanded ? "Voir moins" : "Voir plus"}
                  </button>
                )}
              </div>
            )}

            {assignment.resource_url && (
              <a
                href={assignment.resource_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-600 hover:underline"
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
