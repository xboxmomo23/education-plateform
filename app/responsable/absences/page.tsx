"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Construction } from "lucide-react"

export default function ResponsableAbsencesPage() {
  return (
    <DashboardLayout requiredRole="responsable">
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <Construction className="h-16 w-16 text-muted-foreground" />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Page en construction</CardTitle>
            <CardDescription>La page Absences sera bientôt disponible</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cette page permettra de voir les absences et exclusions, ainsi que le total d'heures manquées.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
