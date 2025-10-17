// Mock API functions for timetable management
// TODO: Replace with real backend API calls (Supabase, REST API, etc.)

import type { TimetableEntry, TimetableModification, ChangeProposal, TimetableConflict, WeekType } from "./types"
import { MOCK_TIMETABLE_ENTRIES, MOCK_MODIFICATIONS, MOCK_CHANGE_PROPOSALS } from "./mockTimetable"

// In-memory storage for mock data (simulates database)
const timetableEntries = [...MOCK_TIMETABLE_ENTRIES]
const modifications = [...MOCK_MODIFICATIONS]
const changeProposals = [...MOCK_CHANGE_PROPOSALS]

// Subscribers for real-time updates (simulates WebSocket/Supabase Realtime)
type SubscriberCallback = (entries: TimetableEntry[]) => void
const subscribers: SubscriberCallback[] = []

// Hours for validation
const HOURS = ["8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h"]

/**
 * Get timetable for a specific teacher
 * TODO: Replace with API call: GET /api/timetable/teacher?email={email}&weekStart={weekStart}&weekType={weekType}
 */
export async function getTimetableForTeacher(
  teacherEmail: string,
  weekStart: Date,
  weekType: WeekType,
): Promise<TimetableEntry[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  return timetableEntries.filter(
    (entry) => entry.teacherEmail === teacherEmail && (entry.weekType === weekType || entry.weekType === "both"),
  )
}

/**
 * Get timetable for a specific class
 * TODO: Replace with API call: GET /api/timetable/class?classId={classId}&weekStart={weekStart}&weekType={weekType}
 */
export async function getTimetableForClass(
  classId: string,
  weekStart: Date,
  weekType: WeekType,
): Promise<TimetableEntry[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  return timetableEntries.filter(
    (entry) => entry.classId === classId && (entry.weekType === weekType || entry.weekType === "both"),
  )
}

/**
 * Get all timetable entries (for responsable)
 * TODO: Replace with API call: GET /api/timetable?weekStart={weekStart}&weekType={weekType}
 */
export async function getAllTimetableEntries(weekStart: Date, weekType: WeekType): Promise<TimetableEntry[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  return timetableEntries.filter((entry) => entry.weekType === weekType || entry.weekType === "both")
}

/**
 * Create a new timetable entry
 * TODO: Replace with API call: POST /api/timetable
 */
