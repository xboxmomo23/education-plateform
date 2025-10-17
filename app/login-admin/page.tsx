import { LoginForm } from "@/components/login-form"

export default function LoginAdminPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginForm
        role="admin"
        title="Connexion Administrateur"
        description="Connectez-vous à votre espace administrateur"
        redirectPath="/dashboard-admin"
      />
    </div>
  )
}
