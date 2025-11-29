// app/admin/teachers/page.tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// TODO: remplacer par /api/admin/teachers
const MOCK_TEACHERS = [
  {
    id: "1",
    fullName: "M. Karim Prof Demo",
    email: "karim.prof@example.com",
    phone: "+213 555 000 111",
    mainSubject: "Mathématiques",
    isActive: true,
  },
  {
    id: "2",
    fullName: "Mme Nadia Test",
    email: "nadia.test@example.com",
    phone: "+213 555 000 222",
    mainSubject: "Français",
    isActive: true,
  },
]

export default async function AdminTeachersPage() {
  const teachers = MOCK_TEACHERS

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Professeurs</h1>
            <p className="text-muted-foreground">
              Créez et gérez les comptes enseignants de l&apos;établissement.
            </p>
          </div>
          <Button>
            {/* TODO: modale ajout professeur (user + teacher_profile) */}
            Ajouter un professeur
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Liste des professeurs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Matière principale</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.fullName}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.phone}</TableCell>
                    <TableCell>{teacher.mainSubject}</TableCell>
                    <TableCell>
                      <Badge variant={teacher.isActive ? "default" : "outline"}>
                        {teacher.isActive ? "Actif" : "Désactivé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                      <Button variant="ghost" size="sm">
                        Désactiver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {teachers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Aucun professeur pour le moment.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Button variant="ghost" asChild>
          <Link href="/admin">← Retour au dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
