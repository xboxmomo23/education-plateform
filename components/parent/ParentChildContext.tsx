"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import type { ParentChildSummary } from "@/lib/auth-new"

const STORAGE_KEY = "parent_selected_child_id"

type ParentChildContextValue = {
  parentChildren: ParentChildSummary[]
  selectedChildId: string | null
  selectedChild?: ParentChildSummary
  setSelectedChildId: (childId: string | null) => void
}

const ParentChildContext = createContext<ParentChildContextValue | undefined>(undefined)

export function ParentChildProvider({ children }: { children: React.ReactNode }) {
  const { parentChildren } = useAuth()
  const list = useMemo(() => parentChildren ?? [], [parentChildren])
  const [selectedChildId, setSelectedChildIdState] = useState<string | null>(null)
  const [hasHydratedFromStorage, setHasHydratedFromStorage] = useState(false)

  const persistSelection = useCallback((childId: string | null) => {
    setSelectedChildIdState(childId)
    if (typeof window === "undefined") {
      return
    }
    if (childId) {
      console.log("[ParentChildContext] Persisting child ID:", childId)
      localStorage.setItem(STORAGE_KEY, childId)
    } else {
      console.log("[ParentChildContext] Clearing persisted child selection")
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(STORAGE_KEY)
    console.log("[ParentChildContext] Hydrated from localStorage:", stored)
    if (stored) {
      setSelectedChildIdState(stored)
    }
    setHasHydratedFromStorage(true)
  }, [])

  useEffect(() => {
    console.log(
      "[ParentChildContext] parentChildren changed:",
      list.map((child) => child.id)
    )
  }, [list])

  useEffect(() => {
    if (!hasHydratedFromStorage) return
    if (list.length === 0) {
      return
    }

    if (selectedChildId && list.some((child) => child.id === selectedChildId)) {
      return
    }

    const fallbackId = list[0]?.id ?? null
    if (fallbackId) {
      persistSelection(fallbackId)
    }
  }, [list, persistSelection, selectedChildId, hasHydratedFromStorage])

  const selectedChild = useMemo(() => {
    if (!selectedChildId) return undefined
    return list.find((child) => child.id === selectedChildId)
  }, [list, selectedChildId])

  const value = useMemo<ParentChildContextValue>(
    () => ({
      parentChildren: list,
      selectedChildId,
      selectedChild,
      setSelectedChildId: persistSelection,
    }),
    [list, persistSelection, selectedChild, selectedChildId]
  )

  return <ParentChildContext.Provider value={value}>{children}</ParentChildContext.Provider>
}

export function useParentChild() {
  const ctx = useContext(ParentChildContext)
  if (!ctx) {
    throw new Error("useParentChild must be used within ParentChildProvider")
  }
  return ctx
}
