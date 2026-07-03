import { useState } from 'react'
import { useActivities } from '../context/ActivitiesContext'
import { useToast } from '../context/ToastContext'
import { formatDate, getSlots, H, M, ROW_COLORS, sortByCreatedAsc, getToday } from '../lib/helpers'
import { X, Download, Calendar } from 'lucide-react'
import CatIcon from './CatIcon'

export default function ExportModal({ profile }) {
  const { activities } = useActivities()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState('today')
  const [fmt, setFmt] = useState('per-day')
  const [includeDur, setIncludeDur] = useState(true)
  const [catFilter, setCatFilter] = useState(new Set())
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)

  const categories = profile?.categories || []

  function openModal() {
    setCatFilter(new Set(categories.map(c => c.id)))
    setPeriod('today')
    setFmt('per-day')
    setIncludeDur(true)
    setOpen(true)
  }

  function getDateRange() {
    const now = new Date()
    let from, to
    const today = getToday()

    switch (period) {
      case 'today': from = to = today; break
      case 'yesterday': {
        const d = new Date(now); d.setDate(d.getDate() - 1)
        from = to = d.toISOString().split('T')[0]; break
      }
      case 'week': {
        const d = new Date(now); d.setDate(d.getDate() - d.getDay())
        from = d.toISOString().split('T')[0]; to = today; break
      }
      case 'lastweek': {
        const d = new Date(now); d.setDate(d.getDate() - d.getDay() - 7)
        const e = new Date(d); e.setDate(e.getDate() + 6)
        from = d.toISOString().split('T')[0]; to = e.toISOString().split('T')[0]; break
      }
      case 'month': {
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        to = today; break
      }
      case 'lastmonth': {
        const f = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const t = new Date(now.getFullYear(), now.getMonth(), 0)
        from = f.toISOString().split('T')[0]; to = t.toISOString().split('T')[0]; break
      }
      case 'all': from = '2000-01-01'; to = '2099-12-31'; break
      default: from = fromDate || today; to = toDate || today; break
    }
    return { from, to }
  }

  function getFiltered() {
    const { from, to } = getDateRange()
    return activities.filter(a =>
      a.date >= from && a.date <= to && catFilter.has(a.category)
    ).sort(sortByCreatedAsc)
  }

  function toggleCat(catId) {
    const next = new Set(catFilter)
    if (next.has(catId)) next.delete(catId)
    else next.add(catId)
    setCatFilter(next)
  }

  const filtered = getFiltered()
  const { from, to } = getDateRange()
  const totalMin = filtered.reduce((s, a) => s + (parseInt(a.duration) || 60), 0)

  async function runExport() {
    if (!filtered.length) { toast('No activities in selected range', 'inf'); return }
    setLoading(true)

    try {
      const ExcelJS = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Hourly Tracker'
      wb.created = new Date()

      const hasDur = includeDur
      const hdrFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
      const hdrFont = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
      const bd = { style: 'thin', color: { argb: 'FFD0D0D0' } }
      const allBd = { top: bd, left: bd, bottom: bd, right: bd }

      function stHdr(ws, cols) {
        const row = ws.getRow(1)
        cols.forEach((c, i) => {
          const cell = row.getCell(i + 1)
          cell.value = c.header
          cell.fill = hdrFill
          cell.font = hdrFont
          cell.border = allBd
        })
        row.height = 22
      }

      const dates = [...new Set(filtered.map(a => a.date))].sort()
      const slots = getSlots(profile?.settings?.workStart || '09:00', profile?.settings?.workEnd || '18:00')

      if (fmt === 'per-day') {
        for (const date of dates) {
          const dayActs = filtered.filter(a => a.date === date)
          const sName = date.split('-').reverse().join('-')
          const ws = wb.addWorksheet(sName)
          const cols = hasDur
            ? [{ header: 'Time Slot', key: 'slot', width: 18 }, { header: 'Activity', key: 'tasks', width: 46 }, { header: 'Category', key: 'cat', width: 14 }, { header: 'Duration (min)', key: 'dur', width: 16 }, { header: 'Notes', key: 'notes', width: 36 }]
            : [{ header: 'Time Slot', key: 'slot', width: 18 }, { header: 'Activities', key: 'tasks', width: 46 }, { header: 'Category', key: 'cat', width: 14 }, { header: 'Notes', key: 'notes', width: 36 }]
          ws.columns = cols; stHdr(ws, cols)
          let rn = 2
          slots.forEach((slot, si) => {
            const sa = dayActs.filter(a => a.slot === slot).sort(sortByCreatedAsc)
            if (!sa.length) return
            const rf = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_COLORS[si % ROW_COLORS.length] } }
            if (hasDur) {
              sa.forEach(act => {
                const row = ws.getRow(rn++)
                row.getCell('slot').value = slot
                row.getCell('tasks').value = act.name
                row.getCell('cat').value = act.category
                row.getCell('dur').value = parseInt(act.duration) || 60
                row.getCell('notes').value = act.notes || ''
                row.eachCell(c => { c.fill = rf; c.border = allBd; c.font = { name: 'Calibri', size: 10 }; c.alignment = { vertical: 'middle', wrapText: true } })
                row.height = 16
              })
            } else {
              const tl = sa.map((a, i) => `${i + 1}. ${a.name}${a.notes ? ` (${a.notes})` : ''}`).join('\n')
              const cats = [...new Set(sa.map(a => a.category))].join(', ')
              const row = ws.getRow(rn++)
              row.getCell('slot').value = slot
              row.getCell('tasks').value = tl
              row.getCell('cat').value = cats
              row.getCell('notes').value = ''
              row.height = Math.max(18, sa.length * 15)
              row.eachCell(c => { c.fill = rf; c.border = allBd; c.font = { name: 'Calibri', size: 10 }; c.alignment = { vertical: 'top', wrapText: true } })
            }
          })
        }
      } else {
        const ws = wb.addWorksheet(`${from} to ${to}`)
        const cols = hasDur
          ? [{ header: 'Date', key: 'date', width: 14 }, { header: 'Time Slot', key: 'slot', width: 18 }, { header: 'Activity', key: 'tasks', width: 44 }, { header: 'Category', key: 'cat', width: 13 }, { header: 'Duration (min)', key: 'dur', width: 16 }, { header: 'Notes', key: 'notes', width: 34 }]
          : [{ header: 'Date', key: 'date', width: 14 }, { header: 'Time Slot', key: 'slot', width: 18 }, { header: 'Activities', key: 'tasks', width: 44 }, { header: 'Category', key: 'cat', width: 13 }, { header: 'Notes', key: 'notes', width: 34 }]
        ws.columns = cols; stHdr(ws, cols)
        let rn = 2
        for (const date of dates) {
          const dayActs = filtered.filter(a => a.date === date)
          const hdRow = ws.getRow(rn++)
          hdRow.getCell(1).value = formatDate(date)
          hdRow.getCell(1).font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF1E3A8A' } }
          for (let i = 1; i <= cols.length; i++) {
            const c = hdRow.getCell(i)
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } }
            c.border = allBd
          }
          hdRow.height = 18
          slots.forEach((slot, si) => {
            const sa = dayActs.filter(a => a.slot === slot).sort(sortByCreatedAsc)
            if (!sa.length) return
            const rf = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_COLORS[si % ROW_COLORS.length] } }
            if (hasDur) {
              sa.forEach(act => {
                const row = ws.getRow(rn++)
                row.getCell('date').value = date
                row.getCell('slot').value = slot
                row.getCell('tasks').value = act.name
                row.getCell('cat').value = act.category
                row.getCell('dur').value = parseInt(act.duration) || 60
                row.getCell('notes').value = act.notes || ''
                row.eachCell(c => { c.fill = rf; c.border = allBd; c.font = { name: 'Calibri', size: 10 }; c.alignment = { vertical: 'middle', wrapText: true } })
                row.height = 16
              })
            } else {
              const tl = sa.map((a, i) => `${i + 1}. ${a.name}${a.notes ? ` (${a.notes})` : ''}`).join('\n')
              const cats = [...new Set(sa.map(a => a.category))].join(', ')
              const row = ws.getRow(rn++)
              row.getCell('date').value = date
              row.getCell('slot').value = slot
              row.getCell('tasks').value = tl
              row.getCell('cat').value = cats
              row.height = Math.max(18, sa.length * 15)
              row.eachCell(c => { c.fill = rf; c.border = allBd; c.font = { name: 'Calibri', size: 10 }; c.alignment = { vertical: 'top', wrapText: true } })
            }
          })
        }
      }

      const sw = wb.addWorksheet('Summary')
      sw.columns = [{ header: 'Metric', key: 'k', width: 26 }, { header: 'Value', key: 'v', width: 24 }]
      stHdr(sw, [{ header: 'Metric' }, { header: 'Value' }])
      const rows2 = [['Period', `${from} \u2192 ${to}`], ['Generated', new Date().toLocaleString()], ['Total Activities', filtered.length], ['Total Duration', `${H(totalMin)}h ${M(totalMin)}m`], ['', ''], ['Category', 'Duration']]
      const catMap = {}
      filtered.forEach(a => { catMap[a.category] = (catMap[a.category] || 0) + (parseInt(a.duration) || 60) })
      Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([cat, min]) => rows2.push([cat, `${H(min)}h ${M(min)}m`]))
      rows2.forEach((r, i) => {
        const row = sw.getRow(i + 2)
        row.getCell(1).value = r[0]; row.getCell(2).value = r[1]
        row.eachCell(c => { c.border = allBd; c.font = { name: 'Calibri', size: 10 }; c.alignment = { vertical: 'middle' } })
        row.height = 16
      })

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `HourlyTracker_${from}_to_${to}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast('Exported!', 'ok')
      setOpen(false)
    } catch (err) {
      toast('Export failed', 'er')
      console.error(err)
    }
    setLoading(false)
  }

  if (typeof window !== 'undefined') {
    window.__openExport = openModal
  }

  if (!open) return null

  return (
    <div className="ov" onClick={() => setOpen(false)}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="mt2">Export Report</div>
            <div className="ms">Choose what to include</div>
          </div>
          <button className="ib" onClick={() => setOpen(false)} style={{ width: 28, height: 28 }} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <div className="mb2" style={{ gap: 0 }}>
          <div className="exp-section">
            <div className="exp-stitle">Date Range</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {['today', 'yesterday', 'week', 'lastweek', 'month', 'lastmonth', 'all', 'custom'].map(p => (
                <button
                  key={p}
                  className={`period-btn${period === p ? ' on' : ''}`}
                  onClick={() => setPeriod(p)}
                >{p.charAt(0).toUpperCase() + p.slice(1)}</button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="tc2" style={{ marginBottom: 8 }}>
                <div className="fd"><label>From Date</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
                <div className="fd"><label>To Date</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--ac)', marginTop: 8, fontFamily: 'var(--mo)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} /> {from === to ? formatDate(from) : `${formatDate(from)} \u2192 ${formatDate(to)}`}
            </div>
          </div>
          <div className="exp-section">
            <div className="exp-stitle">Filter by Category</div>
            <div className="cg" style={{ gap: 5 }}>
              {categories.map(c => (
                <button
                  key={c.id}
                  className={`chip${catFilter.has(c.id) ? ' on' : ''}`}
                  onClick={() => toggleCat(c.id)}
                ><CatIcon icon={c.icon} size={11} /> {c.name}</button>
              ))}
            </div>
          </div>
          <div className="exp-section">
            <div className="exp-stitle">Format Options</div>
            <div className="tc2">
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>Sheet layout</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <button className={`period-btn${fmt === 'per-day' ? ' on' : ''}`} onClick={() => setFmt('per-day')}>Per Day (sheets)</button>
                  <button className={`period-btn${fmt === 'combined' ? ' on' : ''}`} onClick={() => setFmt('combined')}>Combined</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>Duration column</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <button className={`period-btn${includeDur ? ' on' : ''}`} onClick={() => setIncludeDur(true)}>Include</button>
                  <button className={`period-btn${!includeDur ? ' on' : ''}`} onClick={() => setIncludeDur(false)}>Exclude</button>
                </div>
              </div>
            </div>
          </div>
          <div className="exp-section" style={{ border: 'none', paddingBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{filtered.length} activities · {H(totalMin)}h total</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn bs bsm" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn bp bsm" onClick={runExport} disabled={loading}>
                  <Download size={13} /> {loading ? 'Exporting…' : 'Export Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}