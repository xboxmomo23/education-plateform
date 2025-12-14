"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageLoader } from "@/components/ui/page-loader"
import { AlertCircle, Users } from "lucide-react"
import { teacherClassesApi, type TeacherClassSummary } from "@/lib/api/teacher-classes"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

type FetchState = "idle" | "loading" | "error" | "success"

function formatDate(date?: string | null) {
  if (!date) return "—"
  try {
    return format(new Date(date), "dd MMM yyyy", { locale: fr })
  } catch {
    return "—"
  }
}

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<TeacherClassSummary[]>([])
  const [state, setState] = useState<FetchState>("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadClasses() {
      setState("loading")
      setError(null)
      try {
        const res = await teacherClassesApi.getSummary(controller.signal)
        setClasses(res.data ?? [])
        setState("success")
      } catch (err: any) {
        const isAbort =
          err?.name === "AbortError" ||
          (err instanceof DOMException && err.name === "AbortError") ||
          (typeof err?.message === "string" && err.message.toLowerCase().includes("aborted"))

        if (isAbort || controller.signal.aborted) {
          return
        }

        console.error("Erreur chargement classes professeur:", err)
        setError("Impossible de charger vos classes pour le moment.")
        setState("error")
      }
    }

    loadClasses()
    return () => controller.abort()
  }, [])

  const hasData = useMemo(() => classes.length > 0, [classes])

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Mes classes</h1>
          <p className="text-muted-foreground">
            Vue synthèse des classes que vous suivez avec vos indicateurs clés et actions rapides.
          </p>
        </div>

        {state === "loading" && <PageLoader label="Chargement de vos classes..." />}

        {state === "error" && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-6 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Erreur</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {state === "success" && !hasData && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Users className="mx-auto mb-4 h-10 w-10" />
              <p className="font-medium">Aucune classe assignée</p>
              <p className="text-sm">
                Vous n&apos;avez pas encore de classes associées. Contactez l&apos;administration si besoin.
              </p>
            </CardContent>
          </Card>
        )}

        {hasData && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((classe) => (
              <Card key={classe.class_id} className="flex h-full flex-col">
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{classe.class_label}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Dernier cours : {formatDate(classe.last_session_date)}
                      </p>
                    </div>
                    {classe.level && (
                      <Badge variant="outline" className="shrink-0">
                        {classe.level}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Effectif</dt>
                      <dd className="text-lg font-semibold">{classe.student_count}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Absents aujourd&apos;hui</dt>
                      <dd className="text-lg font-semibold text-destructive">
                        {classe.absent_today}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Retards aujourd&apos;hui</dt>
                      <dd className="text-lg font-semibold text-amber-600">
                        {classe.late_today}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Devoirs à corriger</dt>
                      <dd className="text-lg font-semibold text-primary">
                        {classe.pending_assignments}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/professeur/presence?classId=${classe.class_id}`}>
                        Faire l&apos;appel
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/professeur/notes?classId=${classe.class_id}`}>
                        Saisir une note
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/professeur/devoirs?classId=${classe.class_id}`}>
                        Voir devoirs
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled
                      title="Vue élèves en préparation"
                    >
                      Voir élèves
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
