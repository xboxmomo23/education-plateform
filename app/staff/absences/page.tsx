import { Suspense } from "react"
import { StaffAbsencesClient } from "./StaffAbsencesClient"

export default function StaffAbsencesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <StaffAbsencesClient />
    </Suspense>
  )
}
