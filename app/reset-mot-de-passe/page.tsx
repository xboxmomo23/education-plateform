import { Suspense } from "react"
import { ResetPasswordClient } from "./ResetPasswordClient"

export default function ResetMotDePassePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <ResetPasswordClient />
    </Suspense>
  )
}
