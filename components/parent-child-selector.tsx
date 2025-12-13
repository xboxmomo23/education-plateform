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

export function ParentChildSelector() {
  const { parentChildren, selectedChildId, setSelectedChildId } = useParentChild()

  const children = parentChildren ?? []
  const isEmpty = children.length === 0
  const hasSingleChild = children.length === 1

  if (isEmpty) {
    return (
      <Alert>
        <AlertDescription>
          Aucun enfant associé à ce compte. Contactez l&apos;administration si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </AlertDescription>
      </Alert>
    )
  }

  if (hasSingleChild) {
    const child = children[0]
    return (
      <div className="rounded-md border bg-card p-4">
        <p className="text-sm text-muted-foreground">Enfant associé</p>
        <p className="text-base font-semibold">{child.full_name}</p>
        <p className="text-sm text-muted-foreground">
          {child.class_name ? `Classe ${child.class_name}` : child.student_number ? `N° ${child.student_number}` : null}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Choisir un enfant</Label>
      <Select value={selectedChildId ?? ""} onValueChange={(value) => setSelectedChildId(value)}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Sélectionnez un enfant" />
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
