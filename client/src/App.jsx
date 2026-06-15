import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { supabase } from './config/supabase'
import { DEFAULT_CATEGORIES, applyTheme } from './lib/helpers'

import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import Dashboard from './pages/Dashboard'
import DailyLogs from './pages/DailyLogs'
import TeamView from './pages/TeamView'
import WeeklyReport from './pages/WeeklyReport'
import Categories from './pages/Categories'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'
import { ActivitiesProvider } from './context/ActivitiesContext'

export default function App() {
  const { user, session, loading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    loadProfile()
  }, [user])

  async function loadProfile() {
    setProfileLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (!error && data) {
      setProfile(data)
      const savedTheme = localStorage.getItem('ht_theme')
      if (savedTheme) {
        applyTheme(JSON.parse(savedTheme))
      } else if (data.settings?.theme) {
        applyTheme(data.settings.theme)
      }
    } else {
      setProfile(null)
    }
    setProfileLoading(false)
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (!error && data) {
      setProfile(data)
    }
    return { data, error }
  }

  if (loading) return <LoadingScreen />

  if (!session) {
    return <AuthPage />
  }

  if (profileLoading) return <LoadingScreen />

  const hasSettings = profile?.settings && Object.keys(profile.settings).length > 0

  if (!hasSettings) {
    return <OnboardingPage profile={profile} onComplete={loadProfile} />
  }

  return (
    <ActivitiesProvider profile={profile}>
      <Layout profile={profile} onProfileUpdate={setProfile}>
        <Routes>
          <Route path="/" element={<Dashboard profile={profile} />} />
          <Route path="/daily" element={<DailyLogs profile={profile} />} />
          <Route path="/team" element={<TeamView profile={profile} />} />
          <Route path="/weekly" element={<WeeklyReport profile={profile} />} />
          <Route path="/categories" element={<Categories profile={profile} onUpdate={updateProfile} />} />
          <Route path="/settings" element={<Settings profile={profile} onUpdate={updateProfile} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ActivitiesProvider>
  )
}
