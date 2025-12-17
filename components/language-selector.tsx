"use client"

import { Globe } from "lucide-react"
import { useCallback } from "react"
import { useI18n, type SupportedLocale } from "@/components/providers/i18n-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type LanguageSelectorProps = {
  className?: string
  compact?: boolean
}

export function LanguageSelector({ className, compact = false }: LanguageSelectorProps) {
  const { locale, setLocale, translations, t } = useI18n()

  const handleChange = useCallback(
    (value: SupportedLocale) => {
      setLocale(value)
    },
    [setLocale]
  )

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {!compact && (
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {t("language.label")}
        </span>
      )}
      <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Select value={locale} onValueChange={(value) => handleChange(value as SupportedLocale)}>
        <SelectTrigger className={cn("w-[140px]", compact && "h-8 text-xs")}>
          <SelectValue placeholder={t("language.label")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fr">{translations.language.fr}</SelectItem>
          <SelectItem value="en">{translations.language.en}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
