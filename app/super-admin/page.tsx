// app/super-admin/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SuperAdminDashboardPage() {
  // TODO: remplacer par des stats réelles via fetch / api
  const stats = {
    totalEstablishments: 5,
    activeEstablishments: 4,
    totalSchoolAdmins: 7,
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
            <p className="text-muted-foreground">
              Interface de gestion globale de la plateforme.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/super-admin/establishments">
                Gérer les établissements
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/super-admin/school-admins">
                Gérer les admins d&apos;école
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Établissements total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalEstablishments}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Établissements actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.activeEstablishments}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admins d&apos;école</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalSchoolAdmins}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
