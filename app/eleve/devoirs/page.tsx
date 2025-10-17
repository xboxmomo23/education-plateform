"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { getDevoirsByClass } from "@/lib/devoirs/api"
import type { Devoir } from "@/lib/devoirs/types"
import { DevoirCard } from "@/components/devoirs/DevoirCard"

export default function DevoirsPage() {
  const [devoirs, setDevoirs] = useState<Devoir[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDevoirs()
  }, [])

  const loadDevoirs = async () => {
    setIsLoading(true)
    try {
      // Assuming student is in class "1" (Terminale A)
      const data = await getDevoirsByClass("1")
      setDevoirs(data)
    } catch (error) {
      console.error("[v0] Error loading devoirs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDaysRemaining = (dueDate: string): number => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const stats = {
    total: devoirs.length,
    urgent: devoirs.filter((d) => d.priority === "high").length,
    thisWeek: devoirs.filter((d) => getDaysRemaining(d.dueDate) <= 7 && getDaysRemaining(d.dueDate) >= 0).length,
  }

  return (
    <DashboardLayout requiredRole="student">
      <div className="space-y-6">
        {/* En-tête de la page */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Devoirs</h2>
          <p className="text-muted-foreground">Liste de tous vos devoirs à rendre</p>
        </div>

        {/* Statistiques rapides */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total des devoirs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Urgents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.urgent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cette semaine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des devoirs */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Chargement...</CardContent>
            </Card>
          ) : devoirs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Aucun devoir pour le moment</CardContent>
            </Card>
          ) : (
            devoirs.map((devoir) => <DevoirCard key={devoir.id} devoir={devoir} variant="student" />)
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
