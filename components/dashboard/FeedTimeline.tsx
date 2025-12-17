"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  AlertCircle, 
  Calendar, 
  Mail, 
  BarChart, 
  File,
  ChevronRight,
  Clock
} from "lucide-react"
import Link from "next/link"
import { FeedEvent, FeedEventType, formatRelativeDate } from "@/lib/api/dashboard"
import { useI18n } from "@/components/providers/i18n-provider"

interface FeedTimelineProps {
  events: FeedEvent[]
  title?: string
  emptyMessage?: string
  maxItems?: number
  showViewAll?: boolean
  viewAllLink?: string
}

const eventTypeConfig: Record<FeedEventType, {
  icon: typeof FileText
  color: string
  bgColor: string
  labelKey: string
}> = {
  devoir: {
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    labelKey: 'student.dashboard.feed.labels.assignment',
  },
  absence: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    labelKey: 'student.dashboard.feed.labels.absence',
  },
  planning: {
    icon: Calendar,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    labelKey: 'student.dashboard.feed.labels.planning',
  },
  message: {
    icon: Mail,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    labelKey: 'student.dashboard.feed.labels.message',
  },
  note: {
    icon: BarChart,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    labelKey: 'student.dashboard.feed.labels.grade',
  },
  document: {
    icon: File,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    labelKey: 'student.dashboard.feed.labels.document',
  },
}

export function FeedTimeline({
  events,
  title,
  emptyMessage,
  maxItems = 10,
  showViewAll = false,
  viewAllLink = "#",
}: FeedTimelineProps) {
  const { t, locale } = useI18n()
  const displayedEvents = events.slice(0, maxItems)
  const resolvedTitle = title ?? t("student.dashboard.feed.title")
  const resolvedEmptyMessage = emptyMessage ?? t("student.dashboard.feed.empty")

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {resolvedTitle}
          </CardTitle>
          {showViewAll && events.length > 0 && (
            <Link 
              href={viewAllLink}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {t("student.dashboard.feed.viewAll")}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{resolvedEmptyMessage}</p>
          </div>
        ) : (
          <div className="relative">
            {/* Ligne verticale de la timeline */}
            <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-4">
              {displayedEvents.map((event, index) => (
                <TimelineItem 
                  key={event.id} 
                  event={event} 
                  isLast={index === displayedEvents.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TimelineItemProps {
  event: FeedEvent
  isLast: boolean
}

function TimelineItem({ event, isLast }: TimelineItemProps) {
  const { t, locale } = useI18n()
  const config = eventTypeConfig[event.type]
  const Icon = config.icon

  const content = (
    <div className="flex gap-3 group">
      {/* Icône */}
      <div 
        className={`
          relative z-10 flex-shrink-0 p-2 rounded-full 
          ${config.bgColor}
          transition-transform group-hover:scale-110
        `}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
          {/* Badge type + matière */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="secondary" className="text-xs font-normal">
              {t(config.labelKey)}
            </Badge>
              {event.metadata?.subjectName && (
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.metadata.subjectColor || '#666' }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {event.metadata.subjectName}
                  </span>
                </div>
              )}
            </div>

            {/* Titre */}
            <h4 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {event.title}
            </h4>

            {/* Description */}
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {event.description}
              </p>
            )}

            {/* Métadonnées additionnelles */}
            {(event.metadata?.className || event.metadata?.senderName) && (
              <p className="text-xs text-muted-foreground mt-1">
                {event.metadata.className && (
                  <span>{event.metadata.className}</span>
                )}
                {event.metadata.className && event.metadata.senderName && ' • '}
                {event.metadata.senderName && (
                  <span>{t("student.dashboard.feed.from", { name: event.metadata.senderName })}</span>
                )}
              </p>
            )}
          </div>

          {/* Date */}
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatRelativeDate(event.date, locale)}
          </span>
        </div>
      </div>
    </div>
  )

  if (event.link) {
    return (
      <Link 
        href={event.link} 
        className="block hover:bg-accent/50 -mx-2 px-2 py-1 rounded-lg transition-colors"
      >
        {content}
      </Link>
    )
  }

  return content
}

// =========================
// Timeline compacte
// =========================

interface CompactTimelineProps {
  events: FeedEvent[]
  maxItems?: number
}

export function CompactTimeline({ events, maxItems = 5 }: CompactTimelineProps) {
  const displayedEvents = events.slice(0, maxItems)

  if (displayedEvents.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Aucune actualité récente
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayedEvents.map((event) => {
        const config = eventTypeConfig[event.type]
        const Icon = config.icon

        return (
          <div key={event.id} className="flex items-start gap-3">
            <div className={`p-1.5 rounded-md ${config.bgColor}`}>
              <Icon className={`h-3 w-3 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{event.title}</p>
              <p className="text-xs text-muted-foreground">
            {formatRelativeDate(event.date, locale)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
