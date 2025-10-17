import { LoginForm } from "@/components/login-form"

export default function LoginProfesseurPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginForm
        role="teacher"
        title="Connexion Professeur"
        description="Connectez-vous à votre espace professeur"
        redirectPath="/dashboard-professeur"
      />
    </div>
  )
}
