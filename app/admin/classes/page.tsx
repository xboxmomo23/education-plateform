// app/admin/classes/page.tsx
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

// TODO: remplacer par /api/admin/classes
const MOCK_CLASSES = [
  {
    id: "1",
    name: "1ère A",
    level: "1ère",
    capacity: 30,
    studentsCount: 28,
    room: "Salle 101",
    isActive: true,
  },
  {
    id: "2",
    name: "2ème B",
    level: "2ème",
    capacity: 32,
    studentsCount: 32,
    room: "Salle 203",
    isActive: true,
  },
]

export default async function AdminClassesPage() {
  const classes = MOCK_CLASSES

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
            <p className="text-muted-foreground">
              Créez et gérez les classes de l&apos;établissement.
            </p>
          </div>
          <Button>
            {/* TODO: ouvrir une modale pour créer une classe */}
            Créer une classe
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Liste des classes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Capacité</TableHead>
                  <TableHead>Élèves</TableHead>
                  <TableHead>Salle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classe) => (
                  <TableRow key={classe.id}>
                    <TableCell className="font-medium">{classe.name}</TableCell>
                    <TableCell>{classe.level}</TableCell>
                    <TableCell>{classe.capacity}</TableCell>
                    <TableCell>{classe.studentsCount}</TableCell>
                    <TableCell>{classe.room}</TableCell>
                    <TableCell>
                      <Badge variant={classe.isActive ? "default" : "outline"}>
                        {classe.isActive ? "Active" : "Archivée"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      {/* TODO: modale éditer / archiver */}
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                      <Button variant="ghost" size="sm">
                        Archiver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {classes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Aucune classe pour le moment.
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
