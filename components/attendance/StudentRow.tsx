"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { User, MessageSquare, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CompactStatusSelector, StatusBadge } from "./AttendanceStatusSelector"
import type { AttendanceStatus, StudentForAttendance } from "@/lib/api/attendance"

interface StudentRowProps {
  student: StudentForAttendance
  index: number
  onStatusChange: (studentId: string, status: AttendanceStatus, options?: {
    comment?: string
    lateMinutes?: number
  }) => void
  disabled?: boolean
  isUpdating?: boolean
}

export function StudentRow({
  student,
  index,
  onStatusChange,
  disabled = false,
  isUpdating = false,
}: StudentRowProps) {
  const [showLateInput, setShowLateInput] = useState(false)
  const [lateMinutes, setLateMinutes] = useState(student.late_minutes?.toString() || '')
  const [comment, setComment] = useState(student.comment || '')
  const [showComment, setShowComment] = useState(false)

  const handleStatusChange = (status: AttendanceStatus) => {
    // Si on change vers "late", afficher l'input de minutes
    if (status === 'late') {
      setShowLateInput(true)
    } else {
      setShowLateInput(false)
      onStatusChange(student.user_id, status)
    }
  }

  const handleLateConfirm = () => {
    const minutes = parseInt(lateMinutes) || 0
    onStatusChange(student.user_id, 'late', { lateMinutes: minutes })
    setShowLateInput(false)
  }

  const handleCommentSave = () => {
    if (student.status) {
      onStatusChange(student.user_id, student.status, { comment })
    }
    setShowComment(false)
  }

  return (
    <tr className={cn(
      "border-b transition-colors",
      index % 2 === 0 ? "bg-white" : "bg-gray-50",
      isUpdating && "opacity-60",
      disabled && "pointer-events-none opacity-50"
    )}>
      {/* Numéro */}
      <td className="px-3 py-3 text-sm text-gray-500 w-12">
        {index + 1}
      </td>

      {/* Photo / Avatar */}
      <td className="px-3 py-3 w-12">
        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="h-4 w-4 text-gray-500" />
        </div>
      </td>

      {/* Nom et infos */}
      <td className="px-3 py-3">
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">
            {student.full_name}
          </span>
          {student.student_number && (
            <span className="text-xs text-gray-500">
              N° {student.student_number}
            </span>
          )}
        </div>
      </td>

      {/* Sélecteur de statut */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <CompactStatusSelector
            value={student.status}
            onChange={handleStatusChange}
            disabled={disabled || isUpdating}
          />
          
          {/* Input minutes de retard */}
          {showLateInput && (
            <Popover open={showLateInput} onOpenChange={setShowLateInput}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Retard
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3" align="start">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">
                    Minutes de retard
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={lateMinutes}
                    onChange={(e) => setLateMinutes(e.target.value)}
                    placeholder="15"
                    className="h-8"
                  />
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={handleLateConfirm}
                  >
                    Confirmer
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </td>

      {/* Statut actuel (badge) */}
      <td className="px-3 py-3 w-32">
        {student.status ? (
          <div className="flex flex-col gap-1">
            <StatusBadge status={student.status} size="sm" />
            {student.status === 'late' && student.late_minutes && (
              <span className="text-xs text-orange-600">
                +{student.late_minutes} min
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">Non défini</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-3 w-24">
        <Popover open={showComment} onOpenChange={setShowComment}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                student.comment && "text-blue-600"
              )}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Commentaire
              </label>
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="h-8 text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowComment(false)}
                >
                  Annuler
                </Button>
                <Button 
                  size="sm"
                  onClick={handleCommentSave}
                  disabled={!student.status}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </td>
    </tr>
  )
}

// ============================================
// VERSION CARD (pour mobile)
// ============================================

interface StudentCardProps {
  student: StudentForAttendance
  onStatusChange: (studentId: string, status: AttendanceStatus) => void
  disabled?: boolean
}

export function StudentCard({
  student,
  onStatusChange,
  disabled = false,
}: StudentCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-lg border p-4",
      disabled && "opacity-50 pointer-events-none"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {student.full_name}
          </p>
          {student.student_number && (
            <p className="text-xs text-gray-500">
              N° {student.student_number}
            </p>
          )}
        </div>
        {student.status && (
          <StatusBadge status={student.status} size="sm" showIcon={false} />
        )}
      </div>

      <CompactStatusSelector
        value={student.status}
        onChange={(status) => onStatusChange(student.user_id, status)}
        disabled={disabled}
      />
    </div>
  )
}
