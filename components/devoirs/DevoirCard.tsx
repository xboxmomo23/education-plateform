"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, BookOpen, Edit, Trash2, Copy, Eye } from "lucide-react"
import type { Devoir } from "@/lib/devoirs/types"

interface DevoirCardProps {
  devoir: Devoir
  variant?: "teacher" | "student"
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
  onPublish?: (id: string) => void
}

// Fonction pour calculer les jours restants
function getDaysRemaining(dueDate: string): number {
  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Fonction pour formater la date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Fonction pour obtenir la couleur du badge de priorité
function getPriorityColor(priority?: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high":
      return "bg-red-500/10 text-red-500 hover:bg-red-500/20"
    case "medium":
      return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
    case "low":
      return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
    default:
      return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
  }
}

// Fonction pour obtenir le label de priorité
function getPriorityLabel(priority?: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high":
      return "Urgent"
    case "medium":
      return "Moyen"
    case "low":
      return "Normal"
    default:
      return "Normal"
  }
}

export function DevoirCard({ devoir, variant = "student", onEdit, onDelete, onDuplicate, onPublish }: DevoirCardProps) {
  const daysRemaining = getDaysRemaining(devoir.dueDate)
  const isOverdue = daysRemaining < 0
  const isDueSoon = daysRemaining <= 2 && daysRemaining >= 0
  const canEdit = variant === "teacher" && !isOverdue

  return (
    <Card className={isOverdue && variant === "student" ? "border-red-500" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary" className="font-normal">
                {devoir.courseName}
              </Badge>
              {devoir.priority && (
                <Badge className={getPriorityColor(devoir.priority)}>{getPriorityLabel(devoir.priority)}</Badge>
              )}
              {devoir.status === "draft" && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                  Brouillon
                </Badge>
              )}
              {isDueSoon && variant === "student" && (
                <Badge className="bg-orange-500/10 text-orange-500">À rendre bientôt</Badge>
              )}
              {isOverdue && variant === "student" && <Badge className="bg-red-500/10 text-red-500">En retard</Badge>}
              {variant === "teacher" && (
                <Badge variant="outline" className="text-xs">
                  {devoir.classNames.join(", ")}
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl">{devoir.title}</CardTitle>
            <CardDescription className="mt-2">{devoir.description}</CardDescription>
            {devoir.resourceUrl && (
              <a
                href={devoir.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Ressource externe →
              </a>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>À rendre le {formatDate(devoir.dueDate)}</span>
            <span className="ml-2">
              {isOverdue
                ? `(${Math.abs(daysRemaining)} jour${Math.abs(daysRemaining) > 1 ? "s" : ""} de retard)`
                : daysRemaining === 0
                  ? "(Aujourd'hui)"
                  : daysRemaining === 1
                    ? "(Demain)"
                    : `(Dans ${daysRemaining} jours)`}
            </span>
          </div>
          {variant === "teacher" && (
            <div className="flex gap-2">
              {devoir.status === "draft" && onPublish && (
                <Button size="sm" onClick={() => onPublish(devoir.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Publier
                </Button>
              )}
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(devoir.id)}
                  disabled={!canEdit}
                  title={!canEdit ? "Impossible de modifier après la date de remise" : ""}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDuplicate && (
                <Button size="sm" variant="outline" onClick={() => onDuplicate(devoir.id)}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(devoir.id)}
                  disabled={!canEdit}
                  title={!canEdit ? "Impossible de supprimer après la date de remise" : ""}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
