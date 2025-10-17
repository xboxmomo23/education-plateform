import { LoginForm } from "@/components/login-form"

export default function LoginElevePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginForm
        role="student"
        title="Connexion Élève"
        description="Connectez-vous à votre espace élève"
        redirectPath="/dashboard-eleve"
      />
    </div>
  )
}
