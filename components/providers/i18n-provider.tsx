"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import fr from "@/locales/fr.json"
import en from "@/locales/en.json"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"

export type SupportedLocale = "fr" | "en"
type TranslationShape = typeof fr

const STORAGE_KEY = "edupilot_locale"

const dictionaries: Record<SupportedLocale, TranslationShape> = {
  fr,
  en,
}

type TranslationParams = Record<string, string | number>

type I18nContextValue = {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
  t: (key: string, params?: TranslationParams) => string
  translations: TranslationShape
  availableLocales: SupportedLocale[]
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return value === "fr" || value === "en"
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("fr")
  const [hasUserPreference, setHasUserPreference] = useState(false)
  const { settings } = useEstablishmentSettings()

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isSupportedLocale(stored)) {
      setLocaleState(stored)
      setHasUserPreference(true)
    }
  }, [])

  useEffect(() => {
    if (hasUserPreference) {
      return
    }
    const establishmentLocale = settings?.defaultLocale
    if (establishmentLocale && isSupportedLocale(establishmentLocale) && establishmentLocale !== locale) {
      setLocaleState(establishmentLocale)
    }
  }, [settings?.defaultLocale, hasUserPreference, locale])

  const persistLocale = useCallback((nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLocale)
    }
  }, [])

  const setLocale = useCallback(
    (nextLocale: SupportedLocale) => {
      setHasUserPreference(true)
      persistLocale(nextLocale)
    },
    [persistLocale]
  )

  const translate = useCallback(
    (key: string, params?: TranslationParams) => {
      const path = key.split(".")
      const currentDict = dictionaries[locale] ?? dictionaries.fr
      const fallbackDict = dictionaries.fr

      const resolveValue = (dict: TranslationShape) =>
        path.reduce<any>((acc, segment) => {
          if (acc && typeof acc === "object") {
            return acc[segment]
          }
          return undefined
        }, dict)

      let value = resolveValue(currentDict)
      if (typeof value === "undefined") {
        value = resolveValue(fallbackDict)
      }

      if (typeof value !== "string") {
        return key
      }

      if (!params) {
        return value
      }

      return value.replace(/{{(.*?)}}/g, (_, token: string) => {
        const trimmed = token.trim()
        return params[trimmed] !== undefined ? String(params[trimmed]) : ""
      })
    },
    [locale]
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: translate,
      translations: dictionaries[locale] ?? dictionaries.fr,
      availableLocales: ["fr", "en"],
    }),
    [locale, setLocale, translate]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
