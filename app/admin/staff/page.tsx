// app/admin/staff/page.tsx
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

// TODO: remplacer par /api/admin/staff
const MOCK_STAFF = [
  {
    id: "1",
    fullName: "Mme Salima Vie scolaire",
    email: "salima.vs@example.com",
    roleLabel: "Vie scolaire",
    phone: "+213 555 000 333",
    isActive: true,
  },
  {
    id: "2",
    fullName: "M. Yassine Surveillant",
    email: "yassine.surv@example.com",
    roleLabel: "Surveillant",
    phone: "+213 555 000 444",
    isActive: true,
  },
]

export default async function AdminStaffPage() {
  const staff = MOCK_STAFF

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
            <p className="text-muted-foreground">
              Gérez les personnels administratifs, vie scolaire et autres rôles.
            </p>
          </div>
          <Button>
            {/* TODO: modale ajout staff (user + staff_profile) */}
            Ajouter un membre du staff
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Liste du staff</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.fullName}</TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell>{person.roleLabel}</TableCell>
                    <TableCell>{person.phone}</TableCell>
                    <TableCell>
                      <Badge variant={person.isActive ? "default" : "outline"}>
                        {person.isActive ? "Actif" : "Désactivé"}
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

                {staff.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Aucun personnel pour le moment.
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
