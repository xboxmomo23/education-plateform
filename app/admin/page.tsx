// app/admin/page.tsx
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// TODO: remplacer par des stats réelles de l'établissement (via /api/admin/stats)
const MOCK_STATS = {
  classes: 8,
  students: 240,
  teachers: 18,
  staff: 6,
}

export default function AdminEtablissementDashboardPage() {
  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Administration de l&apos;établissement
            </h1>
            <p className="text-muted-foreground">
              Gérez les classes, élèves, enseignants, staff et matières.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{MOCK_STATS.classes}</p>
              <Button variant="link" className="px-0" asChild>
                <Link href="/admin/classes">Gérer les classes</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Élèves</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{MOCK_STATS.students}</p>
              <Button variant="link" className="px-0" asChild>
                <Link href="/admin/students">Gérer les élèves</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Professeurs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{MOCK_STATS.teachers}</p>
              <Button variant="link" className="px-0" asChild>
                <Link href="/admin/teachers">Gérer les professeurs</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staff & Matières</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-bold">{MOCK_STATS.staff}</p>
              <div className="flex flex-col gap-1">
                <Button variant="link" className="px-0 justify-start" asChild>
                  <Link href="/admin/staff">Gérer le staff</Link>
                </Button>
                <Button variant="link" className="px-0 justify-start" asChild>
                  <Link href="/admin/subjects">Gérer les matières</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
