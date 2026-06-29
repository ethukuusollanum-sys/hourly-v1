import { useState, useEffect, useMemo } from 'react'
import { useActivities } from '../context/ActivitiesContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../config/supabase'
import { useAuth } from '../context/AuthContext'
import { getToday, getSlotDuration, getSuggestedWorkStart, hasOverlapWithBreaks, parseSlot, timeToMin, minToString } from '../lib/helpers'
import { X } from 'lucide-react'

export default function ActivityModal({ profile }) {
  const { user } = useAuth()
  const { activities, setActivities } = useActivities()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [slot, setSlot] = useState(null)
  const [slotDate, setSlotDate] = useState(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [workStart, setWorkStart] = useState('')
  const [duration, setDuration] = useState('60')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const categories = profile?.categories || []
  const breakConfigs = profile?.settings?.breakSlots || []

  const slotLimit = useMemo(() => {
    if (!slot) return 60
    return getSlotDuration(slot)
  }, [slot])

  const slotLogs = useMemo(() => {
    if (!slot || !slotDate) return []
    return activities.filter(a =>
      a.date === slotDate && a.slot === slot && a.id !== editId && !a.is_break
    )
  }, [slot, slotDate, editId, activities])

  const breakTotal = useMemo(() => {
    if (!slot) return 0
    const { start: ss, end: se } = parseSlot(slot)
    const sMin = timeToMin(ss), eMin = timeToMin(se)
    return (breakConfigs || []).reduce((sum, bc) => {
      if (!bc.start || !bc.end) return sum
      const over = Math.min(timeToMin(bc.end), eMin) - Math.max(timeToMin(bc.start), sMin)
      return sum + Math.max(0, over)
    }, 0)
  }, [slot, breakConfigs])

  const logTotal = useMemo(() =>
    slotLogs.reduce((s, a) => s + (a.duration || 0), 0),
    [slotLogs]
  )

  const remaining = useMemo(() =>
    Math.max(0, slotLimit - breakTotal - logTotal),
    [slotLimit, breakTotal, logTotal]
  )

  const durNum = parseInt(duration) || 0
  const workStartMin = workStart ? timeToMin(workStart) : null
  const workEndMin = workStartMin !== null ? workStartMin + durNum : null

  const overlapError = useMemo(() => {
    if (!slot || workStartMin === null || durNum <= 0) return null
    if (hasOverlapWithBreaks(workStartMin, workEndMin, breakConfigs, slot)) {
      return 'Work duration overlaps with scheduled break time. Please choose a time outside the break period.'
    }
    return null
  }, [slot, workStartMin, workEndMin, durNum, breakConfigs])

  const timeFormatValid = workStart ? /^\d{2}:\d{2}$/.test(workStart) : false
  const startBeforeSlot = workStartMin !== null && slot ? timeToMin(parseSlot(slot).start) > workStartMin : false
  const startAfterSlotEnd = workStartMin !== null && slot ? workStartMin >= timeToMin(parseSlot(slot).end) : false
  const endAfterSlot = workEndMin !== null && slot ? workEndMin > timeToMin(parseSlot(slot).end) : false

  const exceedsRemaining = durNum > remaining
  const isOverLimit = durNum > slotLimit || exceedsRemaining
  const afterThisLog = Math.max(0, remaining - durNum)
  const canSave = name.trim() && durNum > 0 && timeFormatValid && !overlapError && !exceedsRemaining && !endAfterSlot

  function openModal(slotVal, editData = null) {
    setSlot(slotVal)
    const limit = getSlotDuration(slotVal)
    const today = getToday()
    const existLogs = activities.filter(a =>
      a.date === (editData?.date || today) && a.slot === slotVal && !a.is_break && a.id !== editData?.id
    )
    if (editData) {
      setEditId(editData.id)
      setName(editData.name)
      setCategory(editData.category || (categories[0]?.id || 'Work'))
      setWorkStart(editData.work_start || getSuggestedWorkStart(slotVal, breakConfigs, existLogs, 1) || parseSlot(slotVal).start)
      setDuration(String(editData.duration || limit))
      setNotes(editData.notes || '')
      setSlotDate(editData.date)
    } else {
      const { start: ss, end: se } = parseSlot(slotVal)
      const sMin = timeToMin(ss), eMin = timeToMin(se)
      const brkMins = (breakConfigs || []).reduce((sum, bc) => {
        if (!bc.start || !bc.end) return sum
        const over = Math.min(timeToMin(bc.end), eMin) - Math.max(timeToMin(bc.start), sMin)
        return sum + Math.max(0, over)
      }, 0)
      const logMins = existLogs.reduce((s, a) => s + (a.duration || 0), 0)
      const used = Math.max(0, limit - brkMins - logMins)
      const suggested = getSuggestedWorkStart(slotVal, breakConfigs, existLogs, 1)
      setEditId(null)
      setName('')
      setCategory(categories[0]?.id || 'Work')
      setWorkStart(suggested || parseSlot(slotVal).start)
      setDuration(String(Math.max(1, used)))
      setNotes('')
      setSlotDate(today)
    }
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditId(null)
    setSlot(null)
  }

  async function save() {
    if (!name.trim()) { toast('Activity name is required', 'er'); return }
    const dur = parseInt(duration) || 0
    if (dur <= 0) { toast('Duration must be greater than 0', 'er'); return }
    if (!workStart.trim()) { toast('Work start time is required', 'er'); return }
    if (overlapError) { toast(overlapError, 'er'); return }
    if (dur > remaining) { toast('Duration exceeds available time in this slot', 'er'); return }
    setSaving(true)
    const today = getToday()

    try {
      if (editId) {
        const { error } = await supabase
          .from('activities')
          .update({ name: name.trim(), category, duration: dur, notes: notes.trim(), work_start: workStart, updated_at: new Date().toISOString() })
          .eq('id', editId)
        if (error) throw error
        setActivities(prev => prev.map(a => a.id === editId ? { ...a, name: name.trim(), category, duration: dur, notes: notes.trim(), work_start: workStart, slot: slot } : a))
        toast('Updated ✓', 'ok')
      } else {
          const { data, error } = await supabase
            .from('activities')
            .insert({
              user_id: user.id,
              name: name.trim(),
              category,
              duration: dur,
              notes: notes.trim(),
              date: today,
              slot,
              work_start: workStart,
              created_at: new Date().toISOString(),
            })
          .select()
          .single()
        if (error) throw error
        setActivities(prev => [...prev, data])
        toast('Logged ✓', 'ok')
      }
      closeModal()
    } catch (err) {
      toast('Save failed', 'er')
      console.error(err)
    }
    setSaving(false)
  }

  async function delActivity(id, activityName) {
    const confirmed = await window.__confirm(`Delete "${activityName || name}"?`, 'Delete Activity')
    if (!confirmed) return
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (!error) {
      setActivities(prev => prev.filter(a => a.id !== id))
      toast('Deleted', 'inf')
    }
  }

  useEffect(() => {
    window.__activityModal = { open: openModal, close: closeModal, del: delActivity }
    return () => { delete window.__activityModal }
  }, [categories, activities])

  if (!open) return null

  return (
    <div className="ov" onClick={closeModal}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div>
            <div className="mt2">{editId ? 'Edit Task' : 'Log Task'}</div>
            <div className="ms">{slot || '–'}</div>
          </div>
          <button className="ib" onClick={closeModal} style={{ width: 28, height: 28 }}>
            <X size={15} />
          </button>
        </div>
        <div className="mb2">
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, fontSize: 11, fontFamily: 'var(--mo)', color: 'var(--tx2)' }}>
            <span>Slot: {slotLimit}m</span>
            <span>Break: {breakTotal}m</span>
            <span>Logged: {logTotal}m</span>
            <span style={{ color: remaining <= 0 ? 'var(--red)' : remaining <= 15 ? '#e6a817' : 'var(--ac)', fontWeight: 700 }}>Avail: {remaining}m</span>
          </div>
          <div className="fd">
            <label>What did you work on?</label>
            <input
              type="text"
              placeholder="Code review, Bug fix, Client call…"
              maxLength={80}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSave) save() }}
              autoFocus
            />
          </div>
          <div className="tc2">
            <div className="fd">
              <label>Category</label>
              <div className="cg" style={{ gap: 4 }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className={`chip${category === cat.id ? ' on' : ''}`}
                    onClick={() => setCategory(cat.id)}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="fd">
              <label>Start Time</label>
              <div className="iw">
                <input
                  type="text"
                  placeholder="HH:MM"
                  value={workStart}
                  onChange={e => setWorkStart(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && canSave) save() }}
                  maxLength={5}
                  style={overlapError || (workStart && !timeFormatValid) ? { borderColor: 'var(--red)' } : undefined}
                />
              </div>
              {overlapError && <div className="errmsg">{overlapError}</div>}
              {startAfterSlotEnd && <div className="errmsg">Start time is outside this slot</div>}
              {workStart && !timeFormatValid && <div className="errmsg">Use HH:MM format (e.g. 09:30)</div>}
            </div>
          </div>
          <div className="tc2">
            <div className="fd">
              <label>Duration (min)</label>
              <input
                type="text"
                inputMode="numeric"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canSave) save() }}
                maxLength={3}
                style={exceedsRemaining || endAfterSlot ? { borderColor: 'var(--red)' } : undefined}
              />
              <div style={{ fontSize: 11.5, color: 'var(--tx3)', marginTop: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Used: {logTotal}m</span>
                  <span>·</span>
                  <span>Limit: {slotLimit}m</span>
                  <span>·</span>
                  <span style={{ color: remaining <= 5 ? 'var(--red)' : remaining <= 15 ? '#e6a817' : 'var(--ac)', fontWeight: 600 }}>Avail: {remaining}m</span>
                </div>
                {durNum > 0 && !exceedsRemaining && !endAfterSlot && (
                  <span style={{ color: 'var(--tx2)' }}>After this log: {afterThisLog}m remaining</span>
                )}
                {exceedsRemaining && durNum > 0 && (
                  <span style={{ color: 'var(--red)' }}>Entered duration exceeds available time in this slot</span>
                )}
                {endAfterSlot && durNum > 0 && (
                  <span style={{ color: 'var(--red)' }}>Work end time exceeds slot boundary</span>
                )}
              </div>
            </div>
            <div className="fd">
              <label>End Time</label>
              <div className="iw">
                <input
                  type="text"
                  placeholder="--:--"
                  value={workStart && durNum > 0 ? minToString(workStartMin + durNum) : '–'}
                  readOnly
                  disabled
                  style={{ opacity: 0.6, cursor: 'default' }}
                />
              </div>
            </div>
          </div>
          <div className="fd">
            <label>Notes <span style={{ color: 'var(--tx3)' }}>(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSave) save() }}
              placeholder="Context, outcome, blockers…"
            />
          </div>
        </div>
        <div className="mf">
          <button className="btn bg2 bsm" onClick={closeModal}>Cancel</button>
          <button className="btn bp bsm" onClick={save} disabled={saving || !canSave}>
            {saving ? 'Saving…' : 'Save Log'}
          </button>
        </div>
      </div>
    </div>
  )
}
