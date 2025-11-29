"use client"

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
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  getStatusLabel,
  getStatusColor,
  type AttendanceStatus,
} from "@/lib/api/attendance"

// ============================================
// TYPES
// ============================================

interface AbsenceRecord {
  id: string
  student_id: string
  student_name: string
  student_number: string | null
  class_id: string
  class_label: string
  subject_name: string
  subject_color: string
  session_date: string
  start_time: string
  end_time: string
  status: AttendanceStatus
  late_minutes: number | null
  comment: string | null
  justified: boolean
  justification: string | null
  justified_at: string | null
  school_year: string
}

interface ClassOption {
  id: string
  label: string
}

interface Filters {
  search: string
  classId: string
  status: string
  schoolYear: string
  startDate: string
  endDate: string
  justifiedOnly: boolean
}

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
  
  // Filtres
  const [filters, setFilters] = useState<Filters>({
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
  const [hasMore, setHasMore] = useState(true)
  const ITEMS_PER_PAGE = 50

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Simuler un appel API - À remplacer par le vrai appel
      // const response = await absencesApi.getAll(filters)
      
      // Pour l'instant, données mock
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Classes mock
      setClasses([
        { id: '1', label: '6ème A' },
        { id: '2', label: '6ème B' },
        { id: '3', label: '5ème A' },
        { id: '4', label: '4ème C' },
      ])

      // Absences mock
      setAbsences(generateMockAbsences(30))
      setHasMore(true)

    } catch (err: any) {
      console.error('Erreur chargement absences:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtrer les absences localement
  const filteredAbsences = absences.filter(absence => {
    // Recherche
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch = 
        absence.student_name.toLowerCase().includes(searchLower) ||
        absence.student_number?.toLowerCase().includes(searchLower) ||
        absence.class_label.toLowerCase().includes(searchLower) ||
        absence.subject_name.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
    }

    // Classe
    if (filters.classId !== 'all' && absence.class_id !== filters.classId) {
      return false
    }

    // Statut
    if (filters.status !== 'all' && absence.status !== filters.status) {
      return false
    }

    // Justifié seulement
    if (filters.justifiedOnly && !absence.justified) {
      return false
    }

    return true
  })

  // Stats
  const stats = {
    total: filteredAbsences.length,
    absent: filteredAbsences.filter(a => a.status === 'absent').length,
    late: filteredAbsences.filter(a => a.status === 'late').length,
    excused: filteredAbsences.filter(a => a.status === 'excused').length,
    notJustified: filteredAbsences.filter(a => !a.justified && a.status === 'absent').length,
  }

  // Export CSV
  const handleExport = () => {
    // TODO: Implémenter l'export CSV
    alert('Export CSV à implémenter')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              📋 Gestion des absences
            </h1>
            <p className="text-gray-600">
              Consultez et gérez toutes les absences de l'établissement
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
                      onClick={() => setFilters({
                        search: '',
                        classId: 'all',
                        status: 'all',
                        schoolYear: getCurrentSchoolYearValue(),
                        startDate: '',
                        endDate: '',
                        justifiedOnly: false,
                      })}
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
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadData}>Réessayer</Button>
              </div>
            ) : filteredAbsences.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">Aucune absence trouvée</p>
              </div>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAbsences.map((absence, index) => (
                      <AbsenceRow
                        key={absence.id}
                        absence={absence}
                        index={index}
                        onClick={() => setSelectedAbsence(absence)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal détails */}
        <AbsenceDetailsModal
          absence={selectedAbsence}
          onClose={() => setSelectedAbsence(null)}
        />
      </div>
    </div>
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
  onClick,
}: {
  absence: AbsenceRecord
  index: number
  onClick: () => void
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
        "border-b hover:bg-gray-50 cursor-pointer transition-colors",
        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
      )}
      onClick={onClick}
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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Eye className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  )
}

function AbsenceDetailsModal({
  absence,
  onClose,
}: {
  absence: AbsenceRecord | null
  onClose: () => void
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
    <Dialog open={!!absence} onOpenChange={onClose}>
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
              <p className="text-sm text-gray-500 mb-1">Commentaire</p>
              <p className="text-gray-700">{absence.comment}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            {!absence.justified && (
              <Button className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Justifier
              </Button>
            )}
          </div>
        </div>
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
  
  // 5 dernières années scolaires
  for (let i = 0; i < 5; i++) {
    const startYear = currentYear - i
    years.push({
      value: `${startYear}-${startYear + 1}`,
      label: `${startYear}-${startYear + 1}`,
    })
  }
  
  return years
}

// Données mock pour le développement
function generateMockAbsences(count: number): AbsenceRecord[] {
  const students = [
    { id: '1', name: 'Dupont Marie', number: '2024-001', classId: '1', classLabel: '6ème A' },
    { id: '2', name: 'Martin Lucas', number: '2024-002', classId: '1', classLabel: '6ème A' },
    { id: '3', name: 'Bernard Emma', number: '2024-003', classId: '2', classLabel: '6ème B' },
    { id: '4', name: 'Petit Thomas', number: '2024-004', classId: '3', classLabel: '5ème A' },
    { id: '5', name: 'Robert Julie', number: '2024-005', classId: '4', classLabel: '4ème C' },
  ]
  
  const subjects = [
    { name: 'Mathématiques', color: '#3B82F6' },
    { name: 'Français', color: '#EF4444' },
    { name: 'Histoire-Géo', color: '#F59E0B' },
    { name: 'Anglais', color: '#10B981' },
    { name: 'Sciences', color: '#8B5CF6' },
  ]
  
  const statuses: AttendanceStatus[] = ['absent', 'late', 'excused']
  
  const absences: AbsenceRecord[] = []
  
  for (let i = 0; i < count; i++) {
    const student = students[Math.floor(Math.random() * students.length)]
    const subject = subjects[Math.floor(Math.random() * subjects.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 60))
    
    absences.push({
      id: `absence-${i}`,
      student_id: student.id,
      student_name: student.name,
      student_number: student.number,
      class_id: student.classId,
      class_label: student.classLabel,
      subject_name: subject.name,
      subject_color: subject.color,
      session_date: date.toISOString().split('T')[0],
      start_time: '08:00:00',
      end_time: '09:30:00',
      status,
      late_minutes: status === 'late' ? Math.floor(Math.random() * 30) + 5 : null,
      comment: Math.random() > 0.7 ? 'Commentaire du professeur' : null,
      justified: Math.random() > 0.5,
      justification: Math.random() > 0.5 ? 'Certificat médical' : null,
      justified_at: Math.random() > 0.5 ? new Date().toISOString() : null,
      school_year: '2024-2025',
    })
  }
  
  // Trier par date décroissante
  return absences.sort((a, b) => 
    new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
  )
}
