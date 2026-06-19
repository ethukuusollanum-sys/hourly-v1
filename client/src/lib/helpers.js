export const DEFAULT_CATEGORIES = [
  { id: 'Work', name: 'Work', icon: '💼', color: '#3b82f6' },
  { id: 'Break', name: 'Break', icon: '☕', color: '#f97316' },
  { id: 'Meeting', name: 'Meeting', icon: '🎥', color: '#a855f7' },
  { id: 'Learning', name: 'Learning', icon: '📚', color: '#00d4aa' },
]

export const THEMES = [
  { name: 'Teal', ac: '#00d4aa', ac2: '#0099ff' },
  { name: 'Blue', ac: '#3b82f6', ac2: '#6366f1' },
  { name: 'Purple', ac: '#a855f7', ac2: '#ec4899' },
  { name: 'Green', ac: '#22c55e', ac2: '#10b981' },
  { name: 'Orange', ac: '#f97316', ac2: '#f43f5e' },
  { name: 'Rose', ac: '#f43f5e', ac2: '#a855f7' },
  { name: 'Cyan', ac: '#06b6d4', ac2: '#3b82f6' },
  { name: 'Amber', ac: '#eab308', ac2: '#f97316' },
]

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function getSlots(start, end) {
  const slots = []
  const sh = parseInt(start.split(':')[0])
  const eh = parseInt(end.split(':')[0])
  for (let i = sh; i < eh; i++) {
    slots.push(`${String(i).padStart(2, '0')}:00 - ${String(i + 1).padStart(2, '0')}:00`)
  }
  return slots
}

// "13:30" -> 810 (minutes since midnight). Returns 0 for invalid input.
export function timeToMin(t) {
  if (!t || !t.includes(':')) return 0
  const [h, m] = t.split(':').map(n => parseInt(n, 10))
  if (isNaN(h) || isNaN(m)) return 0
  return h * 60 + m
}

// Given break slots array [{start, end}, ...] and the workday slot list, return
// the hourly slots that overlap each break, with overlap duration in minutes.
// Empty/invalid breakSlots -> [].
export function getBreakSlots(settings, allSlots) {
  const slots = settings?.breakSlots
  if (!slots || !Array.isArray(slots) || !slots.length) return []
  const out = []
  for (const { start, end } of slots) {
    if (!start || !end) continue
    const bStart = timeToMin(start)
    const bEnd = timeToMin(end)
    if (bEnd <= bStart) continue
    for (const slot of allSlots) {
      const [s, e] = slot.split(' - ')
      const sStart = timeToMin(s)
      const sEnd = timeToMin(e)
      const overlap = Math.min(bEnd, sEnd) - Math.max(bStart, sStart)
      if (overlap > 0) out.push({ slot, duration: overlap })
    }
  }
  return out
}

export function weekStart() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatDate(str) {
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function H(min) { return Math.floor(min / 60) }
export function M(min) { return min % 60 }

export function esc(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function hexToRgba(hex, a) {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${a})`
  } catch {
    return `rgba(59,130,246,${a})`
  }
}

export function applyTheme(t) {
  const root = document.documentElement
  root.style.setProperty('--ac', t.ac)
  root.style.setProperty('--ac2', t.ac2)
  const r1 = parseInt(t.ac.slice(1, 3), 16)
  const g1 = parseInt(t.ac.slice(3, 5), 16)
  const b1 = parseInt(t.ac.slice(5, 7), 16)
  root.style.setProperty('--acbg', `rgba(${r1},${g1},${b1},.08)`)
  root.style.setProperty('--acbd', `rgba(${r1},${g1},${b1},.22)`)
  const meta = document.getElementById('theme_meta')
  if (meta) meta.content = t.ac
  localStorage.setItem('ht_theme', JSON.stringify(t))
}

export const ROW_COLORS = [
  'FFF3F4F6', 'FFE8EAF0', 'FFDDDEE8', 'FFD5D7E3', 'FFD0D3E2', 'FFD4D6E8',
  'FFDBD9EE', 'FFE4DCF0', 'FFEEE0F0', 'FFF5E3ED', 'FFF8E5E8', 'FFFBE8E0',
  'FFFEF0D6', 'FFFDF5CC', 'FFF8F6C5', 'FFF0F5C5', 'FFE6F2CB', 'FFDCEFD5',
  'FFD4EDE2', 'FFD3EBEF', 'FFD7E8F4', 'FFDEE5F4', 'FFE3E3F0', 'FFE9E8F0',
]

export function sortByCreatedAsc(a, b) {
  return (a.created_at || '') < (b.created_at || '') ? -1 : (a.created_at || '') > (b.created_at || '') ? 1 : 0
}

export function getToday() {
  return new Date().toISOString().split('T')[0]
}

export function getSlotDuration(slot) {
  const [s, e] = slot.split(' - ')
  return timeToMin(e) - timeToMin(s)
}

export function calculateRemainingTime({ slotDuration, breaks, logs }) {
  const breakTotal = (breaks || []).reduce((sum, b) => sum + (b.duration || 0), 0)
  const logTotal = (logs || []).reduce((sum, l) => sum + (l.duration || 0), 0)
  return Math.max(0, slotDuration - breakTotal - logTotal)
}
