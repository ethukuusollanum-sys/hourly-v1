import { useState, useEffect, useMemo } from 'react'
import { useActivities } from '../context/ActivitiesContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../config/supabase'
import { useAuth } from '../context/AuthContext'
import { getToday } from '../lib/helpers'
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
  const [duration, setDuration] = useState('60')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const categories = profile?.categories || []
  const slotUsed = useMemo(() => {
    if (!slot || !slotDate) return 0
    return activities
      .filter(a => a.date === slotDate && a.slot === slot && a.id !== editId)
      .reduce((sum, a) => sum + (a.duration || 0), 0)
  }, [slot, slotDate, editId, activities])
  const remaining = Math.max(0, 60 - slotUsed)
  const durNum = parseInt(duration) || 0
  const isOverLimit = slotUsed + durNum > 60

  function openModal(slotVal, editData = null) {
    setSlot(slotVal)
    if (editData) {
      setEditId(editData.id)
      setName(editData.name)
      setCategory(editData.category || (categories[0]?.id || 'Work'))
      setDuration(String(editData.duration || 60))
      setNotes(editData.notes || '')
      setSlotDate(editData.date)
    } else {
      const today = getToday()
      const used = activities
        .filter(a => a.date === today && a.slot === slotVal)
        .reduce((sum, a) => sum + (a.duration || 0), 0)
      setEditId(null)
      setName('')
      setCategory(categories[0]?.id || 'Work')
      setDuration(String(Math.max(1, 60 - used)))
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
    const dur = parseInt(duration) || 60
    if (slotUsed + dur > 60) { toast('Maximum 60 minutes per slot exceeded', 'er'); setSaving(false); return }
    setSaving(true)
    const today = getToday()

    try {
      if (editId) {
        const { error } = await supabase
          .from('activities')
          .update({ name: name.trim(), category, duration: dur, notes: notes.trim(), updated_at: new Date().toISOString() })
          .eq('id', editId)
        if (error) throw error
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

  // Expose to window for non-react parts (like calendar)
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
          <div className="fd">
            <label>What did you work on?</label>
            <input
              type="text"
              placeholder="Code review, Bug fix, Client call…"
              maxLength={80}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save() }}
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
              <label>Duration (min)</label>
              <input
                type="text"
                inputMode="numeric"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                maxLength={3}
                style={isOverLimit ? { borderColor: 'var(--red)' } : undefined}
              />
              <div style={{ fontSize: 11.5, color: 'var(--tx3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Used: {slotUsed}m</span>
                <span>·</span>
                <span>Limit: 60m</span>
                <span>·</span>
                <span style={{ color: remaining <= 5 ? 'var(--red)' : remaining <= 15 ? '#e6a817' : 'var(--ac)', fontWeight: 600 }}>Remaining: {remaining}m</span>
              </div>
              {isOverLimit && <div className="errmsg">Maximum 60 minutes per slot exceeded</div>}
            </div>
          </div>
          <div className="fd">
            <label>Notes <span style={{ color: 'var(--tx3)' }}>(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Context, outcome, blockers…"
            />
          </div>
        </div>
        <div className="mf">
          <button className="btn bg2 bsm" onClick={closeModal}>Cancel</button>
          <button className="btn bp bsm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Log'}
          </button>
        </div>
      </div>
    </div>
  )
}
