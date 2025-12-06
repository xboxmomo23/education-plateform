import { LoginFormUpdated } from "@/components/login-form-updated"
export default function LoginProfesseurPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginFormUpdated
        role="teacher"
        title="Connexion Professeur"
        description="Connectez-vous à votre espace professeur"
        redirectPath="/dashboard-professeur"
        firstLoginRedirectPath="/premiere-connexion"
      />
    </div>
  )
}
