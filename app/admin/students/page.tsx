// app/admin/students/page.tsx
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

// TODO: remplacer par /api/admin/students
const MOCK_STUDENTS = [
  {
    id: "1",
    fullName: "Ali Ben Demo",
    email: "ali.ben@example.com",
    className: "1ère A",
    isActive: true,
  },
  {
    id: "2",
    fullName: "Sara El Test",
    email: "sara.test@example.com",
    className: "2ème B",
    isActive: false,
  },
]

export default async function AdminStudentsPage() {
  const students = MOCK_STUDENTS

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Élèves</h1>
            <p className="text-muted-foreground">
              Créez et gérez les comptes élèves et leur classe.
            </p>
          </div>
          <Button>
            {/* TODO: modale ajout élève (user + profil + classe) */}
            Ajouter un élève
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Liste des élèves</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.fullName}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.className}</TableCell>
                    <TableCell>
                      <Badge variant={student.isActive ? "default" : "outline"}>
                        {student.isActive ? "Actif" : "Désactivé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                      <Button variant="ghost" size="sm">
                        Changer de classe
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Aucun élève pour le moment.
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
