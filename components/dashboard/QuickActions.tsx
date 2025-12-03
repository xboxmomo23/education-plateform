"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Zap,
  LucideIcon
} from "lucide-react"
import Link from "next/link"

// =========================
// TYPES
// =========================

interface QuickAction {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  onClick?: () => void
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  color?: string
  bgColor?: string
}

// =========================
// GRILLE D'ACTIONS
// =========================

interface QuickActionsGridProps {
  actions: QuickAction[]
  title?: string
  columns?: 2 | 3 | 4
}

export function QuickActionsGrid({
  actions,
  title = "Actions rapides",
  columns = 2,
}: QuickActionsGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid ${gridCols[columns]} gap-3`}>
          {actions.map((action) => (
            <QuickActionButton key={action.id} action={action} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface QuickActionButtonProps {
  action: QuickAction
}

function QuickActionButton({ action }: QuickActionButtonProps) {
  const Icon = action.icon

  const buttonContent = (
    <Button
      variant={action.variant || 'outline'}
      className={`
        w-full h-auto py-4 flex-col gap-2
        hover:scale-[1.02] active:scale-[0.98] transition-all
        ${action.bgColor || ''}
      `}
      onClick={action.onClick}
    >
      <Icon className={`h-5 w-5 ${action.color || ''}`} />
      <span className="text-xs font-medium">{action.label}</span>
    </Button>
  )

  if (action.href) {
    return (
      <Link href={action.href}>
        {buttonContent}
      </Link>
    )
  }

  return buttonContent
}

// =========================
// LISTE VERTICALE D'ACTIONS
// =========================

interface QuickActionsListProps {
  actions: QuickAction[]
  title?: string
}

export function QuickActionsList({
  actions,
  title = "Raccourcis",
}: QuickActionsListProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map((action) => {
            const Icon = action.icon
            
            const content = (
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3 hover:bg-accent"
                onClick={action.onClick}
              >
                <div className={`p-2 rounded-lg mr-3 ${action.bgColor || 'bg-primary/10'}`}>
                  <Icon className={`h-4 w-4 ${action.color || 'text-primary'}`} />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            )

            if (action.href) {
              return (
                <Link key={action.id} href={action.href} className="block">
                  {content}
                </Link>
              )
            }

            return <div key={action.id}>{content}</div>
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// =========================
// ACTIONS COMPACTES (INLINE)
// =========================

interface InlineActionsProps {
  actions: QuickAction[]
}

export function InlineActions({ actions }: InlineActionsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {actions.map((action) => {
        const Icon = action.icon
        
        const content = (
          <Button
            key={action.id}
            variant={action.variant || 'outline'}
            size="sm"
            className="h-8"
            onClick={action.onClick}
          >
            <Icon className={`h-3 w-3 mr-1.5 ${action.color || ''}`} />
            {action.label}
          </Button>
        )

        if (action.href) {
          return (
            <Link key={action.id} href={action.href}>
              {content}
            </Link>
          )
        }

        return content
      })}
    </div>
  )
}