"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import React, { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Download,
  ChevronDown,
  Loader2,
  Eye,
  FileText,
  RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ListSkeleton } from "@/components/ui/list-skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { notify } from "@/lib/toast"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  attendanceApi,
  type AbsenceRecord,
  type ClassOption,
  type AttendanceStatus,
  getStatusLabel,
  getStatusColor,
} from "@/lib/api/attendance"

// ============================================
// PAGE GESTION DES ABSENCES (STAFF)
// ============================================

export default function StaffAbsencesPage() {
  // États
  const [absences, setAbsences] = useState<AbsenceRecord[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAbsence, setSelectedAbsence] = useState<AbsenceRecord | null>(null)
  const [justifyModalOpen, setJustifyModalOpen] = useState(false)
  const [justifying, setJustifying] = useState(false)
  const [changeStatusModalOpen, setChangeStatusModalOpen] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  
  // Filtres
  const [filters, setFilters] = useState({
    search: '',
    classId: 'all',
    status: 'all',
    schoolYear: getCurrentSchoolYearValue(),
    startDate: '',
    endDate: '',
    justifiedOnly: false,
  })

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const { settings } = useEstablishmentSettings()

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Charger les classes accessibles
      const classesResponse = await attendanceApi.getAccessibleClasses()
      if (classesResponse.success) {
        setClasses(classesResponse.data)
      }

      // Charger les absences
      const absencesResponse = await attendanceApi.getAllAbsences({
        ...filters,
        page,
        limit: 50,
      })

      if (absencesResponse.success) {
        const payload = (absencesResponse as any).data ?? absencesResponse
        const absencesList: AbsenceRecord[] = payload?.absences ?? []
        const pagination = payload?.pagination ?? payload?.meta ?? null

        setAbsences(absencesList)

        if (pagination && typeof pagination.totalPages === "number") {
          setTotalPages(pagination.totalPages || 1)
        } else if (typeof payload?.totalPages === "number") {
          setTotalPages(payload.totalPages || 1)
        } else {
          const computedTotalPages = Math.max(1, Math.ceil((payload?.total ?? absencesList.length) / 50))
          setTotalPages(computedTotalPages)
        }
      } else {
        setError('Erreur lors du chargement des absences')
      }

    } catch (err: any) {
      console.error('Erreur chargement absences:', err)
      setError(err.message || 'Erreur lors du chargement')
      notify.error("Impossible de charger les absences", err.message || "Merci de réessayer.")
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Stats
  const stats = {
    total: absences.length,
    absent: absences.filter(a => a.status === 'absent').length,
    late: absences.filter(a => a.status === 'late').length,
    excused: absences.filter(a => a.status === 'excused').length,
    notJustified: absences.filter(a => !a.justified && a.status === 'absent').length,
  }

  // Justifier une absence
  const handleJustify = async (justification: string) => {
    if (!selectedAbsence) return

    setJustifying(true)
    try {
      const response = await attendanceApi.justifyAbsence(
        selectedAbsence.id,
        justification
      )

      if (response.success) {
        setAbsences(prev => prev.map(a => 
          a.id === selectedAbsence.id 
            ? { ...a, justified: true, justification }
            : a
        ))
        setJustifyModalOpen(false)
        setSelectedAbsence(null)
        notify.success("Absence justifiée", `${selectedAbsence.student_name} est désormais marqué comme justifié.`)
      }
    } catch (err) {
      console.error('Erreur justification:', err)
      notify.error("Erreur lors de la justification", (err as Error)?.message || "Veuillez réessayer.")
    } finally {
      setJustifying(false)
    }
  }

  // Changer le statut (mettre présent = enlever l'absence)
  const handleChangeStatus = async (newStatus: AttendanceStatus) => {
    if (!selectedAbsence) return

    setChangingStatus(true)
    try {
      const response = await attendanceApi.updateRecordStatus(
        selectedAbsence.id,
        newStatus
      )

        if (response.success) {
        // Si on met "present", on retire de la liste des absences
        if (newStatus === 'present') {
          setAbsences(prev => prev.filter(a => a.id !== selectedAbsence.id))
        } else {
          // Sinon on met à jour le statut
          setAbsences(prev => prev.map(a => 
            a.id === selectedAbsence.id 
              ? { ...a, status: newStatus }
              : a
          ))
        }
        setChangeStatusModalOpen(false)
        setSelectedAbsence(null)
        notify.success(
          newStatus === 'present' ? "Absent retiré" : "Statut mis à jour",
          `${selectedAbsence.student_name} : ${getStatusLabel(newStatus)}`
        )
      }
    } catch (err) {
      console.error('Erreur changement statut:', err)
      notify.error("Impossible de mettre à jour le statut", (err as Error)?.message || "Réessayez plus tard.")
    } finally {
      setChangingStatus(false)
    }
  }

  // Export CSV
  const handleExport = () => {
    const headers = ['Élève', 'Classe', 'Date', 'Horaire', 'Matière', 'Statut', 'Justifié', 'Justification']
    const rows = absences.map(a => [
      a.student_name,
      a.class_label,
      a.session_date,
      `${a.start_time.slice(0, 5)}-${a.end_time.slice(0, 5)}`,
      a.subject_name,
      getStatusLabel(a.status),
      a.justified ? 'Oui' : 'Non',
      a.justification || '',
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `absences_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Reset filtres
  const resetFilters = () => {
    setFilters({
      search: '',
      classId: 'all',
      status: 'all',
      schoolYear: getCurrentSchoolYearValue(),
      startDate: '',
      endDate: '',
      justifiedOnly: false,
    })
    setPage(1)
  }

  return (
    <DashboardLayout requiredRole="staff">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                📋 Gestion des absences {settings?.displayName ? `· ${settings.displayName}` : ""}
              </h1>
              <p className="text-gray-600">
                Consultez et gérez toutes les absences de l'établissement
                {settings?.schoolYear ? ` — Année scolaire ${settings.schoolYear}` : ""}
              </p>
            </div>
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exporter CSV
            </Button>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard
              label="Total"
              value={stats.total}
              icon={<Users className="h-4 w-4" />}
              color="text-gray-600"
              bgColor="bg-gray-100"
            />
            <StatCard
              label="Absences"
              value={stats.absent}
              icon={<XCircle className="h-4 w-4" />}
              color="text-red-600"
              bgColor="bg-red-50"
            />
            <StatCard
              label="Retards"
              value={stats.late}
              icon={<AlertCircle className="h-4 w-4" />}
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
            <StatCard
              label="Excusés"
              value={stats.excused}
              icon={<ShieldCheck className="h-4 w-4" />}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatCard
              label="Non justifiés"
              value={stats.notJustified}
              icon={<FileText className="h-4 w-4" />}
              color="text-purple-600"
              bgColor="bg-purple-50"
              highlight={stats.notJustified > 0}
            />
          </div>

          {/* Filtres */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Recherche */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un élève, une classe..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>

                {/* Filtre classe */}
                <Select
                  value={filters.classId}
                  onValueChange={(value) => setFilters({ ...filters, classId: value })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtre statut */}
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tous statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="absent">Absents</SelectItem>
                    <SelectItem value="late">Retards</SelectItem>
                    <SelectItem value="excused">Excusés</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtre année scolaire */}
                <Select
                  value={filters.schoolYear}
                  onValueChange={(value) => setFilters({ ...filters, schoolYear: value })}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSchoolYearOptions().map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Plus de filtres */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Plus
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Date de début
                        </label>
                        <Input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Date de fin
                        </label>
                        <Input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="justifiedOnly"
                          checked={filters.justifiedOnly}
                          onChange={(e) => setFilters({ ...filters, justifiedOnly: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor="justifiedOnly" className="text-sm">
                          Absences justifiées uniquement
                        </label>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={resetFilters}
                      >
                        Réinitialiser les filtres
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Tableau des absences */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <ListSkeleton rows={8} className="py-8" />
              ) : error ? (
                <div className="text-center py-12">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={loadData}>Réessayer</Button>
                </div>
              ) : absences.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="Aucune absence trouvée"
                  description="Aucun enregistrement ne correspond aux critères actuels."
                  action={
                    <Button variant="outline" onClick={resetFilters}>
                      Réinitialiser les filtres
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Élève
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Classe
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Cours
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Statut
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Justifié
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {absences.map((absence, index) => (
                        <AbsenceRow
                          key={absence.id}
                          absence={absence}
                          index={index}
                          onView={() => setSelectedAbsence(absence)}
                          onJustify={() => {
                            setSelectedAbsence(absence)
                            setJustifyModalOpen(true)
                          }}
                          onChangeStatus={() => {
                            setSelectedAbsence(absence)
                            setChangeStatusModalOpen(true)
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} sur {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal détails */}
          <AbsenceDetailsModal
            absence={selectedAbsence}
            open={!!selectedAbsence && !justifyModalOpen && !changeStatusModalOpen}
            onClose={() => setSelectedAbsence(null)}
            onJustify={() => setJustifyModalOpen(true)}
            onChangeStatus={() => setChangeStatusModalOpen(true)}
          />

          {/* Modal justification */}
          <JustifyModal
            open={justifyModalOpen}
            onClose={() => {
              setJustifyModalOpen(false)
              setSelectedAbsence(null)
            }}
            onConfirm={handleJustify}
            loading={justifying}
            studentName={selectedAbsence?.student_name || ''}
          />

          {/* Modal changement de statut */}
          <ChangeStatusModal
            open={changeStatusModalOpen}
            onClose={() => {
              setChangeStatusModalOpen(false)
              setSelectedAbsence(null)
            }}
            onConfirm={handleChangeStatus}
            loading={changingStatus}
            studentName={selectedAbsence?.student_name || ''}
            currentStatus={selectedAbsence?.status || 'absent'}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

// ============================================
// COMPOSANTS
// ============================================

function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
  highlight = false,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
  highlight?: boolean
}) {
  return (
    <Card className={cn(highlight && "ring-2 ring-purple-300")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
          </div>
          <div className={cn("p-2 rounded-lg", bgColor, color)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AbsenceRow({
  absence,
  index,
  onView,
  onJustify,
  onChangeStatus,
}: {
  absence: AbsenceRecord
  index: number
  onView: () => void
  onJustify: () => void
  onChangeStatus: () => void
}) {
  const date = new Date(absence.session_date)
  const formattedDate = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <tr 
      className={cn(
        "border-b hover:bg-gray-50 transition-colors",
        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
      )}
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-gray-900">{absence.student_name}</p>
          {absence.student_number && (
            <p className="text-xs text-gray-500">N° {absence.student_number}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline">{absence.class_label}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="text-gray-900">{formattedDate}</p>
          <p className="text-gray-500">
            {absence.start_time.slice(0, 5)} - {absence.end_time.slice(0, 5)}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: absence.subject_color }}
          />
          <span className="text-sm">{absence.subject_name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge 
          variant="outline" 
          className={cn("text-xs", getStatusColor(absence.status))}
        >
          {getStatusLabel(absence.status)}
          {absence.status === 'late' && absence.late_minutes && (
            <span className="ml-1">(+{absence.late_minutes}min)</span>
          )}
        </Badge>
      </td>
      <td className="px-4 py-3">
        {absence.justified ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-gray-300" />
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={onView}
            title="Voir détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {!absence.justified && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
              onClick={onJustify}
              title="Justifier"
            >
              <ShieldCheck className="h-4 w-4" />
            </Button>
          )}
          {/* Bouton pour modifier le statut */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
            onClick={onChangeStatus}
            title="Modifier le statut"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

function AbsenceDetailsModal({
  absence,
  open,
  onClose,
  onJustify,
  onChangeStatus,
}: {
  absence: AbsenceRecord | null
  open: boolean
  onClose: () => void
  onJustify: () => void
  onChangeStatus: () => void
}) {
  if (!absence) return null

  const date = new Date(absence.session_date)
  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Détails de l'absence</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Élève */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
              <Users className="h-6 w-6 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{absence.student_name}</p>
              <p className="text-sm text-gray-500">
                {absence.class_label}
                {absence.student_number && ` • N° ${absence.student_number}`}
              </p>
            </div>
          </div>

          {/* Infos cours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Date</p>
              <p className="font-medium">{formattedDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Horaire</p>
              <p className="font-medium">
                {absence.start_time.slice(0, 5)} - {absence.end_time.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Matière</p>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: absence.subject_color }}
                />
                <span className="font-medium">{absence.subject_name}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Statut</p>
              <Badge className={cn(getStatusColor(absence.status))}>
                {getStatusLabel(absence.status)}
              </Badge>
            </div>
          </div>

          {/* Justification */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 mb-2">Justification</p>
            {absence.justified ? (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Justifié</span>
                </div>
                {absence.justification && (
                  <p className="text-sm text-green-600">{absence.justification}</p>
                )}
                {absence.justified_at && (
                  <p className="text-xs text-green-500 mt-1">
                    Le {new Date(absence.justified_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 text-orange-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Non justifié</span>
                </div>
              </div>
            )}
          </div>

          {/* Commentaire */}
          {absence.comment && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-1">Commentaire du professeur</p>
              <p className="text-gray-700">{absence.comment}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button 
            variant="outline" 
            onClick={onChangeStatus}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Modifier statut
          </Button>
          {!absence.justified && (
            <Button onClick={onJustify} className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Justifier
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function JustifyModal({
  open,
  onClose,
  onConfirm,
  loading,
  studentName,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (justification: string) => void
  loading: boolean
  studentName: string
}) {
  const [justification, setJustification] = useState('')

  const handleSubmit = () => {
    if (justification.trim()) {
      onConfirm(justification)
      setJustification('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justifier l'absence</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Vous allez justifier l'absence de <strong>{studentName}</strong>.
          </p>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Motif de la justification
            </label>
            <Textarea
              placeholder="Ex: Certificat médical fourni, Convocation officielle..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!justification.trim() || loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChangeStatusModal({
  open,
  onClose,
  onConfirm,
  loading,
  studentName,
  currentStatus,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (status: AttendanceStatus) => void
  loading: boolean
  studentName: string
  currentStatus: AttendanceStatus
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le statut</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Modifier le statut de <strong>{studentName}</strong>
          </p>
          
          <div className="text-sm text-gray-500">
            Statut actuel : <Badge variant="outline">{getStatusLabel(currentStatus)}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Mettre Présent */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-green-200 hover:bg-green-50"
              onClick={() => onConfirm('present')}
              disabled={loading || currentStatus === 'present'}
            >
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span className="text-green-700 font-medium">Mettre Présent</span>
              <span className="text-xs text-gray-500">Enlever l'absence</span>
            </Button>

            {/* Mettre Excusé */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-blue-200 hover:bg-blue-50"
              onClick={() => onConfirm('excused')}
              disabled={loading || currentStatus === 'excused'}
            >
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              <span className="text-blue-700 font-medium">Mettre Excusé</span>
              <span className="text-xs text-gray-500">Justifier</span>
            </Button>

            {/* Mettre Absent */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-red-200 hover:bg-red-50"
              onClick={() => onConfirm('absent')}
              disabled={loading || currentStatus === 'absent'}
            >
              <XCircle className="h-6 w-6 text-red-600" />
              <span className="text-red-700 font-medium">Mettre Absent</span>
            </Button>

            {/* Mettre En retard */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-orange-200 hover:bg-orange-50"
              onClick={() => onConfirm('late')}
              disabled={loading || currentStatus === 'late'}
            >
              <AlertCircle className="h-6 w-6 text-orange-600" />
              <span className="text-orange-700 font-medium">Mettre En retard</span>
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// HELPERS
// ============================================

function getCurrentSchoolYearValue(): string {
  const now = new Date()
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${year + 1}`
}

function getSchoolYearOptions(): Array<{ value: string; label: string }> {
  const currentYear = new Date().getFullYear()
  const years = []
  
  for (let i = 0; i < 5; i++) {
    const startYear = currentYear - i
    years.push({
      value: `${startYear}-${startYear + 1}`,
      label: `${startYear}-${startYear + 1}`,
    })
  }
  
  return years
}
