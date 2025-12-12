"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, LogOut } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { acceptInvite, changePassword, clearUserSession, getUserSession, type User, type UserRole } from "@/lib/auth-new"

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/

const roleRedirectMap: Record<UserRole, string> = {
  student: "/dashboard-eleve",
  teacher: "/dashboard-professeur",
  staff: "/dashboard-staff",
  admin: "/admin",
  parent: "/parent/dashboard",
  super_admin: "/super-admin",
}

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
)

const PasswordRequirements = () => (
  <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
    <p className="mb-2 font-semibold">Votre mot de passe doit contenir :</p>
    <ul className="list-disc space-y-1 pl-4">
      <li>Au moins 12 caractères</li>
      <li>Au moins une lettre majuscule</li>
      <li>Au moins un chiffre</li>
      <li>Au moins un caractère spécial</li>
    </ul>
  </div>
)

export default function PremiereConnexionPage() {
  const searchParams = useSearchParams()
  const inviteToken = (searchParams.get("invite") || "").trim()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return <LoadingScreen />
  }

  if (inviteToken.length > 0) {
    return <InviteActivationView inviteToken={inviteToken} />
  }

  return <LegacyFirstLoginView />
}

function usePasswordValidation(newPassword: string, confirmPassword: string) {
  return useCallback((): string | null => {
    if (!PASSWORD_REGEX.test(newPassword)) {
      return "Le mot de passe doit contenir 12 caractères, une majuscule, un chiffre et un caractère spécial."
    }

    if (newPassword !== confirmPassword) {
      return "Les mots de passe ne correspondent pas."
    }

    return null
  }, [newPassword, confirmPassword])
}

function InviteActivationView({ inviteToken }: { inviteToken: string }) {
  const router = useRouter()
  const [existingSessionUser, setExistingSessionUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClearingSession, setIsClearingSession] = useState(false)
  const validatePasswords = usePasswordValidation(newPassword, confirmPassword)

  useEffect(() => {
    const sessionUser = getUserSession()
    setExistingSessionUser(sessionUser)
  }, [])

  const handleLogoutAndContinue = async () => {
    try {
      setIsClearingSession(true)
      await clearUserSession()
      setExistingSessionUser(null)
    } finally {
      setIsClearingSession(false)
    }
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
    const result = await acceptInvite(inviteToken, newPassword)
    setIsSubmitting(false)

    if (!result.success || !result.user) {
      setError(result.error || "Lien d'activation invalide ou expiré.")
      return
    }

    setSuccess("Compte activé avec succès. Redirection en cours...")
    router.replace(roleRedirectMap[result.user.role] || "/")
  }

  if (existingSessionUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Activation du compte</CardTitle>
            <CardDescription>
              Vous êtes connecté en tant que {existingSessionUser.full_name}. Déconnectez-vous ou utilisez une navigation privée pour activer cette invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cette invitation concerne un autre utilisateur. Déconnectez-vous pour continuer l'activation.
              </AlertDescription>
            </Alert>
            <Button className="w-full" onClick={handleLogoutAndContinue} disabled={isClearingSession}>
              {isClearingSession ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Déconnexion...
                </>
              ) : (
                "Se déconnecter et continuer"
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.replace(roleRedirectMap[existingSessionUser.role] || "/")}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Retourner sur mon espace
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Activation du compte</CardTitle>
          <CardDescription>Définissez votre mot de passe pour accéder à votre espace.</CardDescription>
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
              <Label htmlFor="invite-new-password">Nouveau mot de passe</Label>
              <Input
                id="invite-new-password"
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
              <Label htmlFor="invite-confirm-password">Confirmation</Label>
              <Input
                id="invite-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
                disabled={isSubmitting}
              />
            </div>

            <PasswordRequirements />

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

function LegacyFirstLoginView() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const validatePasswords = usePasswordValidation(newPassword, confirmPassword)

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
    return <LoadingScreen />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Première connexion</CardTitle>
          <CardDescription>
            Bonjour {user.full_name || ""}, définissez votre mot de passe définitif pour accéder à votre espace.
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
              <Label htmlFor="legacy-new-password">Nouveau mot de passe</Label>
              <Input
                id="legacy-new-password"
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
              <Label htmlFor="legacy-confirm-password">Confirmation</Label>
              <Input
                id="legacy-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
                disabled={isSubmitting}
              />
            </div>

            <PasswordRequirements />

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
