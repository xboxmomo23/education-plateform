import type { Note } from "./types"

// Mock notes data with various creation dates for testing
// Some notes are <48h old, some 3 days, 20 days, 40 days old
export const MOCK_NOTES: Note[] = [
  // Note 1: Created 12 hours ago (teacher can edit)
  {
    id: "note-1",
    studentId: "1",
    studentName: "Alice Dupont",
    classId: "class-1",
    className: "Terminale A",
    subjectId: "math",
    subjectName: "Mathématiques",
    value: 15,
    coefficient: 2,
    type: "Contrôle",
    date: "2025-10-16",
    comment: "Bon travail sur les équations",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12h ago
    createdBy: "prof@example.com",
    createdByRole: "teacher",
    history: [],
  },
  // Note 2: Created 30 hours ago (teacher can still edit)
  {
    id: "note-2",
    studentId: "2",
    studentName: "Bob Martin",
    classId: "class-1",
    className: "Terminale A",
    subjectId: "math",
    subjectName: "Mathématiques",
    value: 12,
    coefficient: 2,
    type: "Contrôle",
    date: "2025-10-15",
    comment: "Quelques erreurs de calcul",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), // 30h ago
    createdBy: "prof@example.com",
    createdByRole: "teacher",
    history: [],
  },
  // Note 3: Created 3 days ago (teacher cannot edit, responsable can)
  {
    id: "note-3",
    studentId: "3",
    studentName: "Claire Bernard",
    classId: "class-1",
    className: "Terminale A",
    subjectId: "math",
    subjectName: "Mathématiques",
    value: 8,
    coefficient: 2,
    type: "Contrôle",
    date: "2025-10-13",
    comment: "Difficultés sur les dérivées",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    createdBy: "prof@example.com",
    createdByRole: "teacher",
    history: [
      {
        by: "prof@example.com",
        role: "teacher",
        when: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
        changes: {
          value: { from: 7, to: 8 },
        },
      },
    ],
  },
  // Note 4: Created 20 days ago (teacher cannot edit, responsable can)
  {
    id: "note-4",
    studentId: "1",
    studentName: "Alice Dupont",
    classId: "class-1",
    className: "Terminale A",
    subjectId: "french",
    subjectName: "Français",
    value: 16,
    coefficient: 3,
    type: "Devoir",
    date: "2025-09-26",
    comment: "Excellente dissertation",
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
    createdBy: "prof@example.com",
    createdByRole: "teacher",
    history: [],
  },
  // Note 5: Created 40 days ago (locked for everyone except admin)
  {
    id: "note-5",
    studentId: "4",
    studentName: "David Petit",
    classId: "class-2",
    className: "Première B",
    subjectId: "history",
    subjectName: "Histoire-Géographie",
    value: 13,
    coefficient: 2,
    type: "Examen",
    date: "2025-09-06",
    comment: "Bonne analyse historique",
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
    createdBy: "prof@example.com",
    createdByRole: "teacher",
    history: [
      {
        by: "responsable1@test.com",
        role: "responsable",
        when: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        changes: {
          value: { from: 12, to: 13 },
          comment: { from: "Analyse correcte", to: "Bonne analyse historique" },
        },
      },
    ],
  },
  // Note 6: Created 6 hours ago (teacher can edit)
  {
    id: "note-6",
    studentId: "5",
    studentName: "Emma Dubois",
    classId: "class-2",
    className: "Première B",
    subjectId: "math",
    subjectName: "Mathématiques",
    value: 14,
    coefficient: 1,
    type: "Participation",
    date: "2025-10-16",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
    createdBy: "prof@example.com",
    createdByRole: "teacher",
    history: [],
  },
]

// Mock students for the form
export const MOCK_STUDENTS = [
  { id: "1", name: "Alice Dupont", classId: "class-1", className: "Terminale A" },
  { id: "2", name: "Bob Martin", classId: "class-1", className: "Terminale A" },
  { id: "3", name: "Claire Bernard", classId: "class-1", className: "Terminale A" },
  { id: "4", name: "David Petit", classId: "class-2", className: "Première B" },
  { id: "5", name: "Emma Dubois", classId: "class-2", className: "Première B" },
]

// Mock subjects
export const MOCK_SUBJECTS = [
  { id: "math", name: "Mathématiques" },
  { id: "french", name: "Français" },
  { id: "history", name: "Histoire-Géographie" },
  { id: "physics", name: "Physique-Chimie" },
  { id: "english", name: "Anglais" },
]
