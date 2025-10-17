import { LoginForm } from "@/components/login-form"

export default function LoginResponsablePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginForm
        role="responsable"
        title="Connexion Responsable"
        description="Connectez-vous à votre espace responsable des classes"
        redirectPath="/dashboard-responsable"
      />
    </div>
  )
}
