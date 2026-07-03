import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useActivities } from '../context/ActivitiesContext'
import { supabase } from '../config/supabase'
import { getToday, H, M, esc, timeToMin } from '../lib/helpers'
import CatIcon from '../components/CatIcon'

export default function TeamView({ profile }) {
  const { user } = useAuth()
  const { activities } = useActivities()
  const [mates, setMates] = useState([])
  const [loading, setLoading] = useState(true)
  const today = getToday()
  const categories = profile?.categories || []

  useEffect(() => {
    loadTeam()
  }, [profile?.settings?.team])

  async function loadTeam() {
    setLoading(true)
    const team = profile?.settings?.team
    if (!team) { setLoading(false); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('settings->>team', team)

    if (!profiles) { setLoading(false); return }

    const result = []
    for (const p of profiles) {
      if (p.id === user.id) continue
      const { data: acts } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', p.id)
        .eq('date', today)
        .order('created_at', { ascending: true })
      result.push({
        uid: p.id,
        name: p.name,
        email: p.email,
        role: p.settings?.role || '',
        photoURL: p.photo_url || '',
        acts: acts || [],
      })
    }
    setMates(result)
    setLoading(false)
  }

  const tn = profile?.settings?.team || 'My Team'
  const myActs = activities.filter(a => a.date === today)

  function getCat(id) {
    return categories.find(c => c.id === id) || { id, name: id, icon: 'star', color: '#3b82f6' }
  }

  function TeamCard({ name, email, role, acts, isMe, photoURL }) {
    const init = (name || '?').charAt(0).toUpperCase()
    const last = acts.length ? [...acts].sort((a, b) =>
      (a.created_at || '') < (b.created_at || '') ? -1 : 1
    ).pop() : null
    const ttm = acts.reduce((s, a) => s + (parseInt(a.duration) || 60), 0)
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    const isA = acts.some(a => {
      if (a.is_break) return false
      const ws = a.work_start ? timeToMin(a.work_start) : null
      if (ws === null) return false
      const dur = parseInt(a.duration) || 0
      return nowMin >= ws && nowMin < ws + dur
    })
    const productive = acts.filter(a => {
      const cat = categories.find(c => c.id === a.category)
      return cat?.name !== 'Break'
    }).length

    return (
      <section className="tc">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="av av2">
            {photoURL ? <img src={photoURL} alt={`${name || email}'s avatar`} /> : <span aria-label={name}>{init}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', margin: 0 }}>
              {esc(name || email)}
              {isMe && <span style={{ fontSize: '9.5px', color: 'var(--ac)', fontFamily: 'var(--mo)', marginLeft: 4 }}>(you)</span>}
            </h3>
            {role && <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{esc(role)}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <div className={`tdot${isA ? ' on' : ''}`} aria-hidden="true"></div>
              <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{isA ? 'Active now' : 'Offline today'}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--tx)' }}>{acts.length}</div>
            <div style={{ fontSize: 10, color: 'var(--tx3)' }}>tasks</div>
          </div>
        </div>
        {last ? (
          <div style={{
            padding: '9px 11px', background: 'var(--bg)',
            border: '1px solid var(--bd2)', borderRadius: 'var(--rs)',
          }}>
            <div style={{
              fontSize: '9.5px', color: 'var(--tx3)',
              textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 3,
            }}>Latest</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>{esc(last.name)}</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 1 }}>{last.slot} · {last.category}</div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--tx3)', textAlign: 'center', padding: 8 }}>
            No activity today
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--tx3)' }}>
          <span>{H(ttm)}h {M(ttm)}m</span>
          <span>{productive} productive</span>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <div className="tg">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="tc">
            <div className="skel skel-card"></div>
            <div className="skel skel-line" style={{ width: '60%' }}></div>
            <div className="skel skel-line" style={{ width: '40%' }}></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="sh2 m5">
        <div>
          <h2 className="st" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} aria-hidden="true" /> {esc(tn)}
          </h2>
          <div className="ss">Today · {mates.length + 1} members</div>
        </div>
      </div>
      <div className="tg">
        <TeamCard
          name={profile?.name || user?.email?.split('@')[0]}
          email={user?.email}
          role={profile?.settings?.role}
          acts={myActs}
          isMe={true}
          photoURL={profile?.photo_url}
        />
        {mates.map(m => (
          <TeamCard key={m.uid} {...m} isMe={false} />
        ))}
      </div>
      {!mates.length && (
        <div style={{
          marginTop: 16, padding: 22, background: 'var(--sf)',
          border: '1px dashed var(--bd2)', borderRadius: 'var(--r)',
          textAlign: 'center', color: 'var(--tx2)',
        }}>
          <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
            <Users size={24} color="var(--tx3)" aria-hidden="true" />
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: 4 }}>No teammates yet</div>
          <div style={{ fontSize: 12 }}>
            Ask colleagues to sign up with team name <strong style={{ color: 'var(--ac)' }}>"{esc(tn)}"</strong>
          </div>
        </div>
      )}
    </>
  )
}