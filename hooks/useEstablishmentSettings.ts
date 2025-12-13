"use client"

import { useEffect, useState } from "react"
import { establishmentApi, type EstablishmentSettings } from "@/lib/api/establishment"

type UseEstablishmentSettingsResult = {
  settings: EstablishmentSettings | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useEstablishmentSettings(): UseEstablishmentSettingsResult {
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    establishmentApi
      .getSettings()
      .then((response) => {
        if (!active) return
        if (response.success) {
          setSettings(response.data)
        } else {
          setError(response.error || "Erreur lors du chargement des paramètres établissement")
        }
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || "Erreur lors du chargement des paramètres établissement")
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [refreshKey])

  return {
    settings,
    loading,
    error,
    refresh: () => setRefreshKey((key) => key + 1),
  }
}
