"use client"

import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"
import { I18nProvider } from "@/components/providers/i18n-provider"

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <I18nProvider>
      {children}
      <Toaster />
    </I18nProvider>
  )
}
