import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../config/supabase'
import { THEMES, applyTheme, esc } from '../lib/helpers'
import { Camera, LogOut } from 'lucide-react'

export default function Settings({ profile, onUpdate }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const settings = profile?.settings || {}

  const [name, setName] = useState(profile?.name || '')
  const [role, setRole] = useState(settings?.role || '')
  const [workStart, setWorkStart] = useState(settings?.workStart || '09:00')
  const [workEnd, setWorkEnd] = useState(settings?.workEnd || '18:00')
  const [team, setTeam] = useState(settings?.team || '')
  const [notif, setNotif] = useState(settings?.notif || false)
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
    setTeam(profile.settings?.team || '')
    setNotif(profile.settings?.notif || false)
    const ti = THEMES.findIndex(t => t.ac === (profile.settings?.theme?.ac || '#00d4aa'))
    setSelectedTheme(ti >= 0 ? ti : 0)
  }, [profile])

  function markDirty() { setDirty(true) }

  function previewTheme(idx) {
    setSelectedTheme(idx)
    applyTheme(THEMES[idx])
    markDirty()
  }

  async function saveSettings() {
    if (workStart >= workEnd) { toast('End time must be after start', 'er'); return }
    setSaving(true)
    const theme = selectedTheme >= 0 ? THEMES[selectedTheme] : (settings?.theme || THEMES[0])

    const newSettings = {
      ...settings,
      workStart, workEnd, team: team.trim() || 'My Team',
      role: role.trim(), notif, theme,
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
      {/* Profile */}
      <div className="card m4">
        <div className="ch"><div className="ct">Profile</div></div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <div
                className="av av3"
                style={{ cursor: 'pointer' }}
                onClick={() => document.getElementById('pic_input')?.click()}
              >
                {profile?.photo_url ? <img src={profile.photo_url} alt="" /> : init}
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
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4 }}>Click avatar to change photo</div>
              {profile?.photo_url && (
                <button onClick={async () => {
                  await onUpdate({ photo_url: '' })
                  toast('Profile photo removed.', 'inf')
                }} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--fn)', marginTop: 4 }}>
                  Remove photo
                </button>
              )}
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

      {/* Hours */}
      <div className="card m4">
        <div className="ch"><div className="ct">Working Hours</div></div>
        <div style={{ padding: 18 }}>
          <div className="tc2">
            <div className="fd"><label>Start</label>
              <input type="time" value={workStart} onChange={e => { setWorkStart(e.target.value); markDirty() }} />
            </div>
            <div className="fd"><label>End</label>
              <input type="time" value={workEnd} onChange={e => { setWorkEnd(e.target.value); markDirty() }} />
            </div>
          </div>
        </div>
      </div>

      {/* Team */}
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

      {/* Theme */}
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

      {/* Notifications */}
      <div className="card m4">
        <div className="ch"><div className="ct">Notifications</div></div>
        <div style={{ padding: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 13px', background: 'var(--sf2)', border: '1px solid var(--bd2)', borderRadius: 'var(--rs)',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Hourly Reminders</div>
              <div style={{ fontSize: '11.5px', color: 'var(--tx2)' }}>Browser notification each hour</div>
            </div>
            <button className={`tog${notif ? ' on' : ''}`} onClick={() => {
              const newVal = !notif
              setNotif(newVal)
              markDirty()
              if (!newVal) return
              if (typeof Notification === 'undefined') return
              if (Notification.permission === 'default') Notification.requestPermission()
              else if (Notification.permission === 'denied') toast('Notifications blocked. Enable in browser settings.', 'er')
            }} />
          </div>
        </div>
      </div>

      {/* Save + Logout */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn bp" style={{ flex: 1 }} onClick={saveSettings} disabled={!dirty || saving}>
          {saving ? 'Saving…' : dirty ? 'Save Changes' : '✓ Saved'}
        </button>
        <button className="btn bdr bsm" onClick={doLogout}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  )
}
