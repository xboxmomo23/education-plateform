import { LoginFormUpdated } from "@/components/login-form-updated"

export default function LoginAdminEcolePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginFormUpdated
        role="admin"
        title="Connexion Admin Établissement"
        description="Connectez-vous à l'espace administrateur de votre établissement"
        redirectPath="/admin"
      />
    </div>
  )
}
