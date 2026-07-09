import { useActivities } from '../context/ActivitiesContext'
import { useToast } from '../context/ToastContext'
import { getSlots, getBreakSlots, getSlotDuration, getSlotSegments, getToday, H, M, hexToRgba, esc, sortByCreatedAsc, calculateRemainingTime, minToString, parseSlot, timeToMin } from '../lib/helpers'
import { supabase } from '../config/supabase'
import { Pencil, Trash2, Coffee, Clock, Calendar, CircleAlert, ListChecks, Timer, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import useBreakSync from '../hooks/useBreakSync'
import CatIcon from '../components/CatIcon'

export default function Dashboard({ profile }) {
  const { user } = useAuth()
  const { activities, setActivities, loading } = useActivities()
  const { toast } = useToast()
  const today = getToday()
  const settings = profile?.settings || {}
  const categories = profile?.categories || []

  const [selectedDate, setSelectedDate] = useState(today)

  const isToday = selectedDate === today
  const isFuture = selectedDate > today

  const dateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }, [selectedDate])

  function prevDay() {
    setSelectedDate(prev => {
      const d = new Date(prev + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      return d.toISOString().split('T')[0]
    })
  }

  function nextDay() {
    setSelectedDate(prev => {
      const d = new Date(prev + 'T12:00:00')
      d.setDate(d.getDate() + 1)
      return d.toISOString().split('T')[0]
    })
  }

  function goToday() {
    setSelectedDate(today)
  }

  const ta = activities.filter(a => a.date === selectedDate)
  const wm = ta.filter(a => {
    const cat = categories.find(c => c.id === a.category)
    return cat?.name !== 'Break'
  }).reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
  const tm = ta.reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
  const slots = getSlots(settings.workStart || '09:00', settings.workEnd || '18:00')
  useBreakSync(user, settings, activities, setActivities)
  const breakSlotData = getBreakSlots(settings, slots)
  const breakSlotMap = new Map(breakSlotData.map(d => [d.slot, d.duration]))
  const breakSlots = new Set(breakSlotData.map(d => d.slot))
  const filled = new Set(ta.map(a => a.slot))
  const nh = new Date().getHours().toString().padStart(2, '0')

  function getCat(id) {
    return categories.find(c => c.id === id) || { id, name: id, icon: 'star', color: '#3b82f6' }
  }

  function openEdit(act) {
    if (window.__activityModal) {
      window.__activityModal.open(act.slot, {
        id: act.id,
        name: act.name,
        category: act.category,
        duration: act.duration,
        notes: act.notes,
        work_start: act.work_start,
        date: act.date,
      })
    }
  }

  async function delActivity(id, name) {
    const confirmed = await window.__confirm(`Delete "${name}"?`, 'Delete Activity')
    if (!confirmed) return
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (!error) {
      setActivities(prev => prev.filter(a => a.id !== id))
      toast('Deleted', 'inf')
    }
  }

  if (loading) {
    return (
      <div className="sg">
        {[1, 2, 3, 4].map(i => <div key={i} className="skel skel-card" />)}
      </div>
    )
  }

  return (
    <>
      <div className="sg">
        <div className="sc scg">
          <div className="sl2">Logged Today</div>
          <div className="sv">{ta.length}<span> tasks</span></div>
          <div className="su2">activities this session</div>
        </div>
        <div className="sc scb">
          <div className="sl2">Work Time</div>
          <div className="sv">{H(wm)}<span>h</span>{M(wm)}<span>m</span></div>
          <div className="su2">productive hours</div>
        </div>
        <div className="sc sco">
          <div className="sl2">Slots Filled</div>
          <div className="sv">{filled.size}<span>/{slots.length}</span></div>
          <div className="su2">of today's hours</div>
        </div>
        <div className="sc scp">
          <div className="sl2">Focus Score</div>
          <div className="sv">{tm > 0 ? Math.round((wm / tm) * 100) : 0}<span>%</span></div>
          <div className="su2">work vs break ratio</div>
        </div>
      </div>

      {wm === 0 && (
        <div className="infbox m4">
          <div className="infbox-icon">{ta.length ? <Coffee size={18} /> : <Clock size={18} />}</div>
          <div>
            <div className="infbox-title">{ta.length ? 'Only break time logged' : 'Start tracking your day'}</div>
            <div className="infbox-text">Tap <strong>+ Log</strong> on any time slot below to log what you're working on.</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="ch">
          <div className="ct">{isToday ? "Today's Timeline" : 'Timeline'}</div>
          <div className="cs">{slots.length} hour slots</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--bd)' }}>
          <button className="ib" onClick={prevDay} aria-label="Previous day" style={{ width: 32, height: 32 }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => {
            const picker = document.createElement('input')
            picker.type = 'date'
            picker.value = selectedDate
            picker.max = today
            picker.style.display = 'none'
            document.body.appendChild(picker)
            picker.addEventListener('change', () => {
              if (picker.value) setSelectedDate(picker.value)
              document.body.removeChild(picker)
            })
            picker.click()
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', fontFamily: 'var(--mo)' }}>{selectedDate}</div>
            <div style={{ fontSize: 10.5, color: isToday ? 'var(--ac)' : 'var(--tx3)', marginTop: 2 }}>
              {isToday ? 'Today' : dateLabel}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {!isToday && (
              <button className="ib" onClick={goToday} aria-label="Go to today" style={{ width: 32, height: 32, fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--ac)' }}>
                Today
              </button>
            )}
            <button className="ib" onClick={nextDay} disabled={isToday || isFuture} aria-label="Next day" style={{ width: 32, height: 32, opacity: isToday || isFuture ? 0.3 : 1, cursor: isToday || isFuture ? 'default' : 'pointer' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        {isFuture && (
          <div style={{ padding: '12px 16px', background: 'rgba(244,63,94,.08)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CircleAlert size={14} color="var(--red)" />
            <span style={{ fontSize: 12, color: 'var(--red)' }}>Future date logs cannot be added.</span>
          </div>
        )}
        {isToday && (
          <div style={{ padding: '12px 16px', background: 'rgba(0,212,170,.06)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} color="var(--ac)" />
            <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Viewing today's timeline</span>
          </div>
        )}
        {!isToday && !isFuture && (
          <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,.06)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} color="var(--ac2)" />
            <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Viewing previous day — you can add logs for this date</span>
          </div>
        )}
        <div>
          {slots.map(slot => {
            const sa = ta.filter(a => a.slot === slot)
              .sort(sortByCreatedAsc)
            const isn = parseSlot(slot).start.split(':')[0] === nh
            const isBreak = breakSlots.has(slot)
            const tasks = sa.filter(a => !a.is_break)
            const workTasks = tasks.filter(a => a.category !== 'Break')
            const breakTasks = tasks.filter(a => a.category === 'Break')
            const slotLimit = getSlotDuration(slot)
            const breakMins = breakSlotMap.get(slot) || 0
            const workMins = workTasks.reduce((s, a) => s + (a.duration || 0), 0)
            const userBreakMins = breakTasks.reduce((s, a) => s + (a.duration || 0), 0)
            const logMins = workMins + userBreakMins
            const availMins = Math.max(0, slotLimit - breakMins - logMins)
            return (
              <div key={slot} className={`tlr${isBreak ? ' brk' : ''}`}>
                <div className="tlt">
                  <span className={`tbg${isn ? ' nw' : ''}`}>
                    {isn ? '▶ ' : ''}{slot.split(' - ')[0]}
                  </span>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mo)', color: availMins <= 0 ? 'var(--red)' : 'var(--tx3)', marginTop: 4 }}>
                    {availMins <= 0 ? 'Full' : `${availMins}m`}
                  </div>
                </div>
                <div className="tles">
                  <div className="slot-meta">
                    <span className="slot-meta-item" title="Slot duration"><Clock size={10} /> {slotLimit}m</span>
                    {breakMins > 0 && <span className="slot-meta-item" title="Scheduled break"><Coffee size={10} /> {breakMins}m</span>}
                    {workMins > 0 && <span className="slot-meta-item" title="Work time"><ListChecks size={10} /> {workMins}m</span>}
                    {userBreakMins > 0 && <span className="slot-meta-item" title="Logged break" style={{ color: '#f97316' }}><Coffee size={10} /> {userBreakMins}m</span>}
                    <span className={`slot-avail${availMins <= 5 ? ' slot-avail-critical' : ''}`}
                      style={{
                        color: availMins <= 0 ? 'var(--red)' : availMins <= 15 ? '#e6a817' : 'var(--tx3)',
                      }} title="Available time">
                      <Timer size={10} /> {availMins}m
                    </span>
                  </div>
                  {(() => {
                    const segs = getSlotSegments(slot, settings?.breakSlots || [], sa)
                    const total = timeToMin(parseSlot(slot).end) - timeToMin(parseSlot(slot).start)
                    if (total <= 0) return null

                    const allSegs = []
                    let oi = 0, ai = 0
                    while (oi < segs.occupied.length || ai < segs.available.length) {
                      const o = oi < segs.occupied.length ? segs.occupied[oi] : null
                      const a = ai < segs.available.length ? segs.available[ai] : null
                      if (a && (!o || a.start < o.start)) {
                        allSegs.push({ start: a.start, end: a.end, type: 'available' })
                        ai++
                      } else if (o) {
                        allSegs.push(o)
                        oi++
                      } else {
                        allSegs.push({ start: a.start, end: a.end, type: 'available' })
                        ai++
                      }
                    }

                    if (!allSegs.length) {
                      return <div style={{ flex: 1, height: 18, borderRadius: 6, background: 'var(--bd)' }} />
                    }

                    return (
                      <div style={{ display: 'flex', height: 18, borderRadius: 6, overflow: 'hidden', marginBottom: 3, gap: 1 }}>
                        {allSegs.map((seg, i) => {
                          const pct = ((seg.end - seg.start) / total) * 100
                          if (seg.type === 'available') {
                            return <div key={`seg-${i}`} style={{ width: `${pct}%`, background: 'var(--bd)', opacity: 0.4 }} title={`Available: ${minToString(seg.start)} - ${minToString(seg.end)} (${seg.end - seg.start}m)`} />
                          }
                          const isBreak = seg.type === 'break'
                          const color = isBreak ? '#f97316' : 'var(--ac)'
                          const act = seg.activity
                          const label = isBreak ? 'Break' : (act ? act.name : 'Work')
                          const cat = isBreak ? 'Scheduled Break' : (act ? act.category : 'Work')
                          const startStr = minToString(seg.start)
                          const endStr = minToString(seg.end)
                          const durStr = `${seg.end - seg.start}m`
                          const tip = `${label} (${cat})\n${startStr} → ${endStr}\n${durStr}`
                          return <div key={`seg-${i}`} style={{ width: `${pct}%`, background: color, borderRadius: 0, opacity: isBreak ? 0.7 : 0.85 }} title={tip} />
                        })}
                      </div>
                    )
                  })()}
                  {isBreak && (
                    <div className="ec brk-card">
                      <div className="edot" style={{ background: '#f97316', boxShadow: '0 0 5px #f9731666' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="en"><Coffee size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} /> Break</div>
                        <div className="eno">Scheduled break — {breakMins}m</div>
                      </div>
                    </div>
                  )}
                  {tasks.length ? tasks.map(a => {
                    const cat = getCat(a.category)
                    const col = cat.color
                    const tagBg = hexToRgba(col, 0.12)
                    const tagBd = hexToRgba(col, 0.25)
                    const timeLabel = a.work_start
                      ? `${a.work_start}→${minToString(timeToMin(a.work_start) + (a.duration || 60))}`
                      : null
                    return (
                      <div key={a.id} className="ec">
                        <div className="edot" style={{ background: col, boxShadow: `0 0 5px ${col}66` }} />
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 40 }}>
                          <div className="en">{esc(a.name)}</div>
                          {a.notes && <div className="eno">{esc(a.notes)}</div>}
                          <div className="em">
                            <span className="tag" style={{ background: tagBg, color: col, border: `1px solid ${tagBd}` }}>
                              <CatIcon icon={cat.icon} size={10} /> {a.category}
                            </span>
                            {timeLabel ? (
                              <span className="edur" title={`${a.duration || 60}min`}>{timeLabel}</span>
                            ) : (
                              <span className="edur"><Clock size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} /> {a.duration || 60}m</span>
                            )}
                          </div>
                        </div>
                        <div className="ea">
                          <button className="ib" onClick={() => openEdit(a)} aria-label={`Edit ${a.name}`}>
                            <Pencil size={12} />
                          </button>
                          <button className="ib del" onClick={() => delActivity(a.id, a.name)} aria-label={`Delete ${a.name}`}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  }) : !isBreak && null}
                </div>
                <div className="tla">
                  <button className={`btn ${availMins <= 0 || isFuture ? 'bg2' : 'bs'} bxs`}
                    disabled={availMins <= 0 || isFuture}
                    onClick={() => {
                      if (window.__activityModal) window.__activityModal.open(slot, null, selectedDate)
                    }}>
                    {isFuture ? 'Future' : availMins <= 0 ? 'Slot Full' : '+ Log'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}