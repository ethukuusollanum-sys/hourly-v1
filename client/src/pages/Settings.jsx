import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../config/supabase'
import { THEMES, DAYS, applyTheme, applyMode, loadMode, esc, hexToRgba } from '../lib/helpers'
import { Camera, LogOut, Pencil, Trash2, Download, HelpCircle, Mail, Info, ExternalLink, SwitchCamera, Sun, Moon, X } from 'lucide-react'
import TimePicker from '../components/TimePicker'
import CatIcon from '../components/CatIcon'

export default function Settings({ profile, onUpdate }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const settings = profile?.settings || {}

  const [name, setName] = useState(profile?.name || '')
  const [role, setRole] = useState(settings?.role || '')
  const [workStart, setWorkStart] = useState(settings?.workStart || '09:00')
  const [workEnd, setWorkEnd] = useState(settings?.workEnd || '18:00')
  const [breakSlots, setBreakSlots] = useState(settings?.breakSlots || [])
  const [team, setTeam] = useState(settings?.team || '')
  const [notif, setNotif] = useState(settings?.notif || false)
  const [workingDays, setWorkingDays] = useState(settings?.workingDays || [1, 2, 3, 4, 5, 6])
  const [uiMode, setUiMode] = useState(loadMode())
  const [selectedTheme, setSelectedTheme] = useState(
    THEMES.findIndex(t => t.ac === (settings?.theme?.ac || '#00d4aa'))
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name || '')
    setRole(profile.settings?.role || '')
    setWorkStart(profile.settings?.workStart || '09:00')
    setWorkEnd(profile.settings?.workEnd || '18:00')
    setBreakSlots(profile.settings?.breakSlots || [])
    setTeam(profile.settings?.team || '')
    setNotif(profile.settings?.notif || false)
    setWorkingDays(profile.settings?.workingDays || [1, 2, 3, 4, 5, 6])
    const ti = THEMES.findIndex(t => t.ac === (profile.settings?.theme?.ac || '#00d4aa'))
    setSelectedTheme(ti >= 0 ? ti : 0)
  }, [profile])

  function toggleDay(dayIdx) {
    setWorkingDays(prev => {
      if (prev.includes(dayIdx)) {
        if (prev.length <= 1) return prev
        return prev.filter(d => d !== dayIdx)
      }
      return [...prev, dayIdx].sort()
    })
    markDirty()
  }

  function markDirty() { setDirty(true) }

  function previewTheme(idx) {
    setSelectedTheme(idx)
    applyTheme(THEMES[idx])
    markDirty()
  }

  function toggleMode() {
    const next = uiMode === 'dark' ? 'light' : 'dark'
    setUiMode(next)
    applyMode(next)
    markDirty()
  }

  async function saveSettings() {
    if (workStart >= workEnd) { toast('End time must be after start', 'er'); return }
    for (const bs of breakSlots) {
      if (!bs.start || !bs.end) { toast('Each break slot needs a start and end time', 'er'); return }
      if (bs.end <= bs.start) { toast('Break end must be after start for each slot', 'er'); return }
      if (bs.start < workStart || bs.end > workEnd) { toast('All break slots must be within working hours', 'er'); return }
    }
    setSaving(true)
    const theme = selectedTheme >= 0 ? THEMES[selectedTheme] : (settings?.theme || THEMES[0])

    const newSettings = {
      ...settings,
      workStart, workEnd,
      breakSlots,
      team: team.trim() || 'My Team',
      role: role.trim(), notif, theme, workingDays,
    }

    const updates = {
      name: name.trim() || profile?.name,
      settings: newSettings,
    }

    await onUpdate(updates)
    applyTheme(theme)

    try {
      await user.update({ data: { name: name.trim() } })
    } catch {}

    localStorage.setItem('ht_theme', JSON.stringify(theme))
    setDirty(false)
    toast('Settings saved!', 'ok')
    setSaving(false)
  }

  async function doLogout() {
    await supabase.auth.signOut()
  }

  const init = (profile?.name || user?.email?.split('@')[0] || '?').charAt(0).toUpperCase()

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Profile</h2>
      <div className="card m4">
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <div
                className="av av3"
                style={{ cursor: 'pointer' }}
                onClick={() => document.getElementById('pic_input')?.click()}
              >
                {profile?.photo_url ? <img src={profile.photo_url} alt={`${profile.name}'s profile photo`} /> : init}
              </div>
              <div className="pic-badge" onClick={() => document.getElementById('pic_input')?.click()}>
                <Camera size={12} color="#000" />
              </div>
            </div>
            <input
              type="file" id="pic_input" accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (window.__cropModal) window.__cropModal.open(e.target) }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{esc(profile?.name || user?.email)}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--tx2)', marginTop: 2 }}>{esc(user?.email)}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => document.getElementById('pic_input')?.click()}
                  style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--fn)' }}>
                  {profile?.photo_url ? 'Replace photo' : 'Add photo'}
                </button>
                {profile?.photo_url && (
                  <button onClick={async () => {
                    await onUpdate({ photo_url: '' })
                    toast('Profile photo removed.', 'inf')
                  }} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--fn)' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="fd">
            <label>Display Name</label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); markDirty() }} />
          </div>
          <div className="fd">
            <label>Role</label>
            <input type="text" value={role} onChange={e => { setRole(e.target.value); markDirty() }} />
          </div>
          <div className="fd">
            <label>Email (read-only)</label>
            <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.55 }} />
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, marginTop: 24 }}>Appearance</h2>

      <div className="card m4">
        <div className="ch"><div className="ct">Theme Color</div></div>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {THEMES.map((t, i) => (
              <div
                key={t.name}
                className={`theme-opt${i === selectedTheme ? ' on' : ''}`}
                style={{ background: t.ac }}
                title={t.name}
                onClick={() => previewTheme(i)}
              />
            ))}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--tx2)', marginTop: 8 }}>
            {THEMES[Math.max(0, selectedTheme)]?.name}
          </div>
        </div>
      </div>

      <div className="card m4">
        <div className="ch"><div className="ct">Display Mode</div></div>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {uiMode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              <span style={{ fontSize: 13, fontWeight: 600 }}>{uiMode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <button className={`tog${uiMode === 'light' ? ' on' : ''}`} onClick={toggleMode} aria-label={`Switch to ${uiMode === 'dark' ? 'light' : 'dark'} mode`} />
          </div>
        </div>
      </div>

      <div className="card m4">
        <div className="ch"><div className="ct">Working Hours</div></div>
        <div style={{ padding: 18 }}>
          <div className="tc2">
            <div className="fd"><label>Start</label>
              <TimePicker value={workStart} onChange={v => { setWorkStart(v); markDirty() }} style={{ width: '100%' }} />
            </div>
            <div className="fd"><label>End</label>
              <TimePicker value={workEnd} onChange={v => { setWorkEnd(v); markDirty() }} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)', marginBottom: 8 }}>Break Slots <span style={{ color: 'var(--tx3)', fontWeight: 400, fontSize: 11 }}>(optional)</span></div>
            {breakSlots.map((bs, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <TimePicker value={bs.start} onChange={v => {
                  const next = [...breakSlots]
                  next[i] = { ...next[i], start: v }
                  setBreakSlots(next); markDirty()
                }} style={{ flex: 1 }} />
                <span style={{ color: 'var(--tx3)', fontSize: 11 }}>&rarr;</span>
                <TimePicker value={bs.end} onChange={v => {
                  const next = [...breakSlots]
                  next[i] = { ...next[i], end: v }
                  setBreakSlots(next); markDirty()
                }} style={{ flex: 1 }} />
                <button className="ib del" onClick={() => {
                  setBreakSlots(breakSlots.filter((_, j) => j !== i)); markDirty()
                }} style={{ flexShrink: 0 }} aria-label="Remove break slot"><X size={12} /></button>
              </div>
            ))}
            <button className="btn bs bsm" onClick={() => {
              setBreakSlots([...breakSlots, { start: '', end: '' }]); markDirty()
            }} style={{ marginTop: 4 }}>+ Add Break Slot</button>
          </div>
        </div>
      </div>

      <div className="card m4">
        <div className="ch"><div className="ct">Team</div></div>
        <div style={{ padding: 18 }}>
          <div className="fd"><label>Team / Workspace Name</label>
            <input type="text" value={team} onChange={e => { setTeam(e.target.value); markDirty() }} />
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--tx3)', marginTop: 7 }}>
            Same team name = shared Team View.
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, marginTop: 24 }}>Working Schedule</h2>
      <div className="card m4">
        <div className="ch"><div className="ct">Working Days</div></div>
        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <button
                key={i}
                className={`chip${workingDays.includes(i) ? ' on' : ''}`}
                onClick={() => toggleDay(i)}
                style={{ flex: 1, minWidth: 40, textAlign: 'center', padding: '6px 8px', fontSize: 11 }}
              >
                {DAYS[i]}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--tx3)', marginTop: 8 }}>
            {workingDays.length >= 7
              ? 'Every day is a working day'
              : `${workingDays.map(i => DAYS[i]).join(', ')} — working days`}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, marginTop: 24 }}>Account</h2>

      <div className="card m4">
        <div style={{ padding: '4px 18px', display: 'flex', flexDirection: 'column' }}>
          <div className="cat-row" style={{ cursor: 'pointer' }} onClick={() => { if (window.__openAccSwitcher) window.__openAccSwitcher() }}>
            <div style={{ width: 12, height: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx2)' }}>
              <SwitchCamera size={14} />
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>Switch User</div>
            <ExternalLink size={12} color="var(--tx3)" />
          </div>
          <div className="cat-row" style={{ cursor: 'pointer' }} onClick={doLogout}>
            <div style={{ width: 12, height: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
              <LogOut size={14} />
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--red)' }}>Sign Out</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, marginTop: 24 }}>Application</h2>

      <div className="card m4">
        <div style={{ padding: '4px 18px', display: 'flex', flexDirection: 'column' }}>
          <div className="cat-row" style={{ cursor: 'pointer' }} onClick={() => { if (window.__openExport) window.__openExport() }}>
            <div style={{ width: 12, height: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx2)' }}>
              <Download size={14} />
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>Export Data</div>
            <ExternalLink size={12} color="var(--tx3)" />
          </div>
          <div style={{ padding: 0, border: 'none' }}>
            <div className="ch" style={{ borderBottom: 'none', padding: '12px 0' }}>
              <div className="ct" style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>Notifications</div>
              <button className={`tog${notif ? ' on' : ''}`} onClick={() => {
                const newVal = !notif
                setNotif(newVal)
                markDirty()
                if (!newVal) return
                if (typeof Notification === 'undefined') return
                if (Notification.permission === 'default') Notification.requestPermission()
                else if (Notification.permission === 'denied') toast('Notifications blocked. Enable in browser settings.', 'er')
              }} aria-label={`Notifications ${notif ? 'on' : 'off'}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="card m4">
        <div className="ch">
          <div className="ct">Categories</div>
          <button className="btn bs bsm" onClick={() => { if (window.__categoryModal) window.__categoryModal.open() }}>+ Add</button>
        </div>
        <div style={{ padding: '4px 18px' }}>
          {(profile?.categories || []).map(c => {
            const tagBg = hexToRgba(c.color, 0.12)
            const tagBd = hexToRgba(c.color, 0.25)
            const isDef = ['Work', 'Break', 'Meeting', 'Learning'].includes(c.id)
            return (
              <div key={c.id} className="cat-row">
                <div className="cat-swatch" style={{ background: c.color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
                    <CatIcon icon={c.icon} size={12} /> {esc(c.name)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                    {isDef ? 'Default' : 'Custom'}
                  </div>
                </div>
                <span className="tag" style={{ background: tagBg, color: c.color, border: `1px solid ${tagBd}` }}>
                  <CatIcon icon={c.icon} size={10} /> {c.name}
                </span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                  <button className="ib" onClick={() => { if (window.__categoryModal) window.__categoryModal.open(c.id) }}>
                    <Pencil size={12} />
                  </button>
                  {!isDef && (
                    <button className="ib del" onClick={async () => {
                      const confirmed = await window.__confirm(`Delete "${c.name}"?`, 'Delete Category')
                      if (!confirmed) return
                      const updated = (profile?.categories || []).filter(cat => cat.id !== c.id)
                      await onUpdate({ categories: updated })
                      toast('Deleted', 'inf')
                    }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="infbox" style={{ marginBottom: 14 }}>
        <Info size={16} color="var(--ac)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>The <strong style={{ color: 'var(--tx)' }}>Break</strong> category is excluded from focus score calculations.</span>
      </div>

      <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, marginTop: 24 }}>Support</h2>

      <div className="card m4">
        <div style={{ padding: '4px 18px', display: 'flex', flexDirection: 'column' }}>
          <a href="mailto:support@hourly.app" style={{ textDecoration: 'none' }} className="cat-row">
            <div style={{ width: 12, height: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx2)' }}>
              <Mail size={14} />
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>Contact Us</div>
            <ExternalLink size={12} color="var(--tx3)" />
          </a>
          <a href="https://hourly.app/help" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }} className="cat-row">
            <div style={{ width: 12, height: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx2)' }}>
              <HelpCircle size={14} />
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>Help & Support</div>
            <ExternalLink size={12} color="var(--tx3)" />
          </a>
          <a href="https://hourly.app/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }} className="cat-row">
            <div style={{ width: 12, height: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx2)' }}>
              <Info size={14} />
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>Privacy Policy</div>
            <ExternalLink size={12} color="var(--tx3)" />
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button className="btn bp" style={{ flex: 1 }} onClick={saveSettings} disabled={!dirty || saving}>
          {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>
    </div>
  )
}