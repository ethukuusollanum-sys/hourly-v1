import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivities } from '../context/ActivitiesContext'
import { useToast } from '../context/ToastContext'
import { getSlots, getBreakSlots, getToday, DAYS, H, M, hexToRgba, esc, timeToMin, weekStart as wsFn } from '../lib/helpers'
import { generateAISummary } from '../api/ai'
import { Download, ChevronLeft, ChevronRight, Share2, Calendar, Clock, Coffee, Target, Activity, TrendingUp, ListChecks, Brain, ArrowRight } from 'lucide-react'

export default function WeeklyReport({ profile }) {
  const { activities } = useActivities()
  const { toast } = useToast()
  const navigate = useNavigate()
  const categories = profile?.categories || []
  const [weekOffset, setWeekOffset] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const contentRef = useRef(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)

  const weekRange = useMemo(() => {
    const w = wsFn()
    w.setDate(w.getDate() + weekOffset * 7)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(w)
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })
    return days
  }, [weekOffset])

  const weekLabel = useMemo(() => {
    const start = new Date(weekRange[0] + 'T12:00:00')
    const end = new Date(weekRange[6] + 'T12:00:00')
    const opts = { month: 'short', day: 'numeric' }
    const yOpts = { year: 'numeric' }
    const sameMonth = start.getMonth() === end.getMonth()
    return sameMonth
      ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`
      : `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }, [weekRange])

  const isCurrentWeek = weekOffset === 0

  const wa = useMemo(() => activities.filter(a => weekRange.includes(a.date)), [activities, weekRange])

  const settings = profile?.settings || {}
  const breakConfigs = settings?.breakSlots || []
  const workStart = settings?.workStart || '09:00'
  const workEnd = settings?.workEnd || '18:00'
  const workingDays = settings?.workingDays || [1, 2, 3, 4, 5, 6]

  const workingDaysInWeek = useMemo(() =>
    weekRange.filter(d => workingDays.includes(new Date(d + 'T12:00:00').getDay())),
  [weekRange, workingDays])

  const scheduledBreakInfo = useMemo(() => {
    const allDaySlots = getSlots(workStart, workEnd)
    const dailyBreakData = getBreakSlots({ breakSlots: breakConfigs }, allDaySlots)
    const minsPerDay = dailyBreakData.reduce((s, b) => s + (b.duration || 0), 0)
    const maxBreak = breakConfigs.length
      ? Math.max(...breakConfigs.map(b => timeToMin(b.end) - timeToMin(b.start)))
      : 0
    return { minsPerDay, sessionsPerDay: breakConfigs.length, maxBreak }
  }, [breakConfigs, workStart, workEnd])

  const stats = useMemo(() => {
    const loggedWork = wa.filter(a => {
      const cat = categories.find(c => c.id === a.category)
      return cat?.name !== 'Break'
    }).reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
    const loggedBreaks = wa.filter(a => {
      const cat = categories.find(c => c.id === a.category)
      return cat?.name === 'Break'
    }).reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
    const loggedBreakSessions = wa.filter(a => {
      const cat = categories.find(c => c.id === a.category)
      return cat?.name === 'Break'
    }).length

    const workingDayCount = workingDaysInWeek.length
    const schedMins = scheduledBreakInfo.minsPerDay * workingDayCount
    const schedSessions = scheduledBreakInfo.sessionsPerDay * workingDayCount

    const totalBreaks = loggedBreaks + schedMins
    const totalTracked = loggedWork + totalBreaks
    const focusScore = totalTracked > 0 ? Math.round((loggedWork / totalTracked) * 100) : 0

    const workSessions = wa.filter(a => {
      const cat = categories.find(c => c.id === a.category)
      return cat?.name !== 'Break'
    }).length
    const breakSessions = loggedBreakSessions + schedSessions
    const activeDays = new Set(wa.map(a => a.date)).size

    const dayMins = workingDaysInWeek.map(d =>
      (wa.filter(a => a.date === d).reduce((s, a) => s + (parseInt(a.duration) || 60), 0)) + scheduledBreakInfo.minsPerDay
    )
    const maxDay = Math.max(...dayMins, 0)
    const minDay = activeDays > 0 ? Math.min(...dayMins.filter(x => x > 0), 0) : 0
    const maxDayIdx = dayMins.indexOf(maxDay)
    const minDayIdx = activeDays > 0 ? dayMins.indexOf(minDay) : -1
    const offDays = weekRange.length - workingDayCount

    const sessionDurs = wa
      .filter(a => {
        const cat = categories.find(c => c.id === a.category)
        return cat?.name !== 'Break'
      })
      .map(a => parseInt(a.duration) || 60)
    const breakDurs = wa
      .filter(a => {
        const cat = categories.find(c => c.id === a.category)
        return cat?.name === 'Break'
      })
      .map(a => parseInt(a.duration) || 60)

    const longestWork = sessionDurs.length ? Math.max(...sessionDurs) : 0
    const longestBreak = Math.max(scheduledBreakInfo.maxBreak, ...breakDurs, 0)

    const taskCount = {}
    wa.forEach(a => { taskCount[a.name] = (taskCount[a.name] || 0) + 1 })
    const mostFreq = Object.entries(taskCount).sort((a, b) => b[1] - a[1])[0]

    return {
      total: totalTracked, work: loggedWork, breaks: totalBreaks,
      workSessions, breakSessions, activeDays, focusScore,
      maxDay, minDay, maxDayIdx, minDayIdx, longestWork, longestBreak,
      mostFreq: mostFreq || null, dayMins,
      schedMins, loggedBreaks, workingDayCount, offDays,
    }
  }, [wa, categories, weekRange, scheduledBreakInfo, workingDaysInWeek])

  function goWeek(offset) {
    setWeekOffset(offset)
    setAnimKey(k => k + 1)
  }

  const dayLabels = useMemo(() => weekRange.map(d => DAYS[new Date(d + 'T12:00:00').getDay()]), [weekRange])
  const workingDayLabels = useMemo(() => workingDaysInWeek.map(d => DAYS[new Date(d + 'T12:00:00').getDay()]), [workingDaysInWeek])

  const catMap = useMemo(() => {
    const m = {}
    wa.forEach(a => {
      m[a.category] = (m[a.category] || 0) + (parseInt(a.duration) || 60)
    })
    if (scheduledBreakInfo.minsPerDay > 0) {
      const schedTotal = scheduledBreakInfo.minsPerDay * workingDaysInWeek.length
      m['Break'] = (m['Break'] || 0) + schedTotal
    }
    return m
  }, [wa, scheduledBreakInfo, workingDaysInWeek])

  const slots = getSlots(profile?.settings?.workStart || '09:00', profile?.settings?.workEnd || '18:00')

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

  async function handleShare() {
    const text = `Weekly Report (${weekLabel})\nWork: ${H(stats.work)}h ${M(stats.work)}m | Break: ${H(stats.breaks)}h ${M(stats.breaks)}m\nFocus Score: ${stats.focusScore}% | Activities: ${wa.length}\nLogged by Hourly Tracker`
    try {
      await navigator.share({ title: 'Weekly Report', text })
    } catch {
      await navigator.clipboard.writeText(text)
      toast('Report copied to clipboard', 'inf')
    }
  }

  async function handleExport() {
    if (window.__openExport) window.__openExport()
  }

  return (
    <div>
      {/* Week Navigation */}
      <div className="card m4" style={{ position: 'sticky', top: 60, zIndex: 10, background: 'var(--sf)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
          <button className="ib" onClick={() => goWeek(weekOffset - 1)} aria-label="Previous week">
            <ChevronLeft size={16} />
          </button>
          <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => {
            const picker = document.createElement('input')
            picker.type = 'date'
            picker.style.display = 'none'
            document.body.appendChild(picker)
            picker.addEventListener('change', () => {
              if (picker.value) {
                const d = new Date(picker.value + 'T12:00:00')
                const day = d.getDay()
                const diff = d.getDate() - day
                d.setDate(diff)
                const ref = wsFn()
                const diffWeeks = Math.round((d - ref) / (7 * 86400000))
                goWeek(diffWeeks)
              }
              document.body.removeChild(picker)
            })
            picker.click()
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{weekLabel}</div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', fontFamily: 'var(--mo)', marginTop: 1 }}>
              {isCurrentWeek ? 'This Week' : `${Math.abs(weekOffset)} week${Math.abs(weekOffset) > 1 ? 's' : ''} ${weekOffset < 0 ? 'ago' : 'ahead'}`}
            </div>
          </div>
          <button className="ib" onClick={() => goWeek(weekOffset + 1)} aria-label="Next week">
            <ChevronRight size={16} />
          </button>
        </div>
        {!isCurrentWeek && (
          <div style={{ padding: '0 14px 8px', textAlign: 'center' }}>
            <button className="btn bs bsm" onClick={() => goWeek(0)} style={{ fontSize: 11 }}><Calendar size={11} /> Back to This Week</button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div key={`stats-${animKey}`} ref={contentRef} className="sg m4" style={{ animation: 'fi .25s ease' }}>
        <div className="sc scg">
          <div className="sl2">Focus Score</div>
          <div className="sv">{stats.focusScore}<span>%</span></div>
          <div className="su2">work vs total</div>
        </div>
        <div className="sc scb">
          <div className="sl2">Work Time</div>
          <div className="sv">{H(stats.work)}<span>h</span>{M(stats.work)}<span>m</span></div>
          <div className="su2">{stats.workSessions} sessions</div>
        </div>
        <div className="sc sco">
          <div className="sl2">Break Time</div>
          <div className="sv">{H(stats.breaks)}<span>h</span>{M(stats.breaks)}<span>m</span></div>
          <div className="su2">{stats.breakSessions} breaks</div>
        </div>
        <div className="sc scgr">
          <div className="sl2">Days Active</div>
          <div className="sv">{stats.activeDays}<span> / {stats.workingDayCount}</span></div>
          <div className="su2">{wa.length} total activities</div>
        </div>
      </div>

      <div key={`stats2-${animKey}`} className="sg m4" style={{ animation: 'fi .3s ease' }}>
        <div className="sc" style={{ '--ac': 'var(--bl)' }}>
          <div className="sl2">Avg / Day</div>
          <div className="sv">{H(Math.round(stats.total / Math.max(1, stats.activeDays)))}<span>h</span>{M(Math.round(stats.total / Math.max(1, stats.activeDays)))}<span>m</span></div>
          <div className="su2">across active days</div>
        </div>
        <div className="sc" style={{ '--ac': 'var(--pu)' }}>
          <div className="sl2">Most Active</div>
          <div className="sv" style={{ fontSize: 18 }}>
            {stats.maxDayIdx >= 0 ? dayLabels[stats.maxDayIdx] : '–'}
          </div>
          <div className="su2">{H(stats.maxDay)}h {M(stats.maxDay)}m</div>
        </div>
        <div className="sc" style={{ '--ac': 'var(--or)' }}>
          <div className="sl2">Least Active</div>
          <div className="sv" style={{ fontSize: 18 }}>
            {stats.minDayIdx >= 0 ? dayLabels[stats.minDayIdx] : '–'}
          </div>
          <div className="su2">{H(stats.minDay)}h {M(stats.minDay)}m</div>
        </div>
        <div className="sc scp">
          <div className="sl2">Activities</div>
          <div className="sv">{wa.length}<span> total</span></div>
          <div className="su2">
            {stats.mostFreq ? `Most: ${esc(stats.mostFreq[0])}` : 'No data yet'}
          </div>
        </div>
      </div>

      {/* Work vs Break Doughnut + Daily Hours */}
      <div className="tc2 m4">
        <div className="card">
          <div className="ch"><div className="ct">Work vs Break</div></div>
          <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: stats.total > 0
                ? `conic-gradient(var(--ac) 0% ${stats.focusScore}%, #f97316 ${stats.focusScore}% 100%)`
                : 'var(--bd)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', flexShrink: 0,
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: 'var(--sf)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
              }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', fontFamily: 'var(--mo)' }}>{stats.focusScore}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11.5, fontFamily: 'var(--mo)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ac)' }} /> Work {H(stats.work)}h {M(stats.work)}m</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} /> Break {H(stats.breaks)}h {M(stats.breaks)}m</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="ch"><div className="ct">Daily Hours</div></div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
              {workingDaysInWeek.map((d, i) => {
                const pct = stats.maxDay > 0 ? Math.round((stats.dayMins[i] / stats.maxDay) * 100) || 0 : 0
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
                    }}>{workingDayLabels[i]}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '10.5px', color: 'var(--tx3)', fontFamily: 'var(--mo)' }}>
              <span>{H(stats.minDay)}h {M(stats.minDay)}m</span>
              <span>avg {H(Math.round(stats.total / stats.workingDayCount))}h {M(Math.round(stats.total / stats.workingDayCount))}m</span>
              <span>{H(stats.maxDay)}h {M(stats.maxDay)}m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="card m4">
        <div className="ch"><div className="ct">Weekly Summary</div></div>
        <div style={{ padding: '4px 18px' }}>
          <div className="cat-row">
            <div style={{ flex: 1, fontSize: 12, color: 'var(--tx2)' }}>Work Sessions</div>
            <div style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--tx)', fontWeight: 600 }}>{stats.workSessions}</div>
          </div>
          <div className="cat-row">
            <div style={{ flex: 1, fontSize: 12, color: 'var(--tx2)' }}>Break Sessions</div>
            <div style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--tx)', fontWeight: 600 }}>{stats.breakSessions}</div>
          </div>
          <div className="cat-row">
            <div style={{ flex: 1, fontSize: 12, color: 'var(--tx2)' }}>Scheduled Break Time</div>
            <div style={{ fontFamily: 'var(--mo)', fontSize: 13, color: '#f97316', fontWeight: 600 }}>{H(stats.schedMins)}h {M(stats.schedMins)}m</div>
          </div>
          <div className="cat-row">
            <div style={{ flex: 1, fontSize: 12, color: 'var(--tx2)' }}>Logged Break Time</div>
            <div style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--tx)' }}>{H(stats.loggedBreaks)}h {M(stats.loggedBreaks)}m</div>
          </div>
          <div className="cat-row">
            <div style={{ flex: 1, fontSize: 12, color: 'var(--tx2)' }}>Longest Work Session</div>
            <div style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--tx)' }}>{H(stats.longestWork)}h {M(stats.longestWork)}m</div>
          </div>
          <div className="cat-row">
            <div style={{ flex: 1, fontSize: 12, color: 'var(--tx2)' }}>Longest Break</div>
            <div style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--tx)' }}>{H(stats.longestBreak)}h {M(stats.longestBreak)}m</div>
          </div>
          <div className="cat-row" style={{ borderBottom: 'none' }}>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--tx2)' }}>
              {stats.mostFreq ? 'Most Frequent Task' : 'Most Frequent'}
            </div>
            <div style={{ fontFamily: 'var(--mo)', fontSize: 13, color: 'var(--ac)', fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
              {stats.mostFreq ? `${esc(stats.mostFreq[0])} (${stats.mostFreq[1]}×)` : 'No data'}
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card m4">
        <div className="ch"><div className="ct">Activity Categories</div></div>
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([cat, min]) => {
            const c = getCat(cat)
            const col = c.color
            return (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: col, fontWeight: 600 }}>{c.icon} {cat}</span>
                  <span style={{ fontFamily: 'var(--mo)', color: 'var(--tx2)' }}>
                    {H(min)}h {M(min)}m · {stats.total > 0 ? Math.round((min / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="pb">
                  <div className="pf" style={{
                    width: `${stats.total > 0 ? Math.round((min / stats.total) * 100) : 0}%`,
                    background: col,
                  }} />
                </div>
              </div>
            )
          })}
          {!Object.keys(catMap).length && <div style={{ color: 'var(--tx3)', fontSize: '12.5px' }}>No data yet</div>}
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="card m4">
        <div className="ch"><div className="ct">Activity Heatmap</div><div className="cs">Hours × Days</div></div>
        <div style={{ padding: '16px 18px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                {weekRange.map(d => (
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
                  {weekRange.map(d => {
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

      {/* Top Activities */}
      <div className="card m4">
        <div className="ch"><div className="ct">Top Activities</div><div className="cs">Most frequent</div></div>
        <div style={{ padding: '10px 18px' }}>
          {stats.mostFreq ? (
            Object.entries(
              wa.reduce((acc, a) => {
                acc[a.name] = (acc[a.name] || 0) + 1
                return acc
              }, {})
            ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nm, cnt], i) => (
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
            ))
          ) : <div style={{ color: 'var(--tx3)', fontSize: '12.5px', padding: '10px 0' }}>No data yet</div>}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card m4">
        <div className="ch"><div className="ct">Quick Actions</div></div>
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn bs bfw" onClick={handleExport} style={{ justifyContent: 'flex-start', gap: 10, padding: '0 16px' }}>
            <Download size={14} /> Export Weekly Report
          </button>
          <button className="btn bs bfw" onClick={handleShare} style={{ justifyContent: 'flex-start', gap: 10, padding: '0 16px' }}>
            <Share2 size={14} /> Share Weekly Report
          </button>
          <button className="btn bs bfw" onClick={() => navigate('/daily')} style={{ justifyContent: 'flex-start', gap: 10, padding: '0 16px' }}>
            <ListChecks size={14} /> View Detailed Logs <ArrowRight size={12} style={{ marginLeft: 'auto' }} />
          </button>
        </div>
      </div>

      {/* AI Summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, minHeight: 30 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 700, lineHeight: 1.3 }}><Brain size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> AI Productivity Summary</div>
        <button className="btn bs bsm" onClick={genAI} disabled={aiLoading}>
          {aiLoading ? 'Generating…' : 'Generate →'}
        </button>
      </div>
      <div id="ai_area" style={{ marginBottom: 16 }}>
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
    </div>
  )
}
