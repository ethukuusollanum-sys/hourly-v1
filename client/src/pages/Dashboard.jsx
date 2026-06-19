import { useActivities } from '../context/ActivitiesContext'
import { useToast } from '../context/ToastContext'
import { getSlots, getBreakSlots, getToday, H, M, hexToRgba, esc, sortByCreatedAsc } from '../lib/helpers'
import { supabase } from '../config/supabase'
import { Pencil, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import useBreakSync from '../hooks/useBreakSync'

export default function Dashboard({ profile }) {
  const { user } = useAuth()
  const { activities, setActivities } = useActivities()
  const { toast } = useToast()
  const today = getToday()
  const settings = profile?.settings || {}
  const categories = profile?.categories || []

  const ta = activities.filter(a => a.date === today)
  const wm = ta.filter(a => {
    const cat = categories.find(c => c.id === a.category)
    return cat?.name !== 'Break'
  }).reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
  const tm = ta.reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
  const slots = getSlots(settings.workStart || '09:00', settings.workEnd || '18:00')
  // Reconcile auto-break rows for today against the configured break window.
  useBreakSync(user, settings, activities)
  const breakSlots = new Set(getBreakSlots(settings, slots).map(d => d.slot))
  const filled = new Set(ta.map(a => a.slot))
  const nh = new Date().getHours().toString().padStart(2, '0')

  function getCat(id) {
    return categories.find(c => c.id === id) || { id, name: id, icon: '📌', color: '#3b82f6' }
  }

  function openEdit(act) {
    if (window.__activityModal) {
      window.__activityModal.open(act.slot, {
        id: act.id,
        name: act.name,
        category: act.category,
        duration: act.duration,
        notes: act.notes,
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

      <div className="card">
        <div className="ch">
          <div className="ct">Today's Timeline</div>
          <div className="cs">{today} · {slots.length} hour slots</div>
        </div>
        <div>
          {slots.map(slot => {
            const sa = ta.filter(a => a.slot === slot)
              .sort(sortByCreatedAsc)
            const isn = slot.split(':')[0] === nh
            const isBreak = breakSlots.has(slot)
            const tasks = sa.filter(a => !a.is_break)
            return (
              <div key={slot} className={`tlr${isBreak ? ' brk' : ''}`}>
                <div className="tlt">
                  <span className={`tbg${isn ? ' nw' : ''}`}>
                    {isn ? '▶ ' : ''}{slot.split(' - ')[0]}
                  </span>
                </div>
                <div className="tles">
                  {isBreak && (
                    <div className="ec brk-card">
                      <div className="edot" style={{ background: '#f97316', boxShadow: '0 0 5px #f9731666' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="en">☕ Break</div>
                        <div className="eno">Scheduled break</div>
                      </div>
                    </div>
                  )}
                  {tasks.length ? tasks.map(a => {
                    const cat = getCat(a.category)
                    const col = cat.color
                    const tagBg = hexToRgba(col, 0.12)
                    const tagBd = hexToRgba(col, 0.25)
                    return (
                      <div key={a.id} className="ec">
                        <div className="edot" style={{ background: col, boxShadow: `0 0 5px ${col}66` }} />
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 40 }}>
                          <div className="en">{esc(a.name)}</div>
                          {a.notes && <div className="eno">{esc(a.notes)}</div>}
                          <div className="em">
                            <span className="tag" style={{ background: tagBg, color: col, border: `1px solid ${tagBd}` }}>
                              {cat.icon} {a.category}
                            </span>
                            <span className="edur">⏱ {a.duration || 60}m</span>
                          </div>
                        </div>
                        <div className="ea">
                          <button className="ib" onClick={() => openEdit(a)} title="Edit">
                            <Pencil size={12} />
                          </button>
                          <button className="ib del" onClick={() => delActivity(a.id, a.name)} title="Delete">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  }) : !isBreak && <div className="emp">No log yet</div>}
                </div>
                <div className="tla">
                  <button className="btn bs bxs" onClick={() => {
                    if (window.__activityModal) window.__activityModal.open(slot)
                  }}>+ Log</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
