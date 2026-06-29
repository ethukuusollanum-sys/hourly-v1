export default {
  name: 'local',

  async generate({ type, activities, categories, settings, dateRange }) {
    const stats = computeStats(activities, categories, settings, dateRange)
    const summary = buildSummary(type, stats, categories)
    const recommendations = buildRecommendations(stats, settings)
    return { summary, recommendations, stats }
  }
}

function fmt(val) {
  return Math.round(val * 10) / 10
}

function getCategoryName(catId, categories) {
  const c = categories.find(x => x.id === catId)
  return c ? c.name : catId
}

function timeStr(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function dayName(dateStr) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date(dateStr + 'T12:00:00').getDay()]
}

function hourLabel(min) {
  const h = Math.floor(min / 60)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:00 ${ampm}`
}

function getDatesInRange(start, end) {
  const dates = []
  const d = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (d <= endDate) {
    dates.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function getScheduledBreakMins(settings) {
  const breakConfigs = settings?.breakSlots || []
  if (!breakConfigs.length) return 0
  const workStart = settings?.workStart || '09:00'
  const workEnd = settings?.workEnd || '18:00'
  const startMin = timeToMin(workStart)
  const endMin = timeToMin(workEnd)
  let total = 0
  for (const b of breakConfigs) {
    const bs = timeToMin(b.start)
    const be = timeToMin(b.end)
    const clampedStart = Math.max(bs, startMin)
    const clampedEnd = Math.min(be, endMin)
    if (clampedEnd > clampedStart) total += clampedEnd - clampedStart
  }
  return total
}

function timeToMin(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function computeStats(activities, categories, settings, dateRange) {
  const { start, end } = dateRange
  const allDates = getDatesInRange(start, end)
  const workingDays = settings?.workingDays || [1, 2, 3, 4, 5, 6]
  const workingDates = allDates.filter(d => workingDays.includes(new Date(d + 'T12:00:00').getDay()))
  const weekLen = allDates.length
  const schedBreakMinsPerDay = getScheduledBreakMins(settings)
  const schedBreakMins = schedBreakMinsPerDay * workingDates.length

  const timeLog = []
  const byDate = {}
  const byHour = {}
  const byCategory = {}
  const byActivity = {}
  let totalWork = 0
  let totalBreakLogged = 0
  let workSessions = 0
  let breakSessionsLogged = 0
  let sessionDurs = []
  let breakDurs = []

  for (const a of activities) {
    const dur = parseInt(a.duration) || 60
    const cat = categories.find(c => c.id === a.category)
    const isBreak = cat?.name === 'Break'

    if (isBreak) {
      totalBreakLogged += dur
      breakSessionsLogged++
      breakDurs.push(dur)
    } else {
      totalWork += dur
      workSessions++
      sessionDurs.push(dur)
    }

    const d = a.date
    if (!byDate[d]) byDate[d] = { work: 0, break: 0, sessions: 0 }
    byDate[d].sessions++
    if (isBreak) byDate[d].break += dur
    else byDate[d].work += dur

    byCategory[a.category] = (byCategory[a.category] || 0) + dur

    byActivity[a.name] = (byActivity[a.name] || 0) + 1

    if (a.slot) {
      const startH = parseInt(a.slot.split(' - ')[0]?.split(':')[0])
      if (!isNaN(startH)) {
        byHour[startH] = (byHour[startH] || 0) + dur
      }
    }

    timeLog.push({ date: a.date, time: timeToMin(a.slot?.split(' - ')[0]), dur, isBreak, name: a.name })
  }

  timeLog.sort((a, b) => a.date.localeCompare(b.date) || a.time - b.time)

  const totalBreak = totalBreakLogged + schedBreakMins
  const totalTracked = totalWork + totalBreak
  const focusScore = totalTracked > 0 ? Math.round((totalWork / totalTracked) * 100) : 0
  const activeDays = Object.keys(byDate).length
  const dayMins = allDates.map(d => (byDate[d]?.work || 0) + (byDate[d]?.break || 0) + schedBreakMinsPerDay)
  const maxDayMins = Math.max(...dayMins, 0)
  const minDayMins = activeDays > 0 ? Math.min(...dayMins.filter(m => m > 0), 0) : 0
  const maxDayIdx = dayMins.indexOf(maxDayMins)
  const minDayIdx = activeDays > 0 ? dayMins.indexOf(minDayMins) : -1

  const sortedHours = Object.entries(byHour).sort((a, b) => b[1] - a[1])
  const mostActiveHour = sortedHours.length > 0 ? parseInt(sortedHours[0][0]) : null

  const sortedActivities = Object.entries(byActivity).sort((a, b) => b[1] - a[1])
  const mostFrequent = sortedActivities.length > 0 ? sortedActivities[0] : null

  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  const longestWork = sessionDurs.length > 0 ? Math.max(...sessionDurs) : 0
  const longestBreak = breakDurs.length > 0 ? Math.max(...breakDurs, schedBreakMinsPerDay) : schedBreakMinsPerDay

  const avgWorkSession = sessionDurs.length > 0 ? Math.round(totalWork / sessionDurs.length) : 0
  const avgBreakSession = breakDurs.length > 0 ? Math.round(totalBreakLogged / breakDurs.length) : 0

  let idleGaps = 0
  let idleMins = 0
  for (let i = 1; i < timeLog.length; i++) {
    const prev = timeLog[i - 1]
    const cur = timeLog[i]
    if (prev.date === cur.date && prev.time > 0 && cur.time > 0) {
      const gap = cur.time - (prev.time + (prev.isBreak ? 0 : (sessionDurs[0] || 60)))
      if (gap > 15 && gap < 240) {
        idleGaps++
        idleMins += gap
      }
    }
  }

  const datesWorked = Object.keys(byDate).filter(d => (byDate[d]?.work || 0) > 0)
  const workMinsByDay = datesWorked.map(d => byDate[d]?.work || 0)
  const avgDailyWork = datesWorked.length > 0 ? Math.round(totalWork / datesWorked.length) : 0

  let trend = 'stable'
  if (datesWorked.length >= 4) {
    const half = Math.floor(datesWorked.length / 2)
    const firstHalf = datesWorked.slice(0, half).reduce((s, d) => s + (byDate[d]?.work || 0), 0)
    const secondHalf = datesWorked.slice(half).reduce((s, d) => s + (byDate[d]?.work || 0), 0)
    const ratio = firstHalf > 0 ? secondHalf / firstHalf : 1
    if (ratio > 1.15) trend = 'improving'
    else if (ratio < 0.85) trend = 'declining'
  }

  const breakSessionsTotal = breakSessionsLogged + (schedBreakMinsPerDay > 0 ? workingDates.length : 0)

  return {
    totalWork,
    totalBreak,
    totalBreakLogged,
    schedBreakMins,
    totalTracked,
    workSessions,
    breakSessions: breakSessionsTotal,
    activeDays,
    focusScore,
    dayMins,
    maxDayMins,
    minDayMins,
    maxDayIdx,
    minDayIdx,
    longestWork,
    longestBreak,
    mostFrequent,
    mostActiveHour,
    sortedCategories,
    sortedActivities,
    allDates,
    workingDates,
    avgWorkSession,
    avgBreakSession,
    idleGaps,
    idleMinutes: idleMins,
    avgDailyWork,
    trend,
    dateRange: { start, end },
    type,
    byDate,
  }
}

function buildSummary(type, stats, categories) {
  const s = stats
  if (s.totalTracked === 0) return null
  switch (type) {
    case 'daily': return buildDailySummary(s, categories)
    case 'weekly': return buildWeeklySummary(s, categories)
    case 'monthly': return buildMonthlySummary(s, categories)
    default: return buildWeeklySummary(s, categories)
  }
}

function buildDailySummary(s, categories) {
  const dateLabel = dayName(s.dateRange.start) + ', ' + formatDateLabel(s.dateRange.start)
  const parts = [`## 📊 Daily Productivity Summary — ${dateLabel}`]
  parts.push('')
  parts.push(`You completed **${s.workSessions} work sessions** totaling **${timeStr(s.totalWork)}**.`)
  parts.push(`You spent **${timeStr(s.totalBreak)} on breaks** (${timeStr(s.schedBreakMins)} scheduled + ${timeStr(s.totalBreakLogged)} logged),`)
  parts.push(`resulting in a **productivity ratio of ${s.focusScore}%**.`)
  if (s.mostActiveHour !== null) {
    parts.push(`Your most productive period was around **${hourLabel(s.mostActiveHour)}**,`)
    parts.push(`where you logged the highest activity concentration.`)
  }
  if (s.mostFrequent) {
    const top = s.mostFrequent[0]
    parts.push(`Your most frequent activity was **"${top}"** (${s.mostFrequent[1]} sessions).`)
  }
  if (s.sortedCategories.length > 0) {
    const cats = s.sortedCategories.slice(0, 3)
      .map(([id, d]) => `${getCategoryName(id, categories)} (${timeStr(d)})`)
      .join(', ')
    parts.push(`Categories worked on: ${cats}.`)
  }
  if (s.idleGaps > 0) {
    parts.push(`There ${s.idleGaps === 1 ? 'was' : 'were'} **${s.idleGaps} idle gap${s.idleGaps > 1 ? 's' : ''}** totaling ${timeStr(s.idleMinutes)} between sessions.`)
  }
  return parts.join(' ')
}

