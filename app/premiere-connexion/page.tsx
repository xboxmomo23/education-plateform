"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { changePassword, getUserSession, type User, type UserRole } from "@/lib/auth-new"

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/

const roleRedirectMap: Record<UserRole, string> = {
  student: "/dashboard-eleve",
  teacher: "/dashboard-professeur",
  staff: "/dashboard-staff",
  admin: "/admin",
  super_admin: "/super-admin",
}

export default function PremiereConnexionPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const sessionUser = getUserSession()
    if (!sessionUser) {
      router.replace("/login-eleve")
      return
    }
    setUser(sessionUser)
  }, [router])

  const dashboardPath = useMemo(() => {
    if (!user) return "/"
    return roleRedirectMap[user.role] || "/"
  }, [user])

  const validatePasswords = (): string | null => {
    if (!PASSWORD_REGEX.test(newPassword)) {
      return "Le mot de passe doit contenir 12 caractères, une majuscule, un chiffre et un caractère spécial."
    }

    if (newPassword !== confirmPassword) {
      return "Les mots de passe ne correspondent pas."
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const validationError = validatePasswords()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    const result = await changePassword({ newPassword })
    setIsSubmitting(false)

    if (!result.success || !result.user) {
      setError(result.error || "Impossible de mettre à jour le mot de passe.")
      return
    }

    setSuccess("Mot de passe mis à jour avec succès. Redirection en cours...")
    router.replace(roleRedirectMap[result.user.role] || dashboardPath)
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Première connexion</CardTitle>
          <CardDescription>
            Bonjour {user.full_name}, définissez votre mot de passe définitif pour accéder à votre espace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmation</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="font-semibold mb-2">Votre mot de passe doit contenir :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Au moins 12 caractères</li>
                <li>Au moins une lettre majuscule</li>
                <li>Au moins un chiffre</li>
                <li>Au moins un caractère spécial</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Définir mon mot de passe"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
