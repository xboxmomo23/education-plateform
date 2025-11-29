// app/admin/subjects/page.tsx
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

// TODO: remplacer par /api/admin/subjects
const MOCK_SUBJECTS = [
  {
    id: "1",
    name: "Mathématiques",
    code: "MATH",
    level: "Collège / Lycée",
    isActive: true,
  },
  {
    id: "2",
    name: "Algorithmique",
    code: "ALGO",
    level: "Licence Informatique",
    isActive: true,
  },
]

export default async function AdminSubjectsPage() {
  const subjects = MOCK_SUBJECTS

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Matières</h1>
            <p className="text-muted-foreground">
              Gérez le catalogue des matières de l&apos;établissement.
            </p>
          </div>
          <Button>
            {/* TODO: modale création matière */}
            Ajouter une matière
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Liste des matières</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Niveau / Filière</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>{subject.code}</TableCell>
                    <TableCell>{subject.level}</TableCell>
                    <TableCell>
                      <Badge variant={subject.isActive ? "default" : "outline"}>
                        {subject.isActive ? "Active" : "Archivée"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                      <Button variant="ghost" size="sm">
                        Archiver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {subjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Aucune matière pour le moment.
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
