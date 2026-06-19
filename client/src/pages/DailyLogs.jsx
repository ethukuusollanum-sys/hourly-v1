import { useState, useMemo } from 'react'
import { useActivities } from '../context/ActivitiesContext'
import { DAYS, MONTHS, formatDate, H, M, hexToRgba, esc, sortByCreatedAsc } from '../lib/helpers'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { supabase } from '../config/supabase'
import { useToast } from '../context/ToastContext'

export default function DailyLogs({ profile }) {
  const { activities, setActivities } = useActivities()
  const { toast } = useToast()
  const categories = profile?.categories || []

  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const datesWithLogs = useMemo(() => new Set(activities.map(a => a.date)), [activities])

  function getCat(id) {
    return categories.find(c => c.id === id) || { id, name: id, icon: '📌', color: '#3b82f6' }
  }

  function calNav(dir) {
    let m = calMonth + dir
    let y = calYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setCalMonth(m)
    setCalYear(y)
  }

  const today = new Date().toISOString().split('T')[0]
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const daysInPrev = new Date(calYear, calMonth, 0).getDate()

  function renderCalendar() {
    const cells = []
    // Prev month fill
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`prev-${i}`} className="cal-day other-month">{daysInPrev - firstDay + 1 + i}</div>)
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isTod = dateStr === today
      const isSel = dateStr === selectedDate
      const hasLog = datesWithLogs.has(dateStr)
      cells.push(
        <div
          key={d}
          className={`cal-day${isTod ? ' today' : ''}${isSel ? ' sel' : ''}${hasLog ? ' has-log' : ''}`}
          onClick={() => setSelectedDate(dateStr)}
        >{d}</div>
      )
    }
    // Next month fill
    const remaining = (7 - ((firstDay + daysInMonth) % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      cells.push(<div key={`next-${i}`} className="cal-day other-month">{i}</div>)
    }
    return cells
  }

  function navDay(dir) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + dir)
    const ns = d.toISOString().split('T')[0]
    if (dir > 0 && ns > tomorrowStr) return
    setSelectedDate(ns)
    setCalYear(d.getFullYear())
    setCalMonth(d.getMonth())
  }

  const dayActs = activities.filter(a => a.date === selectedDate)
    .sort(sortByCreatedAsc)
  const isToday = selectedDate === today
  const dayTm = dayActs.reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
  const dayWm = dayActs.filter(a => {
    const cat = categories.find(c => c.id === a.category)
    return cat?.name !== 'Break'
  }).reduce((s, a) => s + (parseInt(a.duration) || 60), 0)

  async function delActivity(id, name) {
    const confirmed = await window.__confirm(`Delete "${name}"?`, 'Delete Activity')
    if (!confirmed) return
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (!error) {
      setActivities(prev => prev.filter(a => a.id !== id))
      toast('Deleted', 'inf')
    }
  }

  return (
    <>
      <div className="card m4">
        <div className="ch">
          <div className="ct">Calendar</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="ib" onClick={() => calNav(-1)}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 120, textAlign: 'center' }}>
              {MONTHS[calMonth]} {calYear}
            </span>
            <button className="ib" onClick={() => calNav(1)}><ChevronRight size={14} /></button>
          </div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div className="cal-grid">
            {DAYS.map(d => <div key={d} className="cal-hdr">{d.slice(0, 1)}</div>)}
            {renderCalendar()}
          </div>
        </div>
      </div>

      <div className="sh2" style={{ marginBottom: 14, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn bs bsm" onClick={() => navDay(-1)}>
            <ChevronLeft size={13} /> Prev
          </button>
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--tx)' }}>
              {formatDate(selectedDate)}
              {isToday && <span style={{ fontSize: '9.5px', color: 'var(--ac)', fontFamily: 'var(--mo)', marginLeft: 6 }}>TODAY</span>}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--tx2)', marginTop: 2 }}>
              {dayActs.length} tasks · {H(dayTm)}h {M(dayTm)}m · {dayTm > 0 ? Math.round((dayWm / dayTm) * 100) : 0}% focus
            </div>
          </div>
          <button className="btn bs bsm" onClick={() => navDay(1)} disabled={selectedDate >= tomorrowStr}>
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {!dayActs.length ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
          No activities on this day
          {isToday && ' — log from the Dashboard'}
        </div>
      ) : (
        <div className="card">
          <div>
            {dayActs.map(a => {
              const cat = getCat(a.category)
              const col = cat.color
              const tagBg = hexToRgba(col, 0.12)
              const tagBd = hexToRgba(col, 0.25)
              return (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 18px', borderBottom: '1px solid var(--bd)',
                }}>
                  <div style={{
                    width: 80, fontFamily: 'var(--mo)', fontSize: 11,
                    color: 'var(--tx2)', flexShrink: 0,
                  }}>{a.slot.split(' - ')[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--tx)' }}>
                      {esc(a.name)}
                    </div>
                    {a.notes && <div style={{ fontSize: '11.5px', color: 'var(--tx2)', marginTop: 1 }}>{esc(a.notes)}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    <span className="tag" style={{ background: tagBg, color: col, border: `1px solid ${tagBd}` }}>
                      {cat.icon} {a.category}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mo)', color: 'var(--tx3)' }}>
                      {a.duration || 60}m
                    </span>
                    <button className="ib del" onClick={() => delActivity(a.id, a.name)} style={{ opacity: 0.7 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
