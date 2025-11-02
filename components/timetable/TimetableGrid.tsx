"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, AlertTriangle, Edit } from "lucide-react"
import type { TimetableEntry, TimetableConflict, WeekType, DayOfWeek } from "@/lib/timetable/types"

// Constants
const HOURS = ["8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h"]
const DAYS: DayOfWeek[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]

interface TimetableGridProps {
  mode: "student" | "teacher" | "staff"
  entries: TimetableEntry[]
  weekType: WeekType
  currentWeek: number
  conflicts?: TimetableConflict[]
  onWeekChange: (week: number) => void
  onWeekTypeChange: (type: WeekType) => void
  onSlotClick?: (entry: TimetableEntry) => void
  onProposeChange?: (entry: TimetableEntry) => void
  showActions?: boolean
}

export function TimetableGrid({
  mode,
  entries,
  weekType,
  currentWeek,
  conflicts = [],
  onWeekChange,
  onWeekTypeChange,
  onSlotClick,
  onProposeChange,
  showActions = false,
}: TimetableGridProps) {
  const [viewMode, setViewMode] = useState<"detailed" | "condensed">("detailed")

  const getWeekDates = () => {
    const today = new Date()
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 1 + currentWeek * 7))
    const lastDay = new Date(firstDay)
    lastDay.setDate(lastDay.getDate() + 4)
    return `${firstDay.getDate()}/${firstDay.getMonth() + 1} - ${lastDay.getDate()}/${lastDay.getMonth() + 1}`
  }

  const getEntriesForSlot = (day: DayOfWeek, hour: string) => {
    return entries.filter((entry) => {
      if (entry.day !== day) return false
      const startIdx = HOURS.indexOf(entry.startHour)
      const endIdx = HOURS.indexOf(entry.endHour)
      const currentIdx = HOURS.indexOf(hour)
      return currentIdx >= startIdx && currentIdx < endIdx
    })
  }

  const hasConflict = (entryId: string) => {
    return conflicts.some((c) => c.entries.includes(entryId))
  }

  const getConflictForEntry = (entryId: string) => {
    return conflicts.find((c) => c.entries.includes(entryId))
  }

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Semaine {weekType} - {getWeekDates()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onWeekChange(currentWeek - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => onWeekChange(0)} disabled={currentWeek === 0}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={() => onWeekChange(currentWeek + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex gap-1 rounded-lg border p-1">
            <Button variant={weekType === "A" ? "default" : "ghost"} size="sm" onClick={() => onWeekTypeChange("A")}>
              Semaine A
            </Button>
            <Button variant={weekType === "B" ? "default" : "ghost"} size="sm" onClick={() => onWeekTypeChange("B")}>
              Semaine B
            </Button>
          </div>
        </div>
      </div>

      {/* Conflicts alert */}
      {conflicts.length > 0 && mode === "staff" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">
                {conflicts.length} conflit{conflicts.length > 1 ? "s" : ""} détecté{conflicts.length > 1 ? "s" : ""}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-800">
                {conflicts.slice(0, 3).map((conflict, i) => (
                  <li key={i}>• {conflict.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Desktop view - Table */}
      <Card className="hidden md:block">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Planning hebdomadaire</CardTitle>
            {mode === "staff" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === "detailed" ? "condensed" : "detailed")}
              >
                {viewMode === "detailed" ? "Vue condensée" : "Vue détaillée"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border bg-muted p-2 text-left font-medium w-20">Heure</th>
                  {DAYS.map((day) => (
                    <th key={day} className="border bg-muted p-2 text-center font-medium">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="border bg-muted/50 p-2 text-sm font-medium">{hour}</td>
                    {DAYS.map((day) => {
                      const entriesInSlot = getEntriesForSlot(day, hour)
                      const isFirstHour = entriesInSlot.length > 0 && entriesInSlot[0].startHour === hour

                      return (
                        <td key={`${day}-${hour}`} className="border p-1 h-16 relative">
                          {isFirstHour &&
                            entriesInSlot.map((entry) => {
                              const duration = HOURS.indexOf(entry.endHour) - HOURS.indexOf(entry.startHour)
                              const hasConflictFlag = hasConflict(entry.id)
                              const conflict = getConflictForEntry(entry.id)

                              return (
                                <div
                                  key={entry.id}
                                  className={`rounded-lg border-2 p-2 cursor-pointer hover:shadow-md transition-shadow ${
                                    entry.color
                                  } ${hasConflictFlag ? "ring-2 ring-red-500" : ""} ${
                                    entry.status === "cancelled" ? "opacity-50" : ""
                                  }`}
                                  style={{
                                    height: `${duration * 4}rem`,
                                    minHeight: "3.5rem",
                                  }}
                                  onClick={() => onSlotClick?.(entry)}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm leading-tight truncate">{entry.subject}</p>
                                      {viewMode === "detailed" && (
                                        <>
                                          {mode !== "teacher" && <p className="text-xs truncate">{entry.teacher}</p>}
                                          {mode !== "student" && <p className="text-xs truncate">{entry.class}</p>}
                                          <p className="text-xs truncate">{entry.room}</p>
                                          {entry.weekType !== "both" && (
                                            <Badge variant="outline" className="mt-1 text-xs">
                                              Sem. {entry.weekType}
                                            </Badge>
                                          )}
                                        </>
                                      )}
                                      {entry.status === "cancelled" && (
                                        <Badge variant="destructive" className="mt-1 text-xs">
                                          Annulé
                                        </Badge>
                                      )}
                                      {entry.status === "changed" && (
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                          Modifié
                                        </Badge>
                                      )}
                                    </div>
                                    {showActions && mode === "teacher" && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          onProposeChange?.(entry)
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  {hasConflictFlag && conflict && (
                                    <div className="mt-1 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3 text-red-600" />
                                      <span className="text-xs text-red-600">Conflit</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile view - List by day */}
      <div className="md:hidden space-y-4">
        {DAYS.map((day) => {
          const dayEntries = entries
            .filter((e) => e.day === day)
            .sort((a, b) => {
              return HOURS.indexOf(a.startHour) - HOURS.indexOf(b.startHour)
            })

          if (dayEntries.length === 0) return null

          return (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-lg">{day}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayEntries.map((entry) => {
                  const hasConflictFlag = hasConflict(entry.id)
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-lg border-2 p-3 ${entry.color} ${
                        hasConflictFlag ? "ring-2 ring-red-500" : ""
                      } ${entry.status === "cancelled" ? "opacity-50" : ""}`}
                      onClick={() => onSlotClick?.(entry)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{entry.subject}</p>
                          {mode !== "teacher" && <p className="text-sm text-muted-foreground">{entry.teacher}</p>}
                          {mode !== "student" && <p className="text-sm text-muted-foreground">{entry.class}</p>}
                          <p className="text-sm text-muted-foreground">{entry.room}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline">
                              {entry.startHour} - {entry.endHour}
                            </Badge>
                            {entry.weekType !== "both" && <Badge variant="outline">Semaine {entry.weekType}</Badge>}
                            {entry.status === "cancelled" && <Badge variant="destructive">Annulé</Badge>}
                            {entry.status === "changed" && <Badge variant="secondary">Modifié</Badge>}
                          </div>
                          {hasConflictFlag && (
                            <div className="mt-2 flex items-center gap-1 text-red-600">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm font-medium">Conflit détecté</span>
                            </div>
                          )}
                        </div>
                        {showActions && mode === "teacher" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              onProposeChange?.(entry)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
