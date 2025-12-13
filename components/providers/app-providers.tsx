"use client"

import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
