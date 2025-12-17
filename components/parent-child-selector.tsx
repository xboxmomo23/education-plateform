"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useParentChild } from "@/components/parent/ParentChildContext"
import { useEstablishmentSettings } from "@/hooks/useEstablishmentSettings"
import { useI18n } from "@/components/providers/i18n-provider"

export function ParentChildSelector() {
  const { parentChildren, selectedChildId, setSelectedChildId } = useParentChild()
  const { settings } = useEstablishmentSettings()
  const { t } = useI18n()

  const children = parentChildren ?? []
  const isEmpty = children.length === 0
  const hasSingleChild = children.length === 1
  const contactMessage = settings?.contactEmail
    ? t("parent.layout.childSelector.contactEmail", { email: settings.contactEmail })
    : t("parent.layout.childSelector.contactDefault")

  if (isEmpty) {
    return (
      <Alert>
        <AlertDescription>
          {t("parent.layout.childSelector.noChild", { contact: contactMessage })}
        </AlertDescription>
      </Alert>
    )
  }

  if (hasSingleChild) {
    const child = children[0]
    return (
      <div className="rounded-md border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {t("parent.layout.childSelector.singleChildLabel")}
        </p>
        <p className="text-base font-semibold">{child.full_name}</p>
        <p className="text-sm text-muted-foreground">
          {child.class_name
            ? t("parent.layout.childSelector.classLabel", { value: child.class_name })
            : child.student_number
              ? t("parent.layout.childSelector.studentNumber", { value: child.student_number })
              : null}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>{t("parent.layout.childSelector.selectLabel")}</Label>
      <Select value={selectedChildId ?? ""} onValueChange={(value) => setSelectedChildId(value)}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder={t("parent.layout.childSelector.selectPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {children.map((child) => (
            <SelectItem key={child.id} value={child.id}>
              <div className="flex flex-col gap-0.5">
                <span>{child.full_name}</span>
                {(child.class_name || child.student_number) && (
                  <span className="text-xs text-muted-foreground">
                    {child.class_name ?? child.student_number}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