function buildWeeklySummary(s, categories) {
  const startLabel = formatDateLabel(s.dateRange.start)
  const endLabel = formatDateLabel(s.dateRange.end)
  const parts = [`## 📊 Weekly Productivity Summary — ${startLabel} – ${endLabel}`]
  parts.push('')
  parts.push(`This week you worked **${timeStr(s.totalWork)}** across **${s.activeDays} day${s.activeDays > 1 ? 's' : ''}**.`)
  if (s.maxDayMins > 0 && s.maxDayIdx >= 0 && s.maxDayIdx < s.allDates.length) {
    parts.push(`**${dayName(s.allDates[s.maxDayIdx])}** was your most productive day (${timeStr(s.maxDayMins)}).`)
  }
  if (s.minDayMins > 0 && s.minDayIdx >= 0 && s.minDayIdx < s.allDates.length && s.minDayIdx !== s.maxDayIdx) {
    parts.push(`**${dayName(s.allDates[s.minDayIdx])}** had the lowest activity.`)
  }

  if (s.mostActiveHour !== null) {
    parts.push(`Your peak productivity hour was **${hourLabel(s.mostActiveHour)}**.`)
  }

  parts.push(`Break time totaled **${timeStr(s.totalBreak)}** (${timeStr(s.schedBreakMins)} scheduled + ${timeStr(s.totalBreakLogged)} actual).`)
  parts.push(`Your **focus score averaged ${s.focusScore}%** across the period.`)

  if (s.mostFrequent) {
    const top = s.mostFrequent[0]
    parts.push(`"**${top}**" was your most frequent activity (${s.mostFrequent[1]} sessions).`)
  }

  if (s.sortedCategories.length > 0) {
    const cats = s.sortedCategories.slice(0, 4)
      .map(([id, d]) => `${getCategoryName(id, categories)} (${timeStr(d)})`)
      .join(', ')
    parts.push(`Categories: ${cats}.`)
  }

  const trendMap = { improving: '📈 Your productivity trend is **improving**—great momentum!', declining: '📉 Your productivity trend is **declining**—consider reviewing your schedule.', stable: '📊 Your productivity has remained **stable** this week.' }
  parts.push(trendMap[s.trend] || '')

  if (s.breakSessions > 0) {
    const breakRatio = Math.round((s.totalBreak / s.totalTracked) * 100)
    parts.push(`Break time accounted for **${breakRatio}%** of tracked time.`)
  }

  return parts.join(' ')
}

