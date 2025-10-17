"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authenticateUser, type UserRole } from "@/lib/auth-new"
import { Loader2, AlertCircle } from "lucide-react"

interface LoginFormProps {
  role: UserRole
  title: string
  description: string
  redirectPath: string
}

export function LoginFormUpdated({ role, title, description, redirectPath }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await authenticateUser(email, password)

      if (result.success && result.user) {
        if (result.user.role !== role) {
          setError(`Ce compte n'est pas un compte ${getRoleLabel(role)}`)
          setIsLoading(false)
          return
        }

        router.push(redirectPath)
      } else {
        setError(result.error || "Échec de la connexion")
        setIsLoading(false)
      }
    } catch (err) {
      setError("Erreur de connexion au serveur")
      setIsLoading(false)
    }
  }

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case "student": return "élève"
      case "teacher": return "professeur"
      case "responsable": return "responsable"
      case "admin": return "administrateur"
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </Button>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 rounded-lg bg-muted p-3 text-xs">
              <p className="font-semibold mb-1">Comptes de test :</p>
              <p>• {role === "student" && "eleve@example.com / eleve123"}</p>
              <p>• {role === "teacher" && "prof@example.com / prof123"}</p>
              <p>• {role === "responsable" && "responsable1@test.com / 123456"}</p>
              <p>• {role === "admin" && "admin@example.com / admin123"}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}