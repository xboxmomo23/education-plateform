"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import type { ParentChildSummary } from "@/lib/auth-new"
import { API_BASE_URL } from "@/lib/api/config"

const STORAGE_KEY = "parent_selected_child_id"

type ParentChildContextValue = {
  parentChildren: ParentChildSummary[]
  selectedChildId: string | null
  selectedChild?: ParentChildSummary
  setSelectedChildId: (childId: string | null) => void
  accountDisabled: boolean
}

const ParentChildContext = createContext<ParentChildContextValue | undefined>(undefined)

export function ParentChildProvider({ children }: { children: React.ReactNode }) {
  const { parentChildren: initialParentChildren, user } = useAuth()
  const [childrenList, setChildrenList] = useState<ParentChildSummary[]>(() => initialParentChildren ?? [])
  const [selectedChildId, setSelectedChildIdState] = useState<string | null>(null)
  const [storedChildId, setStoredChildId] = useState<string | null>(null)
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false)
  const [hasResolvedSelection, setHasResolvedSelection] = useState(false)
  const [accountDisabled, setAccountDisabled] = useState(false)

  useEffect(() => {
    if ((initialParentChildren?.length ?? 0) > 0 && childrenList.length === 0) {
      setChildrenList(initialParentChildren!)
    }
  }, [initialParentChildren, childrenList.length])

  useEffect(() => {
    console.log("[ParentChild] children list updated:", childrenList.map((child) => child.id))
  }, [childrenList])

  const persistSelection = useCallback((childId: string | null) => {
    setSelectedChildIdState(childId)
    setStoredChildId(childId)
    if (typeof window === "undefined") {
      return
    }
    if (childId) {
      console.log("[ParentChild] persist selection ->", childId)
      localStorage.setItem(STORAGE_KEY, childId)
    } else {
      console.log("[ParentChild] clear persisted selection")
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(STORAGE_KEY)
    console.log("[ParentChild] stored selection on mount:", stored)
    setStoredChildId(stored)
    setHasHydratedStorage(true)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const controller = new AbortController()
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null

    const fetchChildren = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/parent/children`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        })

        const data = await response.json().catch(() => ({}))

        if (response.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("user")
            localStorage.removeItem("auth_token")
            localStorage.removeItem("refresh_token")
            window.location.href = "/login-parent"
          }
          return
        }

        if (!response.ok) {
          const message = data?.error || `Erreur HTTP ${response.status}`
          if (response.status === 403 && typeof message === "string" && message.toLowerCase().includes("désactivé")) {
            setAccountDisabled(true)
            setChildrenList([])
            return
          }
          throw new Error(message)
        }

        setAccountDisabled(false)
        setChildrenList(Array.isArray(data?.data) ? data.data : [])
        console.log("[ParentChild] fetched children ids:", (Array.isArray(data?.data) ? data.data : []).map((c) => c.id))
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return
        }
        console.error("Erreur chargement enfants parent:", error)
      }
    }

    fetchChildren()
    return () => controller.abort()
  }, [user?.id])

  useEffect(() => {
    if (!hasHydratedStorage) return
    if (childrenList.length === 0) {
      return
    }

    const listHasSelection = selectedChildId && childrenList.some((child) => child.id === selectedChildId)
    if (!hasResolvedSelection) {
      if (listHasSelection) {
        setHasResolvedSelection(true)
        return
      }

      const storedExists = storedChildId && childrenList.some((child) => child.id === storedChildId)
      const fallbackId = storedExists ? storedChildId : childrenList[0]?.id ?? null
      persistSelection(fallbackId)
      setHasResolvedSelection(true)
      return
    }

    if (listHasSelection) {
      return
    }

    const fallbackId = childrenList[0]?.id ?? null
    if (fallbackId !== selectedChildId) {
      persistSelection(fallbackId)
    }
  }, [
    childrenList,
    hasHydratedStorage,
    hasResolvedSelection,
    persistSelection,
    selectedChildId,
    storedChildId,
  ])

  const selectedChild = useMemo(() => {
    if (!selectedChildId) return undefined
    return childrenList.find((child) => child.id === selectedChildId)
  }, [childrenList, selectedChildId])

  const value = useMemo<ParentChildContextValue>(
    () => ({
      parentChildren: childrenList,
      selectedChildId,
      selectedChild,
      setSelectedChildId: persistSelection,
      accountDisabled,
    }),
    [childrenList, persistSelection, selectedChild, selectedChildId, accountDisabled]
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