export async function createTimetableEntry(
  entry: Omit<TimetableEntry, "id" | "createdAt" | "updatedAt">,
): Promise<TimetableEntry> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const newEntry: TimetableEntry = {
    ...entry,
    id: `entry-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  timetableEntries.push(newEntry)
  notifySubscribers()

  // Add modification record
  addModification(newEntry.id, "created", entry.createdBy, "responsable", "Nouveau cours créé")

  return newEntry
}

/**
 * Update an existing timetable entry
 * TODO: Replace with API call: PUT /api/timetable/{id}
 */
export async function updateTimetableEntry(
  id: string,
  updates: Partial<TimetableEntry>,
  updatedBy: string,
  userRole: "teacher" | "responsable" | "admin",
): Promise<TimetableEntry> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const index = timetableEntries.findIndex((e) => e.id === id)
  if (index === -1) {
    throw new Error("Entry not found")
  }

  const oldEntry = timetableEntries[index]
  const updatedEntry: TimetableEntry = {
    ...oldEntry,
    ...updates,
    updatedAt: new Date(),
    updatedBy,
  }

  timetableEntries[index] = updatedEntry
  notifySubscribers()

  // Add modification record
  const details = Object.keys(updates)
    .map((key) => `${key}: ${oldEntry[key as keyof TimetableEntry]} → ${updates[key as keyof TimetableEntry]}`)
    .join(", ")
  addModification(id, "modified", updatedBy, userRole, details)

  return updatedEntry
}

/**
 * Delete a timetable entry
 * TODO: Replace with API call: DELETE /api/timetable/{id}
 */
export async function deleteTimetableEntry(
  id: string,
  deletedBy: string,
  userRole: "teacher" | "responsable" | "admin",
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const index = timetableEntries.findIndex((e) => e.id === id)
  if (index === -1) {
    throw new Error("Entry not found")
  }

  const entry = timetableEntries[index]
  timetableEntries.splice(index, 1)
  notifySubscribers()

  // Add modification record
  addModification(id, "deleted", deletedBy, userRole, `Cours supprimé: ${entry.subject} - ${entry.class}`)
}

/**
 * Propose a change to a timetable entry (for teachers)
 * TODO: Replace with API call: POST /api/timetable/proposals
 */
export async function proposeChange(
  proposal: Omit<ChangeProposal, "id" | "timestamp" | "status">,
): Promise<ChangeProposal> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const newProposal: ChangeProposal = {
    ...proposal,
    id: `prop-${Date.now()}`,
    timestamp: new Date(),
    status: "pending",
  }

  changeProposals.push(newProposal)
  return newProposal
}

/**
 * Get all change proposals
 * TODO: Replace with API call: GET /api/timetable/proposals
 */
export async function getChangeProposals(status?: "pending" | "approved" | "rejected"): Promise<ChangeProposal[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  if (status) {
    return changeProposals.filter((p) => p.status === status)
  }
  return changeProposals
}

/**
 * Approve or reject a change proposal
 * TODO: Replace with API call: PUT /api/timetable/proposals/{id}
 */
export async function reviewChangeProposal(
  proposalId: string,
  status: "approved" | "rejected",
  reviewedBy: string,
): Promise<ChangeProposal> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const proposal = changeProposals.find((p) => p.id === proposalId)
  if (!proposal) {
    throw new Error("Proposal not found")
  }

  proposal.status = status
  proposal.reviewedBy = reviewedBy
  proposal.reviewedAt = new Date()

  // If approved, apply the changes
  if (status === "approved") {
    await updateTimetableEntry(proposal.entryId, proposal.proposedChanges, reviewedBy, "responsable")
  }

  return proposal
}

/**
 * Get modification history
 * TODO: Replace with API call: GET /api/timetable/modifications?entryId={entryId}
 */
export async function getModifications(entryId?: string): Promise<TimetableModification[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  if (entryId) {
    return modifications.filter((m) => m.entryId === entryId)
  }
  return modifications
}

/**
 * Detect conflicts in timetable
 */
export function detectConflicts(entries: TimetableEntry[], weekType: WeekType): TimetableConflict[] {
  const conflicts: TimetableConflict[] = []
  const filteredEntries = entries.filter((e) => e.weekType === weekType || e.weekType === "both")

  // Check for room conflicts
  filteredEntries.forEach((entry1, i) => {
    filteredEntries.slice(i + 1).forEach((entry2) => {
      if (
        entry1.day === entry2.day &&
        entry1.room === entry2.room &&
        hoursOverlap(entry1.startHour, entry1.endHour, entry2.startHour, entry2.endHour)
      ) {
        conflicts.push({
          type: "room",
          severity: "error",
          message: `Conflit de salle ${entry1.room}: ${entry1.subject} (${entry1.class}) et ${entry2.subject} (${entry2.class})`,
          entries: [entry1.id, entry2.id],
        })
      }

      // Check for teacher conflicts
      if (
        entry1.day === entry2.day &&
        entry1.teacherEmail === entry2.teacherEmail &&
        hoursOverlap(entry1.startHour, entry1.endHour, entry2.startHour, entry2.endHour)
      ) {
        conflicts.push({
          type: "teacher",
          severity: "error",
          message: `${entry1.teacher} a deux cours en même temps: ${entry1.subject} (${entry1.class}) et ${entry2.subject} (${entry2.class})`,
          entries: [entry1.id, entry2.id],
        })
      }

      // Check for student conflicts (same class)
      if (
        entry1.day === entry2.day &&
        entry1.classId === entry2.classId &&
        hoursOverlap(entry1.startHour, entry1.endHour, entry2.startHour, entry2.endHour)
      ) {
        conflicts.push({
          type: "student",
          severity: "error",
          message: `La classe ${entry1.class} a deux cours en même temps: ${entry1.subject} et ${entry2.subject}`,
          entries: [entry1.id, entry2.id],
        })
      }
    })
  })

  return conflicts
}

/**
 * Subscribe to timetable changes (simulates real-time updates)
 * TODO: Replace with WebSocket or Supabase Realtime subscription
 */
export function subscribeToTimetableChanges(callback: SubscriberCallback): () => void {
  subscribers.push(callback)

  // Return unsubscribe function
  return () => {
    const index = subscribers.indexOf(callback)
    if (index > -1) {
      subscribers.splice(index, 1)
    }
  }
}

// Helper functions

function hoursOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = HOURS.indexOf(start1)
  const e1 = HOURS.indexOf(end1)
  const s2 = HOURS.indexOf(start2)
  const e2 = HOURS.indexOf(end2)
  return s1 < e2 && s2 < e1
}

function notifySubscribers() {
  subscribers.forEach((callback) => callback(timetableEntries))
}

function addModification(
  entryId: string,
  action: TimetableModification["action"],
  user: string,
  userRole: "teacher" | "responsable" | "admin",
  details: string,
) {
  const mod: TimetableModification = {
    id: `mod-${Date.now()}`,
    entryId,
    action,
    user,
    userRole,
    timestamp: new Date(),
    details,
    isLate: false, // TODO: Calculate based on course date
  }
  modifications.unshift(mod)
}
