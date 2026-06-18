import { useEffect, useRef } from 'react'

export default function useHourlyReminder(enabled) {
  const lastRef = useRef(null)

  useEffect(() => {
    if (!enabled) return
    if (typeof Notification === 'undefined') return

    if (Notification.permission === 'default') Notification.requestPermission()
    if (Notification.permission !== 'granted') return

    const now = new Date()
    lastRef.current = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`

    const id = setInterval(() => {
      const now2 = new Date()
      const key = `${now2.getFullYear()}-${now2.getMonth()}-${now2.getDate()}-${now2.getHours()}`
      if (lastRef.current === key) return
      lastRef.current = key

      const n = new Notification('Hourly Tracker', {
        body: `What are you working on at ${String(now2.getHours()).padStart(2, '0')}:00?`,
        icon: '/icons/icon-192.png',
      })
      n.onclick = () => { window.focus() }
    }, 60000)

    return () => clearInterval(id)
  }, [enabled])
}
