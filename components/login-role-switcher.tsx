"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type LoginRole = "student" | "parent"

interface LoginRoleSwitcherProps {
  activeRole: LoginRole
}

export function LoginRoleSwitcher({ activeRole }: LoginRoleSwitcherProps) {
  const router = useRouter()

  const handleSelect = (role: LoginRole) => {
    if (role === activeRole) return
    router.push(role === "student" ? "/login-eleve" : "/login-parent")
  }

  return (
    <div className="flex w-full gap-2">
      <Button
        type="button"
        variant={activeRole === "student" ? "default" : "outline"}
        className="flex-1"
        disabled={activeRole === "student"}
        aria-current={activeRole === "student" ? "page" : undefined}
        onClick={() => handleSelect("student")}
      >
        Élève
      </Button>
      <Button
        type="button"
        variant={activeRole === "parent" ? "default" : "outline"}
        className="flex-1"
        disabled={activeRole === "parent"}
        aria-current={activeRole === "parent" ? "page" : undefined}
        onClick={() => handleSelect("parent")}
      >
        Parent
      </Button>
    </div>
  )
}
