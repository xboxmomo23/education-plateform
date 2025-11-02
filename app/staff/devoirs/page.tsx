"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Construction } from "lucide-react"

export default function ResponsableDevoirsPage() {
  return (
    <DashboardLayout requiredRole="staff">
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <Construction className="h-16 w-16 text-muted-foreground" />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Page en construction</CardTitle>
            <CardDescription>La page Devoirs sera bientôt disponible</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cette page permettra de voir tous les devoirs déposés par les professeurs.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
