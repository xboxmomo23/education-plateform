import { toast as baseToast } from "@/hooks/use-toast"

type ToastParams = {
  title: string
  description?: string
}

function push(variant: "default" | "success" | "info" | "destructive", params: ToastParams) {
  baseToast({
    ...params,
    variant,
  })
}

export const notify = {
  success: (title: string, description?: string) => push("success", { title, description }),
  error: (title: string, description?: string) => push("destructive", { title, description }),
  info: (title: string, description?: string) => push("info", { title, description }),
}
