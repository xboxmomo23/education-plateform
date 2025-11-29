"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Ban, 
  Monitor 
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AttendanceStatus } from "@/lib/api/attendance"

interface AttendanceStatusSelectorProps {
  value: AttendanceStatus | null
  onChange: (status: AttendanceStatus) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
}

interface StatusOption {
  status: AttendanceStatus
  label: string
  shortLabel: string
  icon: React.ReactNode
  color: string
  bgColor: string
  hoverColor: string
  activeColor: string
}

const statusOptions: StatusOption[] = [
  {
    status: 'present',
    label: 'Présent',
    shortLabel: 'P',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    hoverColor: 'hover:bg-green-100',
    activeColor: 'bg-green-500 text-white',
  },
  {
    status: 'absent',
    label: 'Absent',
    shortLabel: 'A',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    hoverColor: 'hover:bg-red-100',
    activeColor: 'bg-red-500 text-white',
  },
  {
    status: 'late',
    label: 'En retard',
    shortLabel: 'R',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    hoverColor: 'hover:bg-orange-100',
    activeColor: 'bg-orange-500 text-white',
  },
  {
    status: 'excused',
    label: 'Excusé',
    shortLabel: 'E',
    icon: <ShieldCheck className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hoverColor: 'hover:bg-blue-100',
    activeColor: 'bg-blue-500 text-white',
  },
]

// Options supplémentaires (moins fréquentes)
const extraOptions: StatusOption[] = [
  {
    status: 'excluded',
    label: 'Exclu',
    shortLabel: 'X',
    icon: <Ban className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hoverColor: 'hover:bg-purple-100',
    activeColor: 'bg-purple-500 text-white',
  },
  {
    status: 'remote',
    label: 'À distance',
    shortLabel: 'D',
    icon: <Monitor className="h-4 w-4" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    hoverColor: 'hover:bg-cyan-100',
    activeColor: 'bg-cyan-500 text-white',
  },
]

export function AttendanceStatusSelector({
  value,
  onChange,
  disabled = false,
  size = 'md',
  showLabels = false,
}: AttendanceStatusSelectorProps) {
  const allOptions = [...statusOptions, ...extraOptions]

  const sizeClasses = {
    sm: 'p-1.5 gap-1',
    md: 'p-2 gap-1.5',
    lg: 'p-2.5 gap-2',
  }

  const buttonSizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center rounded-lg bg-gray-100", sizeClasses[size])}>
        {allOptions.map((option) => {
          const isActive = value === option.status
          
          return (
            <Tooltip key={option.status}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(option.status)}
                  disabled={disabled}
                  className={cn(
                    "flex items-center justify-center rounded-md transition-all duration-150",
                    buttonSizeClasses[size],
                    disabled && "opacity-50 cursor-not-allowed",
                    isActive
                      ? option.activeColor
                      : cn(option.bgColor, option.hoverColor, option.color),
                    showLabels && "w-auto px-3"
                  )}
                >
                  {option.icon}
                  {showLabels && (
                    <span className="ml-1.5 text-xs font-medium">
                      {option.shortLabel}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{option.label}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

// ============================================
// VERSION COMPACTE (pour les lignes de tableau)
// ============================================

interface CompactStatusSelectorProps {
  value: AttendanceStatus | null
  onChange: (status: AttendanceStatus) => void
  disabled?: boolean
}

export function CompactStatusSelector({
  value,
  onChange,
  disabled = false,
}: CompactStatusSelectorProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5">
        {statusOptions.map((option) => {
          const isActive = value === option.status
          
          return (
            <Tooltip key={option.status}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(option.status)}
                  disabled={disabled}
                  className={cn(
                    "flex items-center justify-center rounded h-7 w-7 transition-all duration-150",
                    disabled && "opacity-50 cursor-not-allowed",
                    isActive
                      ? option.activeColor
                      : cn("bg-gray-50 hover:bg-gray-100", option.color)
                  )}
                >
                  {React.cloneElement(option.icon as React.ReactElement, {
                    className: "h-3.5 w-3.5"
                  })}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{option.label}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

// ============================================
// BADGE DE STATUT (affichage seul)
// ============================================

interface StatusBadgeProps {
  status: AttendanceStatus
  showIcon?: boolean
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const option = [...statusOptions, ...extraOptions].find(o => o.status === status)
  
  if (!option) return null

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        sizeClasses[size],
        option.bgColor,
        option.color
      )}
    >
      {showIcon && React.cloneElement(option.icon as React.ReactElement, {
        className: size === 'sm' ? "h-3 w-3" : "h-3.5 w-3.5"
      })}
      {option.label}
    </span>
  )
}
