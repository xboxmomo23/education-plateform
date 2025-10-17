"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { TimetableGrid } from "@/components/timetable/TimetableGrid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { getUserSession } from "@/lib/auth"
import type { TimetableEntry, WeekType, ChangeProposal } from "@/lib/timetable/types"
import {
  getTimetableForTeacher,
  detectConflicts,
  proposeChange,
  getChangeProposals,
  subscribeToTimetableChanges,
} from "@/lib/timetable/api"
import { Clock, AlertCircle, CheckCircle, XCircle, Send } from "lucide-react"

const HOURS = ["8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h"]
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]

export default function ProfesseurTimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [weekType, setWeekType] = useState<WeekType>("A")
  const [currentWeek, setCurrentWeek] = useState(0)
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isProposeDialogOpen, setIsProposeDialogOpen] = useState(false)
  const [proposals, setProposals] = useState<ChangeProposal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Proposal form state
  const [proposalReason, setProposalReason] = useState("")
  const [proposedRoom, setProposedRoom] = useState("")
  const [proposedDay, setProposedDay] = useState("")
  const [proposedStartHour, setProposedStartHour] = useState("")
  const [proposedEndHour, setProposedEndHour] = useState("")

  const user = getUserSession()
  const teacherEmail = user?.email || "prof@example.com"

  // Load timetable data
  useEffect(() => {
    loadTimetable()
    loadProposals()
  }, [weekType, currentWeek])

  // Subscribe to real-time updates
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
      const data = await getTimetableForTeacher(teacherEmail, weekStart, weekType)
      setEntries(data)
    } catch (error) {
      console.error("Error loading timetable:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProposals = async () => {
    try {
      const data = await getChangeProposals()
      const myProposals = data.filter((p) => p.proposedByEmail === teacherEmail)
      setProposals(myProposals)
    } catch (error) {
      console.error("Error loading proposals:", error)
    }
  }

  const handleSlotClick = (entry: TimetableEntry) => {
    setSelectedEntry(entry)
    setIsDetailDialogOpen(true)
  }

  const handleProposeChange = (entry: TimetableEntry) => {
    setSelectedEntry(entry)
    setProposedRoom(entry.room)
    setProposedDay(entry.day)
    setProposedStartHour(entry.startHour)
    setProposedEndHour(entry.endHour)
    setProposalReason("")
    setIsProposeDialogOpen(true)
  }

  const handleSubmitProposal = async () => {
    if (!selectedEntry || !proposalReason.trim()) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      const proposedChanges: Partial<TimetableEntry> = {}
      if (proposedRoom !== selectedEntry.room) proposedChanges.room = proposedRoom
      if (proposedDay !== selectedEntry.day) proposedChanges.day = proposedDay as any
      if (proposedStartHour !== selectedEntry.startHour) proposedChanges.startHour = proposedStartHour
      if (proposedEndHour !== selectedEntry.endHour) proposedChanges.endHour = proposedEndHour

      if (Object.keys(proposedChanges).length === 0) {
        alert("Aucune modification proposée")
        return
      }

      await proposeChange({
        entryId: selectedEntry.id,
        proposedBy: user?.name || "Professeur",
        proposedByEmail: teacherEmail,
        reason: proposalReason,
        proposedChanges,
      })

      alert("Proposition envoyée avec succès!")
      setIsProposeDialogOpen(false)
      loadProposals()
    } catch (error) {
      console.error("Error submitting proposal:", error)
      alert("Erreur lors de l'envoi de la proposition")
    }
  }

  const conflicts = detectConflicts(entries, weekType)
  const pendingProposals = proposals.filter((p) => p.status === "pending")

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="teacher">
        <div className="flex items-center justify-center h-64">
          <p>Chargement de l'emploi du temps...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mon emploi du temps</h2>
          <p className="text-muted-foreground">Consultez votre planning et proposez des modifications</p>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cours cette semaine</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entries.length}</div>
              <p className="text-xs text-muted-foreground">Semaine {weekType}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Propositions en attente</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingProposals.length}</div>
              <p className="text-xs text-muted-foreground">En attente de validation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes enseignées</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(entries.map((e) => e.classId)).size}</div>
              <p className="text-xs text-muted-foreground">Classes différentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Timetable grid */}
        <TimetableGrid
          mode="teacher"
          entries={entries}
          weekType={weekType}
          currentWeek={currentWeek}
          conflicts={conflicts}
          onWeekChange={setCurrentWeek}
          onWeekTypeChange={setWeekType}
          onSlotClick={handleSlotClick}
          onProposeChange={handleProposeChange}
          showActions={true}
        />

        {/* Recent proposals */}
        {proposals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mes propositions de modification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {proposals.slice(0, 5).map((proposal) => {
                  const entry = entries.find((e) => e.id === proposal.entryId)
                  return (
                    <div key={proposal.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">
                          {entry?.subject} - {entry?.class}
                        </p>
                        <p className="text-sm text-muted-foreground">{proposal.reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {proposal.timestamp.toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <Badge
                        variant={
                          proposal.status === "approved"
                            ? "default"
                            : proposal.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {proposal.status === "approved" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {proposal.status === "rejected" && <XCircle className="mr-1 h-3 w-3" />}
                        {proposal.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                        {proposal.status === "approved"
                          ? "Approuvée"
                          : proposal.status === "rejected"
                            ? "Refusée"
                            : "En attente"}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detail dialog */}
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
                    <Label className="text-muted-foreground">Classe</Label>
                    <p className="font-semibold">{selectedEntry.class}</p>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Fermer
              </Button>
              <Button
                onClick={() => {
                  setIsDetailDialogOpen(false)
                  if (selectedEntry) handleProposeChange(selectedEntry)
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Proposer une modification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Propose change dialog */}
        <Dialog open={isProposeDialogOpen} onOpenChange={setIsProposeDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Proposer une modification</DialogTitle>
              <DialogDescription>
                Proposez un changement pour ce cours. Le responsable devra approuver votre demande.
              </DialogDescription>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">Cours actuel</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEntry.subject} - {selectedEntry.class} - {selectedEntry.day} {selectedEntry.startHour}-
                    {selectedEntry.endHour} - {selectedEntry.room}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Raison de la modification *</Label>
                  <Textarea
                    value={proposalReason}
                    onChange={(e) => setProposalReason(e.target.value)}
                    placeholder="Expliquez pourquoi vous souhaitez modifier ce cours..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nouvelle salle</Label>
                    <Input
                      value={proposedRoom}
                      onChange={(e) => setProposedRoom(e.target.value)}
                      placeholder={selectedEntry.room}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nouveau jour</Label>
                    <Select value={proposedDay} onValueChange={setProposedDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nouvelle heure de début</Label>
                    <Select value={proposedStartHour} onValueChange={setProposedStartHour}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nouvelle heure de fin</Label>
                    <Select value={proposedEndHour} onValueChange={setProposedEndHour}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProposeDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitProposal}>
                <Send className="mr-2 h-4 w-4" />
                Envoyer la proposition
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
