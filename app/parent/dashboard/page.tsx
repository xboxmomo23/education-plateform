"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/useAuth"

export default function ParentDashboardPage() {
  const { parentChildren, fullName } = useAuth()
  const hasChildren = Boolean(parentChildren && parentChildren.length > 0)
  const primaryChild = hasChildren ? parentChildren![0] : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Tableau de bord parent</h2>
        <p className="text-muted-foreground">Bienvenue {fullName ?? "parent"}.</p>
      </div>

      {!hasChildren ? (
        <Alert>
          <AlertDescription>
            Aucun enfant n’est associé à ce compte. Contactez l&apos;administration de l&apos;établissement si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Enfant suivi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{primaryChild?.full_name}</p>
                {primaryChild?.student_number && (
                  <p className="text-sm text-muted-foreground">Numéro d&apos;élève : {primaryChild.student_number}</p>
                )}
                {primaryChild?.class_name && (
                  <p className="text-sm text-muted-foreground">Classe : {primaryChild.class_name}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Dernières notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Cette section sera remplie bientôt.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Devoirs à venir</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Cette section sera remplie bientôt.
              </CardContent>
            </Card>
            <Card className="md:col-span-2 xl:col-span-1">
              <CardHeader>
                <CardTitle>Prochaines séances</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Cette section sera remplie bientôt.
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
