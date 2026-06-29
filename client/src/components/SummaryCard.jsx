import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useActivities } from '../context/ActivitiesContext'
import { useToast } from '../context/ToastContext'
import { getToday } from '../lib/helpers'
import { generateSummary, registerProvider } from '../lib/ai'
import localProvider from '../lib/ai/providers/local'
import { Brain, RefreshCw, Copy, Share2, Sparkles, Clock, ChevronDown } from 'lucide-react'

registerProvider('local', localProvider)

const PERIODS = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
]

function getDateRange(type) {
  const today = getToday()
  const d = new Date(today + 'T12:00:00')
  if (type === 'daily') return { start: today, end: today }
  if (type === 'weekly') {
    const day = d.getDay()
    const start = new Date(d)
    start.setDate(d.getDate() - day)
    const end = new Date(d)
    end.setDate(d.getDate() + (6 - day))
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
  }
  if (type === 'monthly') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
  }
  return { start: today, end: today }
}

function rangeKey(type, dateRange) {
  return `${type}_${dateRange.start}_${dateRange.end}`
}

export default function SummaryCard({ profile }) {
  const { activities } = useActivities()
  const { toast } = useToast()
  const categories = profile?.categories || []
  const settings = profile?.settings || {}

  const [period, setPeriod] = useState('weekly')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [generatedAt, setGeneratedAt] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const cacheRef = useRef({})

  const dateRange = useMemo(() => getDateRange(period), [period])
  const cacheKey = rangeKey(period, dateRange)

  const filteredActivities = useMemo(() => {
    return activities.filter(a => a.date >= dateRange.start && a.date <= dateRange.end)
  }, [activities, dateRange])

  const actVersion = useRef(0)
  useEffect(() => {
    actVersion.current += 1
    cacheRef.current = {}
  }, [activities.length])

  const hasData = useMemo(() => filteredActivities.length > 0, [filteredActivities])

  const generate = useCallback(async (force) => {
    if (!force && cacheRef.current[cacheKey]) {
      setResult(cacheRef.current[cacheKey])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await generateSummary({
        type: period,
        activities: filteredActivities,
        categories,
        settings,
        dateRange,
      })
      if (!res.summary) {
        setResult(null)
      } else {
        const data = { ...res, timestamp: Date.now() }
        cacheRef.current[cacheKey] = data
        setResult(data)
        setGeneratedAt(Date.now())
      }
    } catch (e) {
      setError(e.message || 'Failed to generate summary')
    }
    setLoading(false)
  }, [period, filteredActivities, categories, settings, dateRange, cacheKey])

  function handlePeriodSelect(key) {
    setPeriod(key)
    setShowDropdown(false)
    setResult(null)
    setError(null)
  }

  async function handleCopy() {
    if (!result?.summary) return
    try {
      await navigator.clipboard.writeText(result.summary)
      toast('Summary copied to clipboard', 'inf')
    } catch {
      toast('Failed to copy', 'er')
    }
  }

  async function handleShare() {
    if (!result?.summary) return
    try {
      await navigator.share({ title: 'Productivity Summary', text: result.summary })
    } catch {
      await navigator.clipboard.writeText(result.summary)
      toast('Summary copied to clipboard', 'inf')
    }
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const periodLabel = PERIODS.find(p => p.key === period)?.label || 'Weekly'

  return (
    <div className="card m4">
      <div className="ch">
        <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={15} />
          <span>AI Productivity Summary</span>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className="btn bs bsm"
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ gap: 4, fontSize: 11.5 }}
          >
            {periodLabel}
            <ChevronDown size={12} />
          </button>
          {showDropdown && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'var(--sf)', border: '1px solid var(--bd2)',
              borderRadius: 8, overflow: 'hidden', zIndex: 20,
              minWidth: 130, boxShadow: '0 4px 12px rgba(0,0,0,.15)',
            }}>
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  className="btn bfw"
                  style={{
                    width: '100%', justifyContent: 'flex-start',
                    padding: '8px 14px', gap: 8, borderRadius: 0,
                    fontSize: 12, background: period === p.key ? 'var(--bd2)' : 'transparent',
                  }}
                  onClick={() => handlePeriodSelect(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
            {dateRange.start === dateRange.end
              ? dateRange.start
              : `${dateRange.start} – ${dateRange.end}`}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {result && (
              <>
                <button className="btn bs bsm" onClick={handleCopy} title="Copy summary">
                  <Copy size={13} />
                </button>
                <button className="btn bs bsm" onClick={handleShare} title="Share summary">
                  <Share2 size={13} />
                </button>
              </>
            )}
            <button
              className="btn bs bsm"
              onClick={() => generate(true)}
              disabled={loading}
              style={{ gap: 4 }}
            >
              {loading ? (
                <span className="puls" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={13} className="spin" /> Generating…
                </span>
              ) : result ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={13} /> Regenerate
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={13} /> Generate
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="aibox" style={{ margin: 0 }}>
          {loading ? (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div className="puls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Brain size={28} style={{ opacity: 0.5 }} />
                <span style={{ fontSize: 13, color: 'var(--tx2)' }}>Analyzing your productivity data…</span>
              </div>
            </div>
          ) : error ? (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div style={{ color: 'var(--er)', fontSize: 13, marginBottom: 8 }}>{error}</div>
              <button className="btn bs bsm" onClick={() => generate(true)} style={{ fontSize: 12 }}>
                Try Again
              </button>
            </div>
          ) : result?.summary ? (
            <div>
              <div className="ailbl" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={13} style={{ color: 'var(--ac)' }} />
                Summary
                {generatedAt && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--tx3)', fontWeight: 400, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={10} /> {formatTime(generatedAt)}
                  </span>
                )}
              </div>
              <div className="aitxt" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                {result.summary}
              </div>

              {result.recommendations?.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--bd2)' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx2)', marginBottom: 10 }}>
                    Recommendations
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.recommendations.map((r, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 8, fontSize: 12,
                        color: 'var(--tx2)', lineHeight: 1.55,
                      }}>
                        <span style={{ flexShrink: 0 }}>{r.icon}</span>
                        <span>{r.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
                {filteredActivities.length === 0
                  ? 'No activities logged for this period. Start tracking your work to generate AI productivity insights.'
                  : 'Click "Generate" for a personalized productivity analysis.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
