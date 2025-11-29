// app/super-admin/school-admins/page.tsx
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

// TODO: remplacer par un fetch vers /api/super-admin/school-admins
const MOCK_SCHOOL_ADMINS = [
  {
    id: "1",
    name: "Admin Collège Demo",
    email: "admin.college@example.com",
    establishmentName: "Collège Demo 1",
    isActive: true,
  },
  {
    id: "2",
    name: "Admin Lycée El Ilm",
    email: "admin.lycee@example.com",
    establishmentName: "Lycée Privé El Ilm",
    isActive: true,
  },
]

export default async function SuperAdminSchoolAdminsPage() {
  const admins = MOCK_SCHOOL_ADMINS

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Admins d&apos;école
            </h1>
            <p className="text-muted-foreground">
              Gestion des comptes administrateurs pour chaque établissement.
            </p>
          </div>
          <Button>
            {/* TODO: ouvrir une modale pour créer un admin d'école */}
            Créer un admin d&apos;école
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Liste des admins d&apos;école</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.establishmentName}</TableCell>
                    <TableCell>
                      <Badge variant={admin.isActive ? "default" : "outline"}>
                        {admin.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      {/* TODO: modale d'édition / reset mot de passe / désactivation */}
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                      <Button variant="ghost" size="sm">
                        Désactiver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Aucun admin d&apos;école pour le moment.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Button variant="ghost" asChild>
          <Link href="/super-admin">← Retour au tableau de bord</Link>
        </Button>
      </div>
    </div>
  )
}
