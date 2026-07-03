import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../config/supabase'
import { esc, loadMode } from '../lib/helpers'
import { LayoutDashboard, CalendarDays, Users, BarChart2, Settings, Download, LogOut, ChevronsUpDown, Timer, X, SquareArrowOutUpRight, RefreshCw } from 'lucide-react'
import ActivityModal from './ActivityModal'
import ExportModal from './ExportModal'
import CategoryModal from './CategoryModal'
import CropModal from './CropModal'
import ConfirmModal from './ConfirmModal'
import AccSwitcher from './AccSwitcher'
import useHourlyReminder from '../hooks/useHourlyReminder'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, id: 'n_dash' },
  { path: '/daily', label: 'Daily Logs', icon: CalendarDays, id: 'n_daily' },
  { path: '/team', label: 'Team View', icon: Users, id: 'n_team' },
  { path: '/weekly', label: 'Weekly Report', icon: BarChart2, id: 'n_week' },
]

const NAV_ITEMS_BOTTOM = [
  { path: '/', label: 'Home', icon: LayoutDashboard, id: 'bn_dash' },
  { path: '/daily', label: 'Logs', icon: CalendarDays, id: 'bn_daily' },
  { path: '/team', label: 'Team', icon: Users, id: 'bn_team' },
  { path: '/weekly', label: 'Reports', icon: BarChart2, id: 'bn_week' },
]

