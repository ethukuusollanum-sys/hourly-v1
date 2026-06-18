import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './AuthContext'

const ActivitiesContext = createContext(null)

export function ActivitiesProvider({ children, profile }) {
  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)

    const subscription = supabase
      .channel('activities-channel')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'activities' },
        () => {
          refreshActivities()
        }
      )
      .subscribe()

    refreshActivities()

    async function refreshActivities() {
      const team2 = profile?.settings?.team
      let q = supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: true })

      if (team2) {
        const { data: teammates } = await supabase
          .from('profiles')
          .select('id')
          .eq('settings->>team', team2)
        const ids = [user.id, ...(teammates?.map(t => t.id) || [])]
        q = q.in('user_id', ids)
      } else {
        q = q.eq('user_id', user.id)
      }

      const { data } = await q
      if (data) setActivities(data)
      setLoading(false)
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [user, profile?.settings?.team])

  return (
    <ActivitiesContext.Provider value={{ activities, loading, setActivities }}>
      {children}
    </ActivitiesContext.Provider>
  )
}

export function useActivities() {
  const ctx = useContext(ActivitiesContext)
  if (!ctx) throw new Error('useActivities must be used within ActivitiesProvider')
  return ctx
}
