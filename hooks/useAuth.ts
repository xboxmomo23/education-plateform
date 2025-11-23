'use client'

import { useMemo, useEffect, useState } from 'react'
import { getUserSession, type User } from '@/lib/auth-new'

/**
 * Hook d'authentification centralisé
 * 
 * ✅ Résout le problème de boucle infinie en mémoïsant l'objet user
 * ✅ L'objet user ne change de référence QUE si user.id change
 * ✅ Permet d'utiliser user?.id dans les dépendances de useEffect
 * 
 * @example
 * const { user, isAuthenticated } = useAuth()
 * 
 * useEffect(() => {
 *   if (user?.id) {
 *     loadData()
 *   }
 * }, [user?.id]) // ✅ Dépendance primitive, pas d'objet
 */
export function useAuth() {
  const [rawUser, setRawUser] = useState<User | null>(null)
  
  // Charger l'utilisateur au montage
  useEffect(() => {
    const user = getUserSession()
    setRawUser(user)
  }, [])
  
  // Mémoïser l'utilisateur sur son ID
  // L'objet user ne changera de référence QUE si user?.id change
  const user = useMemo(() => {
    return rawUser
  }, [rawUser?.id]) // ✅ Dépendance sur primitive, pas sur objet
  
  const isAuthenticated = !!user
  
  return {
    user,
    isAuthenticated,
    userId: user?.id,
    userRole: user?.role,
    userEmail: user?.email,
    fullName: user?.full_name,
  }
}

/**
 * Hook pour forcer un rafraîchissement de la session
 * Utile après une mise à jour du profil
 */
export function useRefreshAuth() {
  const [, setTrigger] = useState(0)
  
  const refresh = () => {
    setTrigger(prev => prev + 1)
  }
  
  return { refresh }
}