"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { timetableApi, type TimetableEntry } from "@/lib/api/timetable"
import { useAuth } from "@/hooks/useAuth" // ✅ NOUVEAU HOOK
import { Calendar } from "lucide-react"

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i) // 8h à 18h

export default function ProfesseurEmploiDuTempsPage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  
  // ✅ CORRECTION: Utiliser le hook useAuth mémoïsé
  const { user, userId } = useAuth()

  // ✅ CORRECTION: Dépendre uniquement de userId (primitive), pas de l'objet user
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    // ✅ CORRECTION: Utiliser AbortController pour annuler la requête au démontage
    const controller = new AbortController()
    let isMounted = true // Flag pour éviter setState après unmount

    const loadTimetable = async () => {
      try {
        setLoading(true)
        
        // ✅ CORRECTION: Passer signal pour permettre l'annulation
        const response = await timetableApi.getTeacherTimetable(userId, undefined, controller.signal)
        
        // ✅ CORRECTION: Vérifier que le composant est toujours monté
        if (isMounted && response.success) {
          setEntries(response.data)
        }
      } catch (error: any) {
        // ✅ CORRECTION: Ignorer les erreurs d'annulation
        if (error.name === 'AbortError') {
          console.log('Requête annulée (composant démonté)')
          return
        }
        console.error('Erreur chargement emploi du temps:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadTimetable()

    // ✅ CORRECTION: Cleanup - annuler la requête et marquer comme non monté
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [userId]) // ✅ CORRECTION: Dépendance sur primitive, pas sur objet

  const getEntriesForDay = (dayOfWeek: number) => {
    return entries.filter(e => e.day_of_week === dayOfWeek)
  }

  const getEntryPosition = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = (hours - 8) * 60 + minutes
    return (totalMinutes / 60) * 80 // 80px par heure
  }

  const getEntryHeight = (startTime: string, endTime: string) => {
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM)
    return (durationMinutes / 60) * 80
  }

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mon Emploi du Temps</h1>
          <p className="text-muted-foreground">Vue d'ensemble de mes cours</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Chargement...</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Semaine type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-2 min-w-[800px]">
                  {/* En-tête */}
                  <div className="text-sm font-medium text-muted-foreground">Heures</div>
                  {DAYS.map(day => (
                    <div key={day} className="text-sm font-medium text-center">
                      {day}
                    </div>
                  ))}

                  {/* Grille */}
                  {HOURS.map(hour => (
                    <React.Fragment key={hour}>
                      <div className="text-sm text-muted-foreground py-2">
                        {hour}:00
                      </div>
                      {[1, 2, 3, 4, 5].map(day => {
                        const dayEntries = getEntriesForDay(day)
                        const hourEntries = dayEntries.filter(e => {
                          const [h] = e.start_time.split(':').map(Number)
                          return h === hour
                        })

                        return (
                          <div key={day} className="border border-gray-200 rounded p-1 min-h-[80px] relative">
                            {hourEntries.map(entry => (
                              <div
                                key={entry.id}
                                className="absolute left-1 right-1 rounded px-2 py-1 text-xs overflow-hidden"
                                style={{
                                  top: `${getEntryPosition(entry.start_time) % 80}px`,
                                  height: `${getEntryHeight(entry.start_time, entry.end_time)}px`,
                                  backgroundColor: entry.subject_color || '#3b82f6',
                                  opacity: 0.9,
                                  color: 'white',
                                }}
                              >
                                <div className="font-semibold truncate">{entry.subject_name}</div>
                                <div className="truncate text-[10px]">{entry.class_label}</div>
                                <div className="truncate text-[10px]">{entry.room}</div>
                                <div className="text-[10px]">
                                  {entry.start_time} - {entry.end_time}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Statistiques */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-bold">{entries.length}</div>
                  <div className="text-sm text-muted-foreground">Cours par semaine</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-bold">
                    {entries.reduce((sum, e) => {
                      const [sh, sm] = e.start_time.split(':').map(Number)
                      const [eh, em] = e.end_time.split(':').map(Number)
                      return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60
                    }, 0).toFixed(1)}h
                  </div>
                  <div className="text-sm text-muted-foreground">Heures totales</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <div className="text-2xl font-bold">
                    {new Set(entries.map(e => e.class_label)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Classes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}