"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBgColor?: string
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
  onClick?: () => void
  className?: string
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  trend,
  onClick,
  className = "",
}: KpiCardProps) {
  const CardWrapper = onClick ? "button" : "div"
  
  return (
    <Card 
      className={`
        relative overflow-hidden transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Titre */}
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            
            {/* Valeur principale */}
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                {value}
              </span>
              
              {/* Trend indicator */}
              {trend && (
                <span 
                  className={`
                    text-xs font-medium px-1.5 py-0.5 rounded-full
                    ${trend.isPositive 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }
                  `}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            
            {/* Sous-titre */}
            {subtitle && (
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Icône */}
          <div 
            className={`
              flex-shrink-0 ml-4 p-2.5 sm:p-3 rounded-xl
              ${iconBgColor}
            `}
          >
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =========================
// Variantes prédéfinies
// =========================

interface KpiCardVariantProps extends Omit<KpiCardProps, 'icon' | 'iconColor' | 'iconBgColor'> {
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  icon: LucideIcon
}

const variantStyles = {
  primary: {
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  success: {
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  warning: {
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  danger: {
    iconColor: 'text-red-600 dark:text-red-400',
    iconBgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  info: {
    iconColor: 'text-violet-600 dark:text-violet-400',
    iconBgColor: 'bg-violet-100 dark:bg-violet-900/30',
  },
}

export function KpiCardVariant({ variant, ...props }: KpiCardVariantProps) {
  const styles = variantStyles[variant]
  return <KpiCard {...props} iconColor={styles.iconColor} iconBgColor={styles.iconBgColor} />
}