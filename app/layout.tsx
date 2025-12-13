import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AppProviders } from "@/components/providers/app-providers"
import { DemoBanner } from "@/components/demo/demo-banner"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Plateforme Éducative",
  description: "Système de gestion éducative avec espaces élève, professeur et administrateur",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <DemoBanner />
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  )
}
