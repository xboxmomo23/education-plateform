"use client"

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

export function DemoBanner() {
  if (!isDemo) return null

  return (
    <div className="bg-amber-500 text-white text-center text-sm font-semibold py-2 tracking-wide">
      MODE DÉMO — Toutes les données sont fictives et les actions sont désactivées.
    </div>
  )
}
