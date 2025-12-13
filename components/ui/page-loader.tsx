import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type PageLoaderProps = {
  label?: string
  className?: string
}

export function PageLoader({ label = "Chargement en cours...", className }: PageLoaderProps) {
  return (
    <div className={cn("flex min-h-[240px] items-center justify-center rounded-lg border bg-background", className)}>
      <div className="text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}
