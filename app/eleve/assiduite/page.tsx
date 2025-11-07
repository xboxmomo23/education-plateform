"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api/client"
import { getUserSession } from "@/lib/auth-new"
import { AlertCircle, Check, X, Clock, Wifi, Home, UserX, Calendar, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

type AttendanceStatus = "present" | "absent" | "late" | "excused" | "remote" | "excluded"

interface AttendanceRecord {
  id: string
  status: AttendanceStatus
  late_minutes: number | null
  justification: string | null
  session_date: string
  scheduled_start: string
  scheduled_end: string
  subject_name: string
  class_label: string
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  remote: number
  excluded: number
  attendance_rate: number
}

export default function EleveAssiduiteP() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const user = getUserSession()

  useEffect(() => {
    if (user) {
      loadAttendanceHistory()
    }
  }, [user])

  const loadAttendanceHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      let url = `/attendance/students/${user?.id}/records`
      const params: string[] = []

      if (startDate) params.push(`startDate=${startDate}`)
      if (endDate) params.push(`endDate=${endDate}`)

      if (params.length > 0) {
        url += `?${params.join("&")}`
      }

      const response = await api.get(url)

      if (response.success) {
        setRecords(response.data.records || [])
        setStats(response.data.stats || null)
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
        <div>
          <h1 className="text-3xl font-bold">Mon assiduité</h1>
          <p className="text-muted-foreground">Consultez votre historique de présence</p>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taux de présence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-3xl font-bold">{stats.attendance_rate}%</span>
                </div>
                <Progress value={stats.attendance_rate} className="mt-2" />
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
                <p className="text-xs text-muted-foreground mt-1">Dont {stats.excused} excusées</p>
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

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle>Filtrer par période</CardTitle>
            <CardDescription>Sélectionnez une plage de dates pour filtrer l'historique</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Date de début</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="endDate">Date de fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex items-end gap-2">
                <Button onClick={loadAttendanceHistory} className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  Appliquer
                </Button>
                <Button
                  onClick={() => {
                    setStartDate("")
                    setEndDate("")
                    loadAttendanceHistory()
                  }}
                  variant="outline"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historique */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des présences</CardTitle>
            <CardDescription>{records.length} enregistrement(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
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
                <AlertDescription>Aucun enregistrement trouvé pour cette période</AlertDescription>
              </Alert>
            )}

            {!loading && records.length > 0 && (
              <div className="space-y-3">
                {records.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(record.status)}
                            <Badge className={getStatusColor(record.status)}>
                              {getStatusLabel(record.status)}
                            </Badge>
                            {record.status === "late" && record.late_minutes && (
                              <Badge variant="outline" className="text-yellow-600">
                                {record.late_minutes} min
                              </Badge>
                            )}
                          </div>

                          <h4 className="font-medium">{record.subject_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(record.session_date), "EEEE d MMMM yyyy", { locale: fr })} •{" "}
                            {record.scheduled_start} - {record.scheduled_end}
                          </p>

                          {record.justification && (
                            <div className="mt-2 p-2 bg-muted rounded-md">
                              <p className="text-sm text-muted-foreground">
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
            <CardTitle>Légende</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Présent : comptabilisé comme présence</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-600" />
                <span className="text-sm">Absent : absence non justifiée</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Retard : arrivée tardive</span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Excusé : absence justifiée</span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-purple-600" />
                <span className="text-sm">À distance : cours en ligne</span>
              </div>
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-gray-600" />
                <span className="text-sm">Exclu : exclusion temporaire</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}