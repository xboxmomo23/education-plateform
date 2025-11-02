import { LoginFormUpdated } from "@/components/login-form" // ✅
export default function LoginResponsablePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LoginFormUpdated
        role="staff"
        title="Connexion staff"
        description="Connectez-vous à votre espace staff des classes"
        redirectPath="/dashboard-staff"
      />
    </div>
  )
}
