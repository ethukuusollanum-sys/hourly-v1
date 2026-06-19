import { useState } from 'react'
import { supabase } from '../config/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_CATEGORIES } from '../lib/helpers'

export default function OnboardingPage({ profile, onComplete }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [workStart, setWorkStart] = useState('09:00')
  const [workEnd, setWorkEnd] = useState('18:00')
  const [breakStart, setBreakStart] = useState('')
  const [breakEnd, setBreakEnd] = useState('')
  const [team, setTeam] = useState('')
  const [role, setRole] = useState('')
  const [notif, setNotif] = useState(false)
  const [saving, setSaving] = useState(false)

  async function finish() {
    if (workStart >= workEnd) { toast('End time must be after start', 'er'); return }
    // Break is optional, but if set it must be valid and fall within work hours.
    const hasBreak = breakStart && breakEnd
    if (hasBreak && breakEnd <= breakStart) {
      toast('Break end must be after break start', 'er'); return
    }
    if (hasBreak && (breakStart < workStart || breakEnd > workEnd)) {
      toast('Break must be within working hours', 'er'); return
    }
    setSaving(true)
    const settings = {
      workStart, workEnd,
      breakStart: hasBreak ? breakStart : '',
      breakEnd: hasBreak ? breakEnd : '',
      team: team.trim() || 'My Team', role: role.trim(), notif,
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        settings,
        categories: DEFAULT_CATEGORIES,
        name: profile?.name || user?.email?.split('@')[0] || 'User',
        email: user?.email,
      })
      .eq('id', user.id)
    if (error) {
      toast('Failed to save. Check your connection.', 'er')
      console.error(error)
    } else {
      toast('Workspace configured! 🎉', 'ok')
      onComplete()
    }
    setSaving(false)
  }

  return (
    <div id="obs">
      <div className="card" style={{ maxWidth: 440, width: '100%' }}>
        <div className="ch">
          <div>
            <div className="ct">Setup your workspace</div>
            <div className="cs">Just a few details to get started</div>
          </div>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="tc2">
            <div className="fd"><label>Work Start</label><input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} /></div>
            <div className="fd"><label>Work End</label><input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} /></div>
          </div>
          <div className="tc2">
            <div className="fd"><label>Break Start <span style={{ color: 'var(--tx3)' }}>(optional)</span></label><input type="time" value={breakStart} onChange={e => setBreakStart(e.target.value)} /></div>
            <div className="fd"><label>Break End <span style={{ color: 'var(--tx3)' }}>(optional)</span></label><input type="time" value={breakEnd} onChange={e => setBreakEnd(e.target.value)} /></div>
          </div>
          {breakStart && breakEnd && (
            <div style={{ fontSize: '11.5px', color: 'var(--tx3)', marginTop: -6 }}>
              Break slots are auto-blocked on your timeline each day.
            </div>
          )}
          <div className="fd"><label>Team / Workspace Name</label>
            <input type="text" placeholder="e.g. Engineering, Design…" maxLength={40} value={team} onChange={e => setTeam(e.target.value)} />
          </div>
          <div className="fd"><label>Role / Designation</label>
            <input type="text" placeholder="e.g. Frontend Developer" maxLength={60} value={role} onChange={e => setRole(e.target.value)} />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 12, background: 'var(--sf2)', border: '1px solid var(--bd2)', borderRadius: 'var(--rs)',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Hourly Reminders</div>
              <div style={{ fontSize: '11.5px', color: 'var(--tx2)' }}>Browser notification each hour</div>
            </div>
            <button className={`tog${notif ? ' on' : ''}`} onClick={() => {
              const newVal = !notif
              setNotif(newVal)
              if (!newVal) return
              if (typeof Notification === 'undefined') return
              if (Notification.permission === 'default') Notification.requestPermission()
              else if (Notification.permission === 'denied') toast('Notifications blocked. Enable in browser settings.', 'er')
            }}></button>
          </div>
          <button className="btn bp bfw" onClick={finish} disabled={saving}>
            {saving ? 'Saving…' : 'Start Tracking'}
          </button>
        </div>
      </div>
    </div>
  )
}
