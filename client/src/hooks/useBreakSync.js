import { useEffect, useRef } from 'react'
import { supabase } from '../config/supabase'
import { getBreakSlots, getSlots, getToday } from '../lib/helpers'

export default function useBreakSync(user, settings, activities, setActivities) {
  const runningRef = useRef(false)

  const breakSlots = settings?.breakSlots
  const workStart = settings?.workStart || '09:00'
  const workEnd = settings?.workEnd || '18:00'

  useEffect(() => {
    if (!user) return
    if (!setActivities) return
    if (runningRef.current) return
    const slots = getSlots(workStart, workEnd)
    const desired = getBreakSlots({ breakSlots }, slots)
    const today = getToday()

    const todayBreakRows = activities.filter(
      a => a.is_break && a.user_id === user.id && a.date === today
    )

    const desiredSlots = desired.map(d => d.slot)
    const existingSlots = todayBreakRows.map(a => a.slot)

    const toAdd = desired.filter(d => !existingSlots.includes(d.slot))
    const toRemove = todayBreakRows.filter(a => !desiredSlots.includes(a.slot))

    if (!toAdd.length && !toRemove.length) return

    runningRef.current = true
    ;(async () => {
      try {
        if (toRemove.length) {
          const { error } = await supabase
            .from('activities')
            .delete()
            .in('id', toRemove.map(a => a.id))
          if (!error) {
            setActivities(prev => prev.filter(a => !toRemove.some(r => r.id === a.id)))
          }
        }
        if (toAdd.length) {
          const { data, error } = await supabase.from('activities').insert(
            toAdd.map(d => ({
              user_id: user.id,
              name: 'Break',
              category: 'Break',
              duration: d.duration,
              notes: '',
              date: today,
              slot: d.slot,
              is_break: true,
              created_at: new Date().toISOString(),
            }))
          ).select()
          if (!error && data) {
            setActivities(prev => [...prev, ...data])
          }
        }
      } catch (err) {
        console.error('break sync failed', err)
      } finally {
        runningRef.current = false
      }
    })()
  }, [user, breakSlots, workStart, workEnd, activities, setActivities])
}
