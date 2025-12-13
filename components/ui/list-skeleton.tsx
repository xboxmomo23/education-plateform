import { cn } from "@/lib/utils"

type ListSkeletonProps = {
  rows?: number
  className?: string
  rowClassName?: string
}

export function ListSkeleton({ rows = 5, className, rowClassName }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3 p-6", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`skeleton-row-${index}`}
          className={cn("h-12 w-full animate-pulse rounded-lg bg-muted", rowClassName)}
        />
      ))}
    </div>
  )
}
