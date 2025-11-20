"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { attendanceApi, type AttendanceRecord, type AttendanceStats, type AttendanceStatus } from "@/lib/api/attendance"
import { getUserSession } from "@/lib/auth-new"
import { AlertCircle, Check, X, Clock, Wifi, Home, UserX, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function EleveAssiduitePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const user = getUserSession()

  useEffect(() => {
    if (user?.id) {
      loadAttendanceHistory()
    }
  }, [user])

  const loadAttendanceHistory = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      // Utiliser l'API avec les bons types
      const response = await attendanceApi.getStudentHistory(user.id, {
        limit: 50 // Limiter à 50 derniers enregistrements
      })

      if (response.success && response.data) {
        setRecords(response.data.records || [])
        setStats(response.data.stats || null)
      } else {
        setError(response.error || "Erreur lors du chargement")
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement de l'historique")
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return <Check className="h-4 w-4 text-green-600" />
      case "absent":
        return <X className="h-4 w-4 text-red-600" />
      case "late":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "excused":
        return <Home className="h-4 w-4 text-blue-600" />
      case "remote":
        return <Wifi className="h-4 w-4 text-purple-600" />
      case "excluded":
        return <UserX className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return "Présent"
      case "absent":
        return "Absent"
      case "late":
        return "Retard"
      case "excused":
        return "Excusé"
      case "remote":
        return "À distance"
      case "excluded":
        return "Exclu"
    }
  }

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 border-green-200"
      case "absent":
        return "bg-red-100 text-red-800 border-red-200"
      case "late":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "excused":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "remote":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "excluded":
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <DashboardLayout requiredRole="student">
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-3xl font-bold">Mon assiduité</h1>
          <p className="text-muted-foreground">Consultez votre historique de présence</p>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Taux de présence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-3xl font-bold">{stats.attendance_rate.toFixed(1)}%</span>
                </div>
                <Progress value={stats.attendance_rate} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Présences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-3xl font-bold text-green-600">{stats.present}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sur {stats.total} cours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Absences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <X className="h-5 w-5 text-red-600" />
                  <span className="text-3xl font-bold text-red-600">{stats.absent}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dont {stats.excused} excusée{stats.excused > 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Retards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="text-3xl font-bold text-yellow-600">{stats.late}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sur {stats.total} cours</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Historique */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des présences</CardTitle>
            <CardDescription>
              {loading ? "Chargement..." : `${records.length} enregistrement(s) - 50 derniers cours`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Chargement de votre historique...</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!loading && records.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Aucun enregistrement de présence trouvé</AlertDescription>
              </Alert>
            )}

            {!loading && records.length > 0 && (
              <div className="space-y-3">
                {records.map((record) => (
                  <Card key={record.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Statut */}
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(record.status)}
                            <Badge className={getStatusColor(record.status)}>
                              {getStatusLabel(record.status)}
                            </Badge>
                            {record.status === "late" && record.late_minutes && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                {record.late_minutes} min de retard
                              </Badge>
                            )}
                          </div>

                          {/* Informations du cours */}
                          <h4 className="font-medium text-base">{record.subject_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {record.session_date &&
                              format(new Date(record.session_date), "EEEE d MMMM yyyy", {
                                locale: fr,
                              })}{" "}
                            • {record.scheduled_start} - {record.scheduled_end}
                          </p>

                          {/* Classe */}
                          {record.class_label && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {record.class_label}
                            </Badge>
                          )}

                          {/* Justification */}
                          {record.justification && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <p className="text-sm text-blue-900">
                                <strong>Justification :</strong> {record.justification}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Légende */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Légende des statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  <strong>Présent</strong> : Comptabilisé comme présence
                </span>
              </div>
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-600" />
                <span className="text-sm">
                  <strong>Absent</strong> : Absence non justifiée
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">
                  <strong>Retard</strong> : Arrivée tardive
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  <strong>Excusé</strong> : Absence justifiée
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-purple-600" />
                <span className="text-sm">
                  <strong>À distance</strong> : Cours en ligne
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-gray-600" />
                <span className="text-sm">
                  <strong>Exclu</strong> : Exclusion temporaire
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}