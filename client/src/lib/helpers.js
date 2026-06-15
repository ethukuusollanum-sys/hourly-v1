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
  'FFE8F4F8', 'FFF0F9FF', 'FFECFDF5', 'FFFDF6EC', 'FFF5F3FF',
  'FFFEF9C3', 'FFFFE4E6', 'FFE0F2FE', 'FFEEF2FF', 'FFF0FDF4',
]

export function getToday() {
  return new Date().toISOString().split('T')[0]
}
