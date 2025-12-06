import { LoginFormUpdated } from "@/components/login-form-updated"

export default function LoginElevePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginFormUpdated
        role="student"
        title="Connexion Élève"
        description="Connectez-vous à votre espace élève"
        redirectPath="/dashboard-eleve"
        firstLoginRedirectPath="/premiere-connexion"
      />
    </div>
  )
}
