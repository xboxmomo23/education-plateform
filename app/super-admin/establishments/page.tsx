// app/super-admin/establishments/page.tsx
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

// TODO: remplacer par un fetch vers /api/super-admin/establishments
const MOCK_ESTABLISHMENTS = [
  {
    id: "1",
    name: "Collège Demo 1",
    code: "COLL-D1",
    city: "Alger",
    type: "Collège",
    isActive: true,
  },
  {
    id: "2",
    name: "Lycée Privé El Ilm",
    code: "LYC-ILM",
    city: "Oran",
    type: "Lycée privé",
    isActive: false,
  },
]

export default async function SuperAdminEstablishmentsPage() {
  const establishments = MOCK_ESTABLISHMENTS

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Établissements
            </h1>
            <p className="text-muted-foreground">
              Gestion des écoles, collèges, lycées et universités.
            </p>
          </div>
          <Button>
            {/* TODO: ouvrir une modale de création */}
            Créer un établissement
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Liste des établissements</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {establishments.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell className="font-medium">{est.name}</TableCell>
                    <TableCell>{est.code}</TableCell>
                    <TableCell>{est.city}</TableCell>
                    <TableCell>{est.type}</TableCell>
                    <TableCell>
                      <Badge variant={est.isActive ? "default" : "outline"}>
                        {est.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      {/* TODO: modale d'édition + toggle actif/inactif */}
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                      <Button variant="ghost" size="sm">
                        Voir détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {establishments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Aucun établissement pour le moment.
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
