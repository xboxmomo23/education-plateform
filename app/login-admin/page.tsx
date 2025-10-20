import { LoginFormUpdated } from "@/components/login-form-updated" // ✅

export default function LoginAdminPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginFormUpdated 
        role="admin"
        title="Connexion Administrateur"
        description="Connectez-vous à votre espace administrateur"
        redirectPath="/dashboard-admin"
      />
    </div>
  )
}
