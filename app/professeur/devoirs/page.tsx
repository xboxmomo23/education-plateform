"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, History, FileText } from "lucide-react"
import { useState, useEffect } from "react"
import { getUserSession } from "@/lib/auth"
import type { Devoir } from "@/lib/devoirs/types"
import { getDevoirsByAuthor, createDevoir, updateDevoir, deleteDevoir, getCoursesByTeacher } from "@/lib/devoirs/api"
import { DevoirCard } from "@/components/devoirs/DevoirCard"
import { DevoirFormModal } from "@/components/devoirs/DevoirFormModal"
import { MOCK_CLASSES } from "@/lib/devoirs/mockDevoirs"

export default function ProfesseurDevoirsPage() {
  const [devoirs, setDevoirs] = useState<Devoir[]>([])
  const [filteredDevoirs, setFilteredDevoirs] = useState<Devoir[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDevoir, setEditingDevoir] = useState<Devoir | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCourse, setFilterCourse] = useState<string>("all")
  const [filterClass, setFilterClass] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterDueDate, setFilterDueDate] = useState<string>("all")
  const [showHistory, setShowHistory] = useState(false)
  const [courses, setCourses] = useState<any[]>([])

  const user = getUserSession()

  useEffect(() => {
    loadDevoirs()
    loadCourses()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [devoirs, searchQuery, filterCourse, filterClass, filterStatus, filterDueDate])

  const loadDevoirs = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const data = await getDevoirsByAuthor(user.email)
      setDevoirs(data)
    } catch (error) {
      console.error("[v0] Error loading devoirs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCourses = async () => {
    if (!user) return
    try {
      const data = await getCoursesByTeacher(user.email)
      setCourses(data as any)
    } catch (error) {
      console.error("[v0] Error loading courses:", error)
    }
  }

  const applyFilters = () => {
    let filtered = [...devoirs]

    // Search
    if (searchQuery) {
      filtered = filtered.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Course filter
    if (filterCourse !== "all") {
      filtered = filtered.filter((d) => d.courseId === filterCourse)
    }

    // Class filter
    if (filterClass !== "all") {
      filtered = filtered.filter((d) => d.classIds.includes(filterClass))
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((d) => d.status === filterStatus)
    }

    // Due date filter
    if (filterDueDate !== "all") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      filtered = filtered.filter((d) => {
        const dueDate = new Date(d.dueDate)
        dueDate.setHours(0, 0, 0, 0)

        if (filterDueDate === "upcoming") {
          return dueDate >= today
        } else if (filterDueDate === "past") {
          return dueDate < today
        }
        return true
      })
    }

    // Sort by due date
    filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    setFilteredDevoirs(filtered)
  }

  const handleCreate = async (data: Partial<Devoir>) => {
    await createDevoir(data as any)
    await loadDevoirs()

    // Mock notification
    if (data.status === "published") {
      console.log("[v0] Notification envoyée aux élèves des classes:", data.classNames)
    }
  }

  const handleEdit = async (data: Partial<Devoir>) => {
    if (!editingDevoir || !user) return

    // Check if can edit (before due date)
    const dueDate = new Date(editingDevoir.dueDate)
    const today = new Date()
    if (dueDate < today) {
      alert("Impossible de modifier ce devoir : la date de remise est passée")
      return
    }

    await updateDevoir(editingDevoir.id, data, user.name, user.role)
    await loadDevoirs()
    setEditingDevoir(null)
  }

  const handleDelete = async (id: string) => {
    const devoir = devoirs.find((d) => d.id === id)
    if (!devoir) return

    // Check if can delete (before due date)
    const dueDate = new Date(devoir.dueDate)
    const today = new Date()
    if (dueDate < today) {
      alert("Impossible de supprimer ce devoir : la date de remise est passée")
      return
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce devoir ?")) return

    await deleteDevoir(id)
    await loadDevoirs()
  }

  const handleDuplicate = async (id: string) => {
    const devoir = devoirs.find((d) => d.id === id)
    if (!devoir || !user) return

    const duplicated: Partial<Devoir> = {
      title: `${devoir.title} (copie)`,
      description: devoir.description,
      courseId: devoir.courseId,
      courseName: devoir.courseName,
      classIds: devoir.classIds,
      classNames: devoir.classNames,
      dueDate: new Date().toISOString().split("T")[0],
      status: "draft",
      resourceUrl: devoir.resourceUrl,
      priority: devoir.priority,
      authorEmail: user.email,
      authorName: user.name,
    }

    await createDevoir(duplicated as any)
    await loadDevoirs()
  }

  const handlePublish = async (id: string) => {
    if (!user) return
    const devoir = devoirs.find((d) => d.id === id)
    if (!devoir) return

    await updateDevoir(id, { status: "published" }, user.name, user.role)
    await loadDevoirs()

    // Mock notification
    console.log("[v0] Notification envoyée aux élèves des classes:", devoir.classNames)
    alert(`Devoir publié ! Les élèves des classes ${devoir.classNames.join(", ")} ont été notifiés.`)
  }

  const stats = {
    total: devoirs.length,
    published: devoirs.filter((d) => d.status === "published").length,
    draft: devoirs.filter((d) => d.status === "draft").length,
    upcoming: devoirs.filter((d) => new Date(d.dueDate) >= new Date()).length,
  }

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestion des devoirs</h2>
            <p className="text-muted-foreground">Créer et gérer les devoirs pour vos classes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowHistory(true)}>
              <History className="mr-2 h-4 w-4" />
              Historique
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un devoir
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Publiés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.published}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">À venir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.upcoming}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-base">Filtres et recherche</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher par titre..."
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filtres */}
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium">Cours</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                >
                  <option value="all">Tous les cours</option>
                  {courses.map((course: any) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Classe</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                >
                  <option value="all">Toutes les classes</option>
                  {MOCK_CLASSES.map((classe) => (
                    <option key={classe.id} value={classe.id}>
                      {classe.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Statut</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Tous</option>
                  <option value="published">Publiés</option>
                  <option value="draft">Brouillons</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Date de remise</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={filterDueDate}
                  onChange={(e) => setFilterDueDate(e.target.value)}
                >
                  <option value="all">Toutes</option>
                  <option value="upcoming">À venir</option>
                  <option value="past">Passées</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des devoirs */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Chargement...</CardContent>
            </Card>
          ) : filteredDevoirs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun devoir trouvé</p>
                <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer votre premier devoir
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredDevoirs.map((devoir) => (
              <DevoirCard
                key={devoir.id}
                devoir={devoir}
                variant="teacher"
                onEdit={(id) => setEditingDevoir(devoirs.find((d) => d.id === id) || null)}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onPublish={handlePublish}
              />
            ))
          )}
        </div>

        {/* Modal de création */}
        {showCreateModal && user && (
          <DevoirFormModal
            authorEmail={user.email}
            authorName={user.name}
            onClose={() => setShowCreateModal(false)}
            onSave={handleCreate}
          />
        )}

        {/* Modal d'édition */}
        {editingDevoir && user && (
          <DevoirFormModal
            devoir={editingDevoir}
            authorEmail={user.email}
            authorName={user.name}
            onClose={() => setEditingDevoir(null)}
            onSave={handleEdit}
          />
        )}

        {/* Modal d'historique */}
        {showHistory && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowHistory(false)}
          >
            <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Historique des modifications</CardTitle>
                <CardDescription>Toutes les actions sur les devoirs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {devoirs
                    .flatMap((d) =>
                      d.history.map((h) => ({
                        ...h,
                        devoirTitle: d.title,
                        devoirId: d.id,
                      })),
                    )
                    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
                    .slice(0, 20)
                    .map((record, i) => (
                      <div key={i} className="flex items-start justify-between rounded-lg border p-3">
                        <div className="flex-1">
                          <p className="font-medium">{record.devoirTitle}</p>
                          <p className="text-sm text-muted-foreground">{record.changes}</p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{record.by}</p>
                          <p>{new Date(record.when).toLocaleString("fr-FR")}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
