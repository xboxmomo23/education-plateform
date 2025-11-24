"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Repeat, Zap } from "lucide-react"

interface ModeIndicatorProps {
  mode: 'classic' | 'dynamic'
}

export function ModeIndicator({ mode }: ModeIndicatorProps) {
  if (mode === 'classic') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Repeat className="h-3 w-3" />
        Mode Classic
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1.5 border-purple-300 text-purple-700 bg-purple-50">
      <Zap className="h-3 w-3" />
      Mode Dynamic
    </Badge>
  )
}