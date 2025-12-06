"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { resetPasswordWithToken } from "@/lib/auth-new"

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/

export default function ResetMotDePassePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isTokenMissing = useMemo(() => !token, [token])

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

    const validationError = validatePasswords()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    const response = await resetPasswordWithToken(token, newPassword)
    setIsSubmitting(false)

    if (response.success) {
      setSuccess(true)
    } else {
      setError(response.error || "Lien de réinitialisation invalide ou expiré")
    }
  }

  if (isTokenMissing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>Le lien de réinitialisation fourni n'est pas valide.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Token manquant. Veuillez relancer la procédure.</AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Réinitialisation du mot de passe</CardTitle>
          <CardDescription>Définissez un nouveau mot de passe sécurisé.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Mot de passe mis à jour. Vous pouvez maintenant vous connecter.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
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
                disabled={isSubmitting || success}
                required
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
                disabled={isSubmitting || success}
                required
              />
            </div>

            <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="font-semibold mb-2">Votre mot de passe doit contenir :</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Au moins 12 caractères</li>
                <li>Au moins une lettre majuscule</li>
                <li>Au moins un chiffre</li>
                <li>Au moins un caractère spécial</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || success}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                "Mettre à jour mon mot de passe"
              )}
            </Button>
          </form>

          {success && (
            <div className="mt-6 text-center">
              <Button asChild variant="outline">
                <Link href="/login-eleve">Retour à la page de connexion</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
