import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../config/supabase'
import { esc } from '../lib/helpers'
import { LayoutDashboard, CalendarDays, Users, BarChart2, Tag, Settings, Download, LogOut, ChevronsUpDown, Menu, Timer, X } from 'lucide-react'
import ActivityModal from './ActivityModal'
import ExportModal from './ExportModal'
import CategoryModal from './CategoryModal'
import CropModal from './CropModal'
import AccSwitcher from './AccSwitcher'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, id: 'n_dash' },
  { path: '/daily', label: 'Daily Logs', icon: CalendarDays, id: 'n_daily' },
  { path: '/team', label: 'Team View', icon: Users, id: 'n_team' },
  { path: '/weekly', label: 'Weekly Report', icon: BarChart2, id: 'n_week' },
]

const NAV_ITEMS_BOTTOM = [
  { path: '/', label: 'Home', icon: LayoutDashboard, id: 'bn_dash' },
  { path: '/daily', label: 'Logs', icon: CalendarDays, id: 'bn_daily' },
  { path: '/weekly', label: 'Reports', icon: BarChart2, id: 'bn_week' },
  { path: '/settings', label: 'Settings', icon: Settings, id: 'bn_set' },
]

export default function Layout({ children, profile, onProfileUpdate }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAccSwitcher, setShowAccSwitcher] = useState(false)
  const pillRef = useRef(null)
  const navInnerRef = useRef(null)

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
    requestAnimationFrame(() => {
      updatePill()
    })
  }, [location.pathname])

  function updatePill() {
    const pill = pillRef.current
    const inner = navInnerRef.current
    if (!pill || !inner) return
    const activeItem = inner.querySelector('.bni.on')
    if (activeItem) {
      const tr = activeItem.getBoundingClientRect()
      const pr = inner.getBoundingClientRect()
      pill.style.left = (tr.left - pr.left + 4) + 'px'
      pill.style.width = (tr.width - 8) + 'px'
    }
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
    case '/categories': pageTitle = 'Categories'; break
    case '/settings': pageTitle = 'Settings'; break
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <>
      <div id="mobov" className={sidebarOpen ? 'on' : ''} onClick={() => setSidebarOpen(false)} />

      <aside id="sb" className={sidebarOpen ? 'open' : ''}>
        <div className="logo">
          <div className="lic"><Timer size={18} color="#000" /></div>
          <div>
            <div className="lnm">Hourly</div>
            <div className="lsb" id="sb_tm">{profile?.settings?.team || 'Team'}</div>
          </div>
        </div>
        <nav>
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
              >
                <span className="nic"><Icon size={16} /></span>
                {item.label}
              </div>
            )
          })}
          <div className="sep" />
          <div className="nl">Account</div>
          <div className={`ni${location.pathname === '/categories' ? ' on' : ''}`} onClick={() => navigate('/categories')}>
            <span className="nic"><Tag size={16} /></span>Categories
          </div>
          <div className={`ni${location.pathname === '/settings' ? ' on' : ''}`} onClick={() => navigate('/settings')}>
            <span className="nic"><Settings size={16} /></span>Settings
          </div>
        </nav>
        <div className="sf">
          <button className="btn bs bfw bsm" onClick={() => {}} style={{ marginBottom: 4, gap: 6 }}>
            <Download size={13} /> Export Report
          </button>
          <div className="up" style={{ cursor: 'pointer' }} onClick={() => setShowAccSwitcher(true)}>
            <div className="av" id="sb_av">
              {userData.photoURL ? <img src={userData.photoURL} alt="" /> : init}
            </div>
            <div className="ui">
              <div className="un" id="sb_nm">{userData.name}</div>
              <div className="ue" id="sb_em">{userData.email}</div>
            </div>
            <ChevronsUpDown size={13} color="var(--tx3)" />
          </div>
          <button className="btn bdr bfw bsm" onClick={doLogout} style={{ marginTop: 3, gap: 6 }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      <main>
        <div className="bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="ham" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 700 }}>{pageTitle}</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{today}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className="av"
              style={{ width: 28, height: 28, fontSize: 12, cursor: 'pointer' }}
              onClick={() => navigate('/settings')}
            >
              {userData.photoURL ? <img src={userData.photoURL} alt="" /> : init}
            </div>
          </div>
        </div>
        <div className="pg fa" id="vc">
          {children}
        </div>
      </main>

      <div id="bnav">
        <div className="bnav-inner" ref={navInnerRef}>
          <div className="bnav-pill" ref={pillRef} />
          {NAV_ITEMS_BOTTOM.map((item, idx) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path ||
              (item.path === '/' && location.pathname === '/')
            return (
              <div
                key={item.id}
                className={`bni${isActive ? ' on' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="bni-icon"><Icon size={20} /></span>
                <span className="bni-lbl">{item.label}</span>
              </div>
            )
          })}
          <div className="bni" onClick={() => setShowAccSwitcher(true)}>
            <span className="bni-icon">
              <div className="av" style={{ width: 22, height: 22, fontSize: 10 }}>
                {userData.photoURL ? <img src={userData.photoURL} alt="" /> : init}
              </div>
            </span>
            <span className="bni-lbl">Account</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ActivityModal profile={profile} />
      <ExportModal profile={profile} />
      <CategoryModal profile={profile} onUpdate={onProfileUpdate} />
      <CropModal profile={profile} onUpdate={onProfileUpdate} />
      {showAccSwitcher && (
        <AccSwitcher
          accounts={savedAccounts}
          currentUid={user?.id}
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