function buildMonthlySummary(s, categories) {
  const startLabel = formatDateLabel(s.dateRange.start)
  const endLabel = formatDateLabel(s.dateRange.end)
  const parts = [`## 📊 Monthly Productivity Summary — ${startLabel} – ${endLabel}`]
  parts.push('')
  parts.push(`This month you worked **${timeStr(s.totalWork)}** across **${s.activeDays} day${s.activeDays > 1 ? 's' : ''}**`)

  if (s.maxDayMins > 0 && s.maxDayIdx >= 0 && s.maxDayIdx < s.allDates.length) {
    parts.push(`Your **most productive day** was **${dayName(s.allDates[s.maxDayIdx])}, ${formatDateLabel(s.allDates[s.maxDayIdx])}** (${timeStr(s.maxDayMins)}).`)
  }
  parts.push(`**Total break time**: ${timeStr(s.totalBreak)}.`)
  parts.push(`**Total activities completed**: ${s.workSessions + s.breakSessions}.`)
  parts.push(`**Average daily work**: ${timeStr(s.avgDailyWork)}.`)
  parts.push(`**Longest work session**: ${timeStr(s.longestWork)}.`)
  parts.push(`**Average work session**: ${timeStr(s.avgWorkSession)}.`)
  parts.push(`**Focus score**: ${s.focusScore}%.`)

  if (s.mostActiveHour !== null) {
    parts.push(`**Most productive hour**: ${hourLabel(s.mostActiveHour)}.`)
  }

  if (s.mostFrequent) {
    parts.push(`**Most frequent activity**: "${s.mostFrequent[0]}" (${s.mostFrequent[1]} sessions).`)
  }

  if (s.sortedCategories.length > 0) {
    const cats = s.sortedCategories.slice(0, 5)
      .map(([id, d]) => `${getCategoryName(id, categories)} (${timeStr(d)})`)
      .join(', ')
    parts.push(`**Categories**: ${cats}.`)
  }

  const trendMap = { improving: '📈 Your productivity trend this month is **improving**.', declining: '📉 Your productivity trend this month is **declining**—review your schedule.', stable: '📊 Your productivity has been **stable** throughout the month.' }
  parts.push(trendMap[s.trend] || '')

  if (s.avgDailyWork > 0) {
    const weeklyAvg = Math.round(s.avgDailyWork * 7)
    parts.push(`**Projected weekly total** at current pace: ${timeStr(weeklyAvg)}.`)
  }

  return parts.join(' ')
}

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function buildRecommendations(stats, settings) {
  const recs = []
  const s = stats

  if (s.totalTracked === 0) return []

  const breakRatio = s.totalTracked > 0 ? Math.round((s.totalBreak / s.totalTracked) * 100) : 0

  if (s.focusScore < 60) {
    recs.push({ icon: '🎯', text: 'Your focus score is low. Try reducing break durations and minimizing distractions between sessions.' })
  } else if (s.focusScore < 75) {
    recs.push({ icon: '⚡', text: 'Consider shortening your breaks slightly to improve your focus score from its current level.' })
  }

  const avgBreakLen = s.breakSessions > 0 ? Math.round(s.totalBreak / s.breakSessions) : 0
  if (avgBreakLen > 0 && s.schedBreakMins > 0) {
    const schedPerSession = Math.round(s.schedBreakMins / Math.max(s.workingDates.length, 1))
    if (avgBreakLen > schedPerSession * 1.3) {
      recs.push({ icon: '☕', text: `Your average break session (${timeStr(avgBreakLen)}) exceeds your scheduled target. Try keeping breaks within the planned duration.` })
    }
  }

  if (s.idleGaps > 0) {
    recs.push({ icon: '⏳', text: `You had ${s.idleGaps} idle gap${s.idleGaps > 1 ? 's' : ''} totaling ${timeStr(s.idleMinutes)}. Try chaining tasks together to reduce switching overhead.` })
  }

  if (s.mostActiveHour !== null) {
    recs.push({ icon: '⏰', text: `Your focus is highest around ${hourLabel(s.mostActiveHour)}. Schedule your most important tasks during this window.` })
  }

  if (s.sortedActivities.length >= 3) {
    const top3 = s.sortedActivities.slice(0, 3).map(([n]) => n)
    if (new Set(top3).size > 1) {
      recs.push({ icon: '📦', text: `Consider grouping similar tasks like "${top3.slice(0, 2).join('", "')}" together to reduce context switching.` })
    }
  }

  if (s.workSessions >= 6 && s.avgWorkSession < 30) {
    recs.push({ icon: '🎯', text: 'Many of your sessions are under 30 minutes. Try longer focus blocks for deeper work.' })
  }

  if (s.trend === 'declining') {
    recs.push({ icon: '🔄', text: 'Your productivity is trending downward. Try reviewing your weekly schedule and identifying low-energy periods.' })
  }

  if (s.activeDays > 0 && s.avgDailyWork > 0) {
    const workByDay = s.allDates.map(d => s.byDate[d]?.work || 0)
    const variance = workByDay.filter(m => m > 0).length > 1
      ? Math.round(Math.max(...workByDay) - Math.min(...workByDay.filter(m => m > 0)))
      : 0
    if (variance > 120 && s.activeDays >= 3) {
      recs.push({ icon: '📅', text: `Your daily work varies significantly (${timeStr(variance)} range). Aim for a more consistent daily schedule.` })
    }
  }

  if (s.totalBreak > s.totalWork) {
    recs.push({ icon: '⚠️', text: 'Break time exceeds work time. Try reducing breaks to improve overall productivity.' })
  }

  return recs.slice(0, 5)
}
