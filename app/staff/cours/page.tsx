"use client"

import React, { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { timetableApi } from "@/lib/api/timetable"
import type { CreateCourseData } from "@/lib/api/timetable"
import { PlusCircle } from "lucide-react"

type StaffClass = {
  class_id: string
  class_label?: string
  code?: string
  level?: string
}

type StaffSubject = {
  id: string
  name: string
  short_code?: string
  color?: string
  level?: string
}

type StaffTeacher = {
  id: string
  full_name: string
  email?: string
}

type StaffCourse = {
  course_id: string
  subject_name: string
  subject_code?: string
  subject_color?: string
  teacher_name: string
  teacher_id: string
  default_room?: string | null
}

type CourseFormState = {
  subject_id: string
  teacher_id: string
  default_room: string
}

export default function StaffCoursesPage() {
  const [classes, setClasses] = useState<StaffClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>("")

  const [subjects, setSubjects] = useState<StaffSubject[]>([])
  const [teachers, setTeachers] = useState<StaffTeacher[]>([])
  const [courses, setCourses] = useState<StaffCourse[]>([])

  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const [createForm, setCreateForm] = useState<CourseFormState>({
    subject_id: "",
    teacher_id: "",
    default_room: "",
  })

  const [editForm, setEditForm] = useState<CourseFormState>({
    subject_id: "",
    teacher_id: "",
    default_room: "",
  })

  const [editingCourse, setEditingCourse] = useState<StaffCourse | null>(null)

  // ================== HELPERS ==================

  const selectedClass = useMemo(
    () => classes.find((c) => c.class_id === selectedClassId) || null,
    [classes, selectedClassId]
  )

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses
    const q = searchQuery.toLowerCase()
    return courses.filter(
      (c) =>
        c.subject_name.toLowerCase().includes(q) ||
        (c.teacher_name && c.teacher_name.toLowerCase().includes(q)) ||
        (c.subject_code && c.subject_code.toLowerCase().includes(q))
    )
  }, [courses, searchQuery])

  // ================== LOADERS ==================

  const loadClasses = async () => {
    try {
      setLoadingClasses(true)
      const res = await timetableApi.getStaffClasses()
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setClasses(res.data)
        setSelectedClassId((prev) => prev || res.data[0].class_id)
      }
    } catch (error) {
      console.error("❌ Erreur chargement classes staff:", error)
    } finally {
      setLoadingClasses(false)
    }
  }

  const loadSubjectsAndTeachers = async () => {
    try {
      setLoadingData(true)
      const [subjectsRes, teachersRes] = await Promise.all([
        timetableApi.getStaffSubjects(),
        timetableApi.getStaffTeachers(),
      ])

      if (subjectsRes.success) {
        setSubjects(subjectsRes.data)
      }
      if (teachersRes.success) {
        setTeachers(teachersRes.data)
      }
    } catch (error) {
      console.error("❌ Erreur chargement matières / professeurs:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const loadCoursesForClass = async (classId: string) => {
    if (!classId) return
    try {
      const res = await timetableApi.getAvailableCourses(classId)
      if (res.success && Array.isArray(res.data)) {
        setCourses(res.data)
      } else {
        setCourses([])
      }
    } catch (error) {
      console.error("❌ Erreur chargement cours pour la classe:", error)
      setCourses([])
    }
  }

  useEffect(() => {
    loadClasses()
    loadSubjectsAndTeachers()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      loadCoursesForClass(selectedClassId)
    }
  }, [selectedClassId])

  // ================== ACTIONS : CRÉATION ==================

  const openCreateModal = () => {
    if (!selectedClassId) return
    setCreateForm({
      subject_id: "",
      teacher_id: "",
      default_room: "",
    })
    setShowCreateModal(true)
  }

  const handleCreateCourse = async () => {
    if (!selectedClassId || !createForm.subject_id || !createForm.teacher_id) {
      alert("Veuillez choisir une matière et un professeur.")
      return
    }

    const payload: CreateCourseData = {
      class_id: selectedClassId,
      subject_id: createForm.subject_id,
      teacher_id: createForm.teacher_id,
      default_room: createForm.default_room || undefined,
    }

    try {
      setSaving(true)
      const res = await timetableApi.createCourse(payload)
      if (res.success) {
        setShowCreateModal(false)
        await loadCoursesForClass(selectedClassId)
      } else {
        alert(res.error || "Erreur lors de la création du cours.")
      }
    } catch (error) {
      console.error("❌ Erreur création cours:", error)
      alert("Erreur lors de la création du cours.")
    } finally {
      setSaving(false)
    }
  }

  // ================== ACTIONS : ÉDITION ==================

  const openEditModal = (course: StaffCourse) => {
    setEditingCourse(course)

    const subject = subjects.find((s) => s.name === course.subject_name)
    const teacher = teachers.find((t) => t.full_name === course.teacher_name)

    setEditForm({
      subject_id: subject?.id ?? "",
      teacher_id: teacher?.id ?? course.teacher_id ?? "",
      default_room: course.default_room || "",
    })

    setShowEditModal(true)
  }


  const handleUpdateCourse = async () => {
    if (!editingCourse || !selectedClassId) return
    if (!editForm.subject_id || !editForm.teacher_id) {
      alert("Veuillez choisir une matière et un professeur.")
      return
    }

    // On réutilise CreateCourseData comme payload (même structure côté backend)
    const payload: CreateCourseData = {
      class_id: selectedClassId,
      subject_id: editForm.subject_id,
      teacher_id: editForm.teacher_id,
      default_room: editForm.default_room || undefined,
    }

    try {
      setSaving(true)
      // ⚠️ Nécessite une méthode timetableApi.updateCourse(courseId, payload)
      const res = await timetableApi.updateCourse(editingCourse.course_id, payload as any)
      if (res.success) {
        setShowEditModal(false)
        setEditingCourse(null)
        await loadCoursesForClass(selectedClassId)
      } else {
        alert(res.error || "Erreur lors de la mise à jour du cours.")
      }
    } catch (error) {
      console.error("❌ Erreur mise à jour cours:", error)
      alert("Erreur lors de la mise à jour du cours.")
    } finally {
      setSaving(false)
    }
  }

  // ================== ACTIONS : SUPPRESSION ==================

  const handleDeleteCourse = async (course: StaffCourse) => {
    if (!selectedClassId) return
    const confirmDelete = window.confirm(
      `Supprimer le cours "${course.subject_name}" (${course.teacher_name}) pour cette classe ?`
    )
    if (!confirmDelete) return

    try {
      setDeletingId(course.course_id)
      // ⚠️ Nécessite une méthode timetableApi.deleteCourse(courseId)
      const res = await timetableApi.deleteCourse(course.course_id)
      if (res.success) {
        await loadCoursesForClass(selectedClassId)
      } else {
        alert(res.error || "Erreur lors de la suppression du cours.")
      }
    } catch (error) {
      console.error("❌ Erreur suppression cours:", error)
      alert("Erreur lors de la suppression du cours.")
    } finally {
      setDeletingId(null)
    }
  }

  // ================== RENDU ==================

  return (
    <DashboardLayout requiredRole="staff">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Gestion des cours par classe</h1>
          <p className="text-muted-foreground text-sm">
            Créez, modifiez et supprimez les cours (classe + matière + professeur) qui seront ensuite
            utilisables dans les emplois du temps.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sélection classe */}
          <div className="col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Classes gérées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingClasses && (
                  <p className="text-sm text-muted-foreground">Chargement des classes...</p>
                )}
                {!loadingClasses && classes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucune classe associée à ce compte staff.
                  </p>
                )}

                {!loadingClasses && classes.length > 0 && (
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.class_id} value={c.class_id}>
                          {c.code || c.class_label || "Classe"}{" "}
                          {c.level ? `- ${c.level}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedClass && (
                  <div className="text-xs text-muted-foreground">
                    <div>
                      <span className="font-semibold">Classe :</span>{" "}
                      {selectedClass.code || selectedClass.class_label}
                    </div>
                    {selectedClass.level && (
                      <div>
                        <span className="font-semibold">Niveau :</span>{" "}
                        {selectedClass.level}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cours de la classe */}
          <div className="col-span-8">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Cours de la classe</CardTitle>
                <Button
                  size="sm"
                  onClick={openCreateModal}
                  disabled={!selectedClassId || loadingData}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Créer un cours
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4 gap-3">
                  <Input
                    placeholder="Rechercher (matière, prof, code)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs"
                  />
                  {loadingData && (
                    <span className="text-xs text-muted-foreground">
                      Mise à jour des données...
                    </span>
                  )}
                </div>

                {selectedClassId && filteredCourses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun cours pour cette classe. Utilisez le bouton &quot;Créer un cours&quot;.
                  </p>
                )}

                {filteredCourses.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border bg-card">
                    <table className="min-w-full text-sm">
                      <thead className="border-b bg-muted/60">
                        <tr>
                          <th className="px-4 py-2 text-left">Matière</th>
                          <th className="px-4 py-2 text-left">Professeur</th>
                          <th className="px-4 py-2 text-left">Code</th>
                          <th className="px-4 py-2 text-left">Salle par défaut</th>
                          <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCourses.map((c) => (
                          <tr key={c.course_id} className="border-b last:border-0">
                            <td className="px-4 py-2">{c.subject_name}</td>
                            <td className="px-4 py-2">{c.teacher_name}</td>
                            <td className="px-4 py-2">
                              {c.subject_code || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {c.default_room && c.default_room.trim() !== "" ? (
                                c.default_room
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditModal(c)}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => handleDeleteCourse(c)}
                                  disabled={deletingId === c.course_id}
                                >
                                  {deletingId === c.course_id
                                    ? "Suppression..."
                                    : "Supprimer"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modale création cours */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un cours pour la classe</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Matière</p>
                <Select
                  value={createForm.subject_id}
                  onValueChange={(val) =>
                    setCreateForm((f) => ({ ...f, subject_id: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.short_code ? `(${s.short_code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Professeur</p>
                <Select
                  value={createForm.teacher_id}
                  onValueChange={(val) =>
                    setCreateForm((f) => ({ ...f, teacher_id: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un professeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name} {t.email ? `(${t.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Salle par défaut (optionnel)
                </p>
                <Input
                  placeholder="Ex : 203, Lab Info, ..."
                  value={createForm.default_room}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      default_room: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button onClick={handleCreateCourse} disabled={saving}>
                {saving ? "Création..." : "Créer le cours"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modale édition cours */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le cours</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Matière</p>
                <Select
                  value={editForm.subject_id}
                  onValueChange={(val) =>
                    setEditForm((f) => ({ ...f, subject_id: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.short_code ? `(${s.short_code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Professeur</p>
                <Select
                  value={editForm.teacher_id}
                  onValueChange={(val) =>
                    setEditForm((f) => ({ ...f, teacher_id: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un professeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name} {t.email ? `(${t.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Salle par défaut (optionnel)
                </p>
                <Input
                  placeholder="Ex : 203, Lab Info, ..."
                  value={editForm.default_room}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      default_room: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingCourse(null)
                }}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button onClick={handleUpdateCourse} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
