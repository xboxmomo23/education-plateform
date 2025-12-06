import { LoginFormUpdated } from "@/components/login-form-updated"

export default function LoginSuperAdminPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginFormUpdated
        role="super_admin"
        title="Connexion Super Admin"
        description="Connectez-vous à l'interface de gestion de la plateforme"
        redirectPath="/super-admin"
        firstLoginRedirectPath="/premiere-connexion"
      />
    </div>
  )
}
