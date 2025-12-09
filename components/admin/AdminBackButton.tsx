"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminBackButtonProps {
  className?: string;
}

export function AdminBackButton({ className }: AdminBackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "px-0 text-sm font-medium text-muted-foreground hover:text-primary",
        className
      )}
      onClick={() => router.push("/admin")}
    >
      ← Retour
    </Button>
  );
}

