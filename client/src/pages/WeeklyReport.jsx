import { useState } from 'react'
import { useActivities } from '../context/ActivitiesContext'
import { useToast } from '../context/ToastContext'
import { weekStart, getSlots, getToday, DAYS, H, M, hexToRgba, esc } from '../lib/helpers'
import { generateAISummary } from '../api/ai'
import { Download } from 'lucide-react'

export default function WeeklyReport({ profile }) {
  const { activities } = useActivities()
  const { toast } = useToast()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const categories = profile?.categories || []

  const settings = profile?.settings || {}
  const ws = weekStart()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const wa = activities.filter(a => days.includes(a.date))
  const tm = wa.reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
  const wm = wa.filter(a => {
    const cat = categories.find(c => c.id === a.category)
    return cat?.name !== 'Break'
  }).reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
  const bm = wa.filter(a => {
    const cat = categories.find(c => c.id === a.category)
    return cat?.name === 'Break'
  }).reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
  const sc = tm > 0 ? Math.round((wm / tm) * 100) : 0

  let streak = 0
  let dd = new Date(getToday())
  while (true) {
    const ds = dd.toISOString().split('T')[0]
    if (activities.some(a => a.date === ds)) { streak++; dd.setDate(dd.getDate() - 1) } else break
  }

  const taskCount = {}
  wa.forEach(a => { taskCount[a.name] = (taskCount[a.name] || 0) + 1 })
  const topTasks = Object.entries(taskCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const dayMins = days.map(d =>
    activities.filter(a => a.date === d).reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
  )
  const maxDay = Math.max(...dayMins, 1)

  const catMap = {}
  wa.forEach(a => {
    catMap[a.category] = (catMap[a.category] || 0) + (parseInt(a.duration) || 60)
  })

  const slots = getSlots(settings.workStart || '09:00', settings.workEnd || '18:00')

  function getCat(id) {
    return categories.find(c => c.id === id) || { id, name: id, icon: '📌', color: '#3b82f6' }
  }

  async function genAI() {
    setAiLoading(true)
    setAiResult(null)
    try {
      const summ = wa.map(a =>
        `${a.date} ${a.slot}: [${a.category}] ${a.name}${a.notes ? ' — ' + a.notes : ''}`
      ).join('\n') || 'No activities logged.'
      const result = await generateAISummary(summ)
      setAiResult(result)
    } catch {
      setAiResult(null)
      toast('AI generation failed. Server may not be running.', 'er')
    }
    setAiLoading(false)
  }

  return (
    <>
      <div className="sg m5">
        <div className="sc scg">
          <div className="sl2">Focus Score</div>
          <div className="sv">{sc}<span>%</span></div>
          <div className="su2">work vs total</div>
        </div>
        <div className="sc scb">
          <div className="sl2">Total Logged</div>
          <div className="sv">{H(tm)}<span>h</span>{M(tm)}<span>m</span></div>
          <div className="su2">{wa.length} activities</div>
        </div>
        <div className="sc sco">
          <div className="sl2">Productive</div>
          <div className="sv">{H(wm)}<span>h</span>{M(wm)}<span>m</span></div>
          <div className="su2">excl. breaks</div>
        </div>
        <div className="sc scgr">
          <div className="sl2">Day Streak</div>
          <div className="sv">{streak}<span> days</span></div>
          <div className="su2">consecutive logging</div>
        </div>
      </div>

      <div className="tc2 m4">
        <div className="card">
          <div className="ch"><div className="ct">Daily Hours</div></div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
              {days.map((d, i) => {
                const pct = Math.round((dayMins[i] / maxDay) * 100) || 0
                const isT = d === getToday()
                return (
                  <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: '100%', background: isT ? 'var(--ac)' : 'var(--bd2)',
                      borderRadius: '4px 4px 0 0', height: `${Math.max(3, pct)}%`,
                      minHeight: 3, transition: 'height .5s ease',
                    }} />
                    <div style={{
                      fontSize: 9, color: isT ? 'var(--ac)' : 'var(--tx3)',
                      fontWeight: isT ? 700 : 400,
                    }}>{DAYS[new Date(d + 'T12:00:00').getDay()]}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '10.5px', color: 'var(--tx3)', fontFamily: 'var(--mo)' }}>
              <span>{Math.min(...dayMins.filter(x => x > 0), 0) || 0}m</span>
              <span>avg {Math.round(tm / 7)}m</span>
              <span>{Math.max(...dayMins, 0)}m</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="ch"><div className="ct">Category Breakdown</div></div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([cat, min]) => {
              const c = getCat(cat)
              const col = c.color
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: col, fontWeight: 600 }}>{c.icon} {cat}</span>
                    <span style={{ fontFamily: 'var(--mo)', color: 'var(--tx2)' }}>
                      {H(min)}h {M(min)}m · {tm > 0 ? Math.round((min / tm) * 100) : 0}%
                    </span>
                  </div>
                  <div className="pb">
                    <div className="pf" style={{
                      width: `${tm > 0 ? Math.round((min / tm) * 100) : 0}%`,
                      background: col,
                    }} />
                  </div>
                </div>
              )
            })}
            {!Object.keys(catMap).length && <div style={{ color: 'var(--tx3)', fontSize: '12.5px' }}>No data yet</div>}
          </div>
        </div>
      </div>

      <div className="card m4">
        <div className="ch"><div className="ct">Activity Heatmap</div><div className="cs">Hours × Days</div></div>
        <div style={{ padding: '16px 18px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                {days.map(d => (
                  <th key={d} style={{
                    fontSize: '9.5px', color: d === getToday() ? 'var(--ac)' : 'var(--tx3)',
                    fontWeight: d === getToday() ? 700 : 500, paddingBottom: 6, textAlign: 'center',
                  }}>
                    {DAYS[new Date(d + 'T12:00:00').getDay()]}<br />
                    <span style={{ fontSize: 9, fontFamily: 'var(--mo)' }}>{d.slice(5)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => (
                <tr key={slot}>
                  <td style={{ fontSize: '9.5px', fontFamily: 'var(--mo)', color: 'var(--tx3)', paddingRight: 8, whiteSpace: 'nowrap' }}>
                    {slot.split(' - ')[0]}
                  </td>
                  {days.map(d => {
                    const sm = activities.filter(a => a.date === d && a.slot === slot)
                      .reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
                    const alpha = sm > 0 ? Math.min(0.9, 0.15 + sm / 120 * 0.75) : 0.06
                    return (
                      <td key={d} style={{ padding: 2 }}>
                        <div style={{
                          width: '100%', aspectRatio: 1, borderRadius: 3,
                          background: `rgba(0,212,170,${alpha.toFixed(2)})`,
                        }} title={`${d} ${slot}: ${sm}m`} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: '10.5px', color: 'var(--tx3)' }}>
            <span>Less</span>
            {[0.06, 0.25, 0.45, 0.65, 0.85].map(a => (
              <div key={a} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(0,212,170,${a})` }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="tc2 m4">
        <div className="card">
          <div className="ch"><div className="ct">Top Activities</div><div className="cs">Most frequent</div></div>
          <div style={{ padding: '10px 18px' }}>
            {topTasks.length ? topTasks.map(([nm, cnt], i) => (
              <div key={nm} className="top-task">
                <div className="top-rank" style={
                  i === 0 ? { background: 'rgba(234,179,8,.15)', color: '#eab308' } :
                  i === 1 ? { background: 'rgba(160,160,160,.1)', color: '#9ca3af' } :
                  {}
                }>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0, fontSize: '12.5px', fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {esc(nm)}
                </div>
                <div style={{ fontSize: 11, fontFamily: 'var(--mo)', color: 'var(--tx2)' }}>{cnt}×</div>
              </div>
            )) : <div style={{ color: 'var(--tx3)', fontSize: '12.5px', padding: '10px 0' }}>No data yet</div>}
          </div>
        </div>

        <div className="card">
          <div className="ch"><div className="ct">Week at a Glance</div></div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Days logged</span>
              <span style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--tx)', fontWeight: 700 }}>
                {days.filter(d => activities.some(a => a.date === d)).length} / 7
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Break time</span>
              <span style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--tx)' }}>{H(bm)}h {M(bm)}m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Avg tasks/day</span>
              <span style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--tx)' }}>
                {days.filter(d => activities.some(a => a.date === d)).length
                  ? Math.round(wa.length / Math.max(1, days.filter(d => activities.some(a => a.date === d)).length))
                  : 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Unique tasks</span>
              <span style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--tx)' }}>
                {new Set(wa.map(a => a.name)).size}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>Streak</span>
              <span style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--ac)', fontWeight: 700 }}>
                {streak} 🔥
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, minHeight: 30 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 700, lineHeight: 1.3 }}>📊 Export Report</div>
        <button className="btn bp bsm" onClick={() => { if (window.__openExport) window.__openExport() }}>
          <Download size={13} /> Generate Report
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, minHeight: 30 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 700, lineHeight: 1.3 }}>🤖 AI Productivity Summary</div>
        <button className="btn bs bsm" onClick={genAI} disabled={aiLoading}>
          {aiLoading ? 'Generating…' : 'Generate →'}
        </button>
      </div>
      <div id="ai_area">
        <div className="aibox">
          <div className="ailbl">AI Summary</div>
          <div className="aitxt" style={aiLoading ? { color: 'var(--tx2)' } : aiResult ? {} : { color: 'var(--tx2)' }}>
            {aiLoading ? (
              <span className="puls">Analyzing…</span>
            ) : aiResult ? (
              aiResult
            ) : (
              'Click "Generate" for a personalized productivity analysis.'
            )}
          </div>
        </div>
      </div>
    </>
  )
}