export default function Layout({ children, profile, onProfileUpdate }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAccSwitcher, setShowAccSwitcher] = useState(false)

  const userData = {
    name: profile?.name || user?.email?.split('@')[0] || '?',
    email: user?.email || '',
    photoURL: profile?.photo_url || '',
    uid: user?.id,
  }

  const savedAccounts = getAccounts()
  const init = userData.name.charAt(0).toUpperCase()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    loadMode()
  }, [])

  useHourlyReminder(profile?.settings?.notif)

  useEffect(() => {
    window.__openAccSwitcher = () => setShowAccSwitcher(true)
    return () => { delete window.__openAccSwitcher }
  }, [])

  const [installEvent, setInstallEvent] = useState(null)
  const [installDismissed, setInstallDismissed] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const handler = () => setUpdateAvailable(true)
    window.addEventListener('swupdate', handler)
    return () => window.removeEventListener('swupdate', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallEvent(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installEvent) return
    installEvent.prompt()
    const result = await installEvent.userChoice
    if (result.outcome === 'accepted') setInstallEvent(null)
    setInstallDismissed(true)
  }

  function handleUpdate() {
    window.__swWaiting?.postMessage('skip-waiting')
    window.location.reload()
  }

  async function doLogout() {
    await supabase.auth.signOut()
    toast('Signed out', 'inf')
  }

  let pageTitle = 'Dashboard'
  switch (location.pathname) {
    case '/': pageTitle = 'Dashboard'; break
    case '/daily': pageTitle = 'Daily Logs'; break
    case '/team': pageTitle = 'Team View'; break
    case '/weekly': pageTitle = 'Weekly Report'; break
    case '/settings': pageTitle = 'Profile & Settings'; break
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <>
      <aside id="sb">
        <div className="logo">
          <div className="lic"><Timer size={18} color="#000" aria-hidden="true" /></div>
          <div>
            <div className="lnm">Hourly</div>
            <div className="lsb" id="sb_tm">{profile?.settings?.team || 'Team'}</div>
          </div>
        </div>
        <nav aria-label="Main navigation">
          <div className="nl">Workspace</div>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path ||
              (item.path === '/' && location.pathname === '/')
            return (
              <div
                key={item.id}
                className={`ni${isActive ? ' on' : ''}`}
                onClick={() => navigate(item.path)}
                role="link"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') navigate(item.path) }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nic"><Icon size={16} aria-hidden="true" /></span>
                {item.label}
              </div>
            )
          })}
          <div className="sep" />
          <div className="nl">Account</div>
          <div className={`ni${location.pathname === '/settings' ? ' on' : ''}`} onClick={() => navigate('/settings')}
            role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate('/settings') }}>
            <span className="nic"><Settings size={16} aria-hidden="true" /></span>Settings
          </div>
        </nav>
        <div className="sf">
          <button className="btn bs bfw bsm" onClick={() => { if (window.__openExport) window.__openExport() }} style={{ marginBottom: 4, gap: 6 }}>
            <Download size={13} aria-hidden="true" /> Export Report
          </button>
          <div className="up" style={{ cursor: 'pointer' }} onClick={() => setShowAccSwitcher(true)}>
            <div className="av" id="sb_av">
              {userData.photoURL ? <img src={userData.photoURL} alt={`${userData.name}'s avatar`} /> : <span aria-label={userData.name}>{init}</span>}
            </div>
            <div className="ui">
              <div className="un" id="sb_nm">{userData.name}</div>
              <div className="ue" id="sb_em">{userData.email}</div>
            </div>
            <ChevronsUpDown size={13} color="var(--tx3)" aria-hidden="true" />
          </div>
          <button className="btn bdr bfw bsm" onClick={doLogout} style={{ marginTop: 3, gap: 6 }}>
            <LogOut size={13} aria-hidden="true" /> Sign Out
          </button>
        </div>
      </aside>

      <main>
        <div className="bar">
          <div className="mo" style={{ alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--ac)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Timer size={16} color="#000" aria-hidden="true" />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                fontSize: 13.5, fontWeight: 700, lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>Hourly</div>
              <div style={{
                fontSize: 10.5, color: 'var(--tx2)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{today}</div>
            </div>
          </div>
          <div className="do" style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pageTitle}</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{today}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div
              className="av"
              style={{ width: 28, height: 28, fontSize: 12, cursor: 'pointer' }}
              onClick={() => navigate('/settings')}
              aria-label="Open settings"
            >
              {userData.photoURL ? <img src={userData.photoURL} alt={`${userData.name}'s avatar`} /> : <span aria-hidden="true">{init}</span>}
            </div>
          </div>
        </div>
        <div className="pg fa" id="vc">
          {children}
        </div>
      </main>

      {installEvent && !installDismissed && (
        <div id="install-banner" role="alert">
          <div className="install-banner-inner">
            <div>
              <div className="install-banner-title">Install Hourly Tracker</div>
              <div className="install-banner-text">Add to home screen for quick access</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn bs bsm" onClick={() => setInstallDismissed(true)}>Not now</button>
              <button className="btn bp bsm" onClick={handleInstall}><SquareArrowOutUpRight size={12} aria-hidden="true" /> Install</button>
            </div>
          </div>
        </div>
      )}

      {updateAvailable && (
        <div id="install-banner" role="alert">
          <div className="install-banner-inner" style={{ gap: 12 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--acbg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RefreshCw size={14} color="var(--ac)" aria-hidden="true" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="install-banner-title">Update Available</div>
              <div className="install-banner-text">A new version is ready — refresh to update</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn bs bsm" onClick={() => setUpdateAvailable(false)}>Later</button>
              <button className="btn bp bsm" onClick={handleUpdate} style={{ gap: 5 }}><RefreshCw size={11} aria-hidden="true" /> Update</button>
            </div>
          </div>
        </div>
      )}

      <div id="bnav">
        <div className="bnav-inner">
          <div>
            {NAV_ITEMS_BOTTOM.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path ||
                (item.path === '/' && location.pathname === '/')
              return (
                <button
                  key={item.id}
                  className={`bni${isActive ? ' on' : ''}`}
                  onClick={() => navigate(item.path)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="bni-icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  <span className="bni-lbl">{item.label}</span>
                  {isActive && (
                    <span style={{ position: 'absolute', inset: -1, borderRadius: 9999, background: 'linear-gradient(90deg,rgba(16,185,129,.1),transparent)', filter: 'blur(2px)', pointerEvents: 'none' }} aria-hidden="true" />
                  )}
                </button>
              )
            })}
            <button
              className={`bni${location.pathname === '/settings' ? ' on' : ''}`}
              onClick={() => navigate('/settings')}
              aria-label="Profile & Settings"
            >
              <span className="bni-icon" aria-hidden="true">
                <div style={{ width: 20, height: 20, borderRadius: '50%', padding: 1.5, border: '2px solid var(--bd2)', transition: 'all .3s', flexShrink: 0 }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: 'var(--tx)' }}>
                    {userData.photoURL ? <img src={userData.photoURL} alt={`${userData.name}'s avatar`} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : init}
                  </div>
                </div>
              </span>
              <span className="bni-lbl">Profile</span>
            </button>
          </div>
        </div>
      </div>

      <ActivityModal profile={profile} />
      <ExportModal profile={profile} />
      <CategoryModal profile={profile} onUpdate={onProfileUpdate} />
      <CropModal profile={profile} onUpdate={onProfileUpdate} />
      <ConfirmModal />
      {showAccSwitcher && (
        <AccSwitcher
          accounts={savedAccounts}
          currentUid={user?.id}
          currentUser={{ ...userData, uid: user?.id }}
          onClose={() => setShowAccSwitcher(false)}
          onLogout={doLogout}
        />
      )}
    </>
  )
}

function getAccounts() {
  try {
    return Object.values(JSON.parse(localStorage.getItem('ht_accounts') || '{}'))
  } catch { return [] }
}