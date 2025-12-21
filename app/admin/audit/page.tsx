import { Suspense } from "react"
import { AdminAuditClient } from "./AdminAuditClient"

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <AdminAuditClient />
    </Suspense>
  )
}
