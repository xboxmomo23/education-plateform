"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { TimetableGrid } from "@/components/timetable/TimetableGrid"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { getUserSession } from "@/lib/auth"
import type { TimetableEntry, WeekType } from "@/lib/timetable/types"
import { getTimetableForClass, subscribeToTimetableChanges } from "@/lib/timetable/api"

export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [weekType, setWeekType] = useState<WeekType>("A")
  const [currentWeek, setCurrentWeek] = useState(0)
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const user = getUserSession()
  const classId = "term-a" // TODO: Get from user profile

  useEffect(() => {
    loadTimetable()
  }, [weekType, currentWeek])

  useEffect(() => {
    const unsubscribe = subscribeToTimetableChanges((updatedEntries) => {
      console.log("[v0] Timetable updated via subscription")
      loadTimetable()
    })

    return () => unsubscribe()
  }, [weekType, currentWeek])

  const loadTimetable = async () => {
    setIsLoading(true)
    try {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() + currentWeek * 7)
      const data = await getTimetableForClass(classId, weekStart, weekType)
      setEntries(data)
    } catch (error) {
      console.error("Error loading timetable:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSlotClick = (entry: TimetableEntry) => {
    setSelectedEntry(entry)
    setIsDetailDialogOpen(true)
  }

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="student">
        <div className="flex items-center justify-center h-64">
          <p>Chargement de l'emploi du temps...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="student">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Emploi du temps</h2>
          <p className="text-muted-foreground">Consultez votre planning hebdomadaire</p>
        </div>

        <TimetableGrid
          mode="student"
          entries={entries}
          weekType={weekType}
          currentWeek={currentWeek}
          onWeekChange={setCurrentWeek}
          onWeekTypeChange={setWeekType}
          onSlotClick={handleSlotClick}
        />

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détails du cours</DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Matière</Label>
                  <p className="font-semibold">{selectedEntry.subject}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Professeur</Label>
                    <p className="font-semibold">{selectedEntry.teacher}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Salle</Label>
                    <p className="font-semibold">{selectedEntry.room}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Jour</Label>
                    <p className="font-semibold">{selectedEntry.day}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Horaire</Label>
                    <p className="font-semibold">
                      {selectedEntry.startHour} - {selectedEntry.endHour}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Semaine</Label>
                  <p className="font-semibold">
                    {selectedEntry.weekType === "both" ? "Toutes les semaines" : `Semaine ${selectedEntry.weekType}`}
                  </p>
                </div>
                {selectedEntry.notes && (
                  <div>
                    <Label className="text-muted-foreground">Remarques</Label>
                    <p className="text-sm">{selectedEntry.notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      selectedEntry.status === "confirmed"
                        ? "default"
                        : selectedEntry.status === "cancelled"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {selectedEntry.status === "confirmed"
                      ? "Confirmé"
                      : selectedEntry.status === "cancelled"
                        ? "Annulé"
                        : "Modifié"}
                  </Badge>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setIsDetailDialogOpen(false)}>Fermer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
