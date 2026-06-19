import { useRef, useEffect } from 'react'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.min.css'

function to24(v) {
  if (!v) return ''
  const m = v.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return v
  let h = parseInt(m[1], 10)
  const min = m[2]
  const ampm = (m[3] || '').toUpperCase()
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min}`
}

function to12(v) {
  if (!v) return ''
  const m = v.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return v
  let h = parseInt(m[1], 10)
  const min = m[2]
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${String(h).padStart(2, '0')}:${min} ${ampm}`
}

export default function TimePicker({ value, onChange, placeholder, style }) {
  const inputRef = useRef(null)
  const fpRef = useRef(null)

  useEffect(() => {
    if (!inputRef.current) return
    fpRef.current = flatpickr(inputRef.current, {
      enableTime: true,
      noCalendar: true,
      dateFormat: 'h:i K',
      time_24hr: false,
      defaultDate: value ? to12(value) : undefined,
      onChange: (_, dateStr) => {
        onChange?.(to24(dateStr))
      },
      onClose: () => {
        inputRef.current?.blur()
      },
    })
    return () => fpRef.current?.destroy()
  }, [])

  useEffect(() => {
    if (fpRef.current && value) {
      fpRef.current.setDate(to12(value), false)
    }
  }, [value])

  return (
    <input
      ref={inputRef}
      type="text"
      className="time-picker"
      placeholder={placeholder || 'Select time'}
      readOnly
      style={style}
    />
  )
}
