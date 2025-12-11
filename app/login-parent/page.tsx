import { LoginFormUpdated } from "@/components/login-form-updated"
import { LoginRoleSwitcher } from "@/components/login-role-switcher"

export default function LoginParentPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <LoginRoleSwitcher activeRole="parent" />
        <LoginFormUpdated
          role="parent"
          title="Connexion parent"
          description="Connectez-vous à votre espace parent pour consulter les informations de vos enfants."
          redirectPath="/parent/dashboard"
        />
      </div>
    </div>
  )
}
