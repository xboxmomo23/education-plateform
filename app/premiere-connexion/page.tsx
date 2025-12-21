import { Suspense } from "react"
import { PremiereConnexionClient } from "./PremiereConnexionClient"

export default function PremiereConnexionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <PremiereConnexionClient />
    </Suspense>
  )
}
