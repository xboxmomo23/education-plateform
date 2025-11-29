"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Search, 
  Save, 
  Loader2,
  CheckCircle,
  Users,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AttendanceSessionHeader } from "@/components/attendance/AttendanceSessionHeader"
import { StudentRow, StudentCard } from "@/components/attendance/StudentRow"
import { 
  attendanceApi,
  type AttendanceSession,
  type StudentForAttendance,
  type AttendanceStatus,
} from "@/lib/api/attendance"

// ============================================
// PAGE FEUILLE DE PRÉSENCE
// ============================================

export default function AttendanceSessionPage() {
  const params = useParams()
  const router = useRouter()
  const instanceId = params.instanceId as string

  // États
  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [students, setStudents] = useState<StudentForAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [savingStudents, setSavingStudents] = useState<Set<string>>(new Set())
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Charger la session et les élèves
  const loadSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await attendanceApi.getSession(instanceId)
      
      if (response.success) {
        setSession(response.data.session)
        setStudents(response.data.students)
      } else {
        setError('Erreur lors du chargement de la session')
      }
    } catch (err: any) {
      console.error('Erreur chargement session:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  // Marquer la présence d'un élève
  const handleStatusChange = async (
    studentId: string, 
    status: AttendanceStatus,
    options?: { comment?: string; lateMinutes?: number }
  ) => {
    if (!session) return

    try {
      setSavingStudents(prev => new Set(prev).add(studentId))

      const response = await attendanceApi.markAttendance(
        session.id,
        studentId,
        status,
        options
      )

      if (response.success) {
        // Mettre à jour l'état local
        setStudents(prev => prev.map(s => 
          s.user_id === studentId 
            ? { 
                ...s, 
                status, 
                comment: options?.comment || s.comment,
                late_minutes: options?.lateMinutes || s.late_minutes,
                record_id: response.data.id 
              }
            : s
        ))

        // Recharger les stats de la session
        const sessionResponse = await attendanceApi.getSession(instanceId)
        if (sessionResponse.success) {
          setSession(sessionResponse.data.session)
        }
      }
    } catch (err) {
      console.error('Erreur marquage présence:', err)
      // TODO: Afficher une notification d'erreur
    } finally {
      setSavingStudents(prev => {
        const newSet = new Set(prev)
        newSet.delete(studentId)
        return newSet
      })
    }
  }

  // Marquer tous les élèves présents
  const handleMarkAllPresent = async () => {
    if (!session) return

    const studentsToMark = students.filter(s => s.status !== 'present')
    if (studentsToMark.length === 0) return

    try {
      const records = studentsToMark.map(s => ({
        studentId: s.user_id,
        status: 'present' as AttendanceStatus,
      }))

      const response = await attendanceApi.bulkMarkAttendance(session.id, records)

      if (response.success) {
        await loadSession()
      }
    } catch (err) {
      console.error('Erreur marquage en masse:', err)
    }
  }

  // Fermer la session
  const handleCloseSession = async () => {
    if (!session) return

    try {
      setIsClosing(true)
      const response = await attendanceApi.closeSession(session.id)
      
      if (response.success) {
        setSession(prev => prev ? { ...prev, status: 'closed' } : null)
        setShowCloseDialog(false)
      }
    } catch (err) {
      console.error('Erreur fermeture session:', err)
    } finally {
      setIsClosing(false)
    }
  }

  // Filtrer les élèves
  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculer les stats
  const stats = {
    total: students.length,
    marked: students.filter(s => s.status !== null).length,
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
  }

  // Rendu loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement de la session...</span>
        </div>
      </div>
    )
  }

  // Rendu erreur
  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Erreur de chargement
          </h2>
          <p className="text-gray-600 mb-4">
            {error || 'Session introuvable'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => router.back()}>
              Retour
            </Button>
            <Button onClick={loadSession}>
              Réessayer
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* En-tête session */}
        <AttendanceSessionHeader
          session={session}
          onClose={() => setShowCloseDialog(true)}
          isClosing={isClosing}
        />

        {/* Barre d'outils */}
        <Card className="mt-6">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un élève..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Actions rapides */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleMarkAllPresent}
                  disabled={session.status !== 'open'}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Tous présents
                </Button>
              </div>
            </div>

            {/* Indicateur de progression */}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  <strong>{stats.marked}</strong> / {stats.total} marqués
                </span>
              </div>
              {stats.marked < stats.total && (
                <span className="text-orange-600">
                  {stats.total - stats.marked} élèves non marqués
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Liste des élèves - Desktop */}
        <Card className="mt-6 hidden md:block">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    #
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Élève
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Présence
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                    Statut
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <StudentRow
                    key={student.user_id}
                    student={student}
                    index={index}
                    onStatusChange={handleStatusChange}
                    disabled={session.status !== 'open'}
                    isUpdating={savingStudents.has(student.user_id)}
                  />
                ))}
              </tbody>
            </table>

            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                {searchQuery 
                  ? 'Aucun élève trouvé pour cette recherche'
                  : 'Aucun élève dans cette classe'
                }
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des élèves - Mobile */}
        <div className="mt-6 md:hidden space-y-3">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.user_id}
              student={student}
              onStatusChange={(studentId, status) => handleStatusChange(studentId, status)}
              disabled={session.status !== 'open'}
            />
          ))}
        </div>

        {/* Dialog de confirmation fermeture */}
        <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clôturer la session ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir clôturer cette session de présence ?
                {stats.marked < stats.total && (
                  <span className="block mt-2 text-orange-600 font-medium">
                    ⚠️ {stats.total - stats.marked} élèves n'ont pas encore été marqués.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCloseSession}
                disabled={isClosing}
              >
                {isClosing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Fermeture...
                  </>
                ) : (
                  'Clôturer'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}