"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.push("/login-eleve")
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">Redirection...</div>
    </div>
  )
}
