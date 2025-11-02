"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, AlertCircle, Calendar } from "lucide-react"

export default function DashboardResponsablePage() {
  return (
    <DashboardLayout requiredRole="staff">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue globale des classes et élèves</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Toutes les classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Élèves</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">324</div>
              <p className="text-xs text-muted-foreground">Élèves inscrits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absences Aujourd'hui</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Élèves absents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Devoirs à Venir</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">Cette semaine</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Classes Récentes</CardTitle>
              <CardDescription>Activité des classes cette semaine</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Terminale A", "Première B", "Seconde C"].map((classe) => (
                  <div key={classe} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{classe}</p>
                      <p className="text-sm text-muted-foreground">28 élèves</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">95% présence</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertes Récentes</CardTitle>
              <CardDescription>Notifications importantes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 border-b pb-3 last:border-0">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Absence répétée</p>
                    <p className="text-xs text-muted-foreground">Jean Dupont - 5 absences cette semaine</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 border-b pb-3 last:border-0">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Seuil disciplinaire atteint</p>
                    <p className="text-xs text-muted-foreground">Marie Martin - 20h d'absences injustifiées</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Modification emploi du temps</p>
                    <p className="text-xs text-muted-foreground">Terminale B - Semaine prochaine</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
