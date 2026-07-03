import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useToast } from '../context/ToastContext'
import { Timer, Mail, Lock, User, Clock, Users, Sparkles, Download, Eye, EyeOff, ArrowLeft, Info, Send } from 'lucide-react'

export default function AuthPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [panel, setPanel] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [vfyEmail, setVfyEmail] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setInterval(() => setResendTimer(v => v - 1), 1000)
      return () => clearInterval(t)
    }
  }, [resendTimer])

  async function doLogin() {
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(friendlyErr(err.code || err.message))
      setLoading(false)
    }
  }

  async function doSignup() {
    setError('')
    if (!name) { setError('Please enter your name.'); return }
    if (!email || !email.includes('@')) { setError('Please enter a valid email.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error: err, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (err) {
      setError(friendlyErr(err.code || err.message))
      setLoading(false)
      return
    }
    setVfyEmail(email)
    setPanel('verify')
    startResendTimer()
    toast('Verification email sent! Check your inbox.', 'ok')
    setLoading(false)
  }

  async function sendPasswordReset() {
    setError('')
    if (!email || !email.includes('@')) { setError('Please enter a valid email.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email)
    if (err) {
      setError(friendlyErr(err.code || err.message))
    } else {
      toast('Reset email sent!', 'ok')
      setPanel('forgot-done')
    }
    setLoading(false)
  }

  async function resendVerification() {
    setLoading(true)
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: vfyEmail })
    if (err) { toast(friendlyErr(err.code || err.message), 'er') }
    else { toast('Verification email resent!', 'ok') }
    startResendTimer()
    setLoading(false)
  }

  function startResendTimer() { setResendTimer(30) }

  return (
    <div id="asc">
      <div className="aw">
        <div className="al">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div className="lic"><Timer size={18} color="#000" /></div>
              <div><div className="lnm">Hourly Tracker</div><div className="lsb">Team Edition</div></div>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--tx)', lineHeight: 1.3, marginBottom: 10 }}>
              Track every hour.<br />Build your team.
            </h1>
            <p style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, marginBottom: 28 }}>
              Effortless hourly logging with team visibility, AI summaries, and Excel exports.
            </p>
          </div>
          <div className="afl">
            <div className="af"><div className="afic"><Clock size={14} color="var(--ac)" /></div>Frictionless hourly activity logging</div>
            <div className="af"><div className="afic"><Users size={14} color="var(--ac)" /></div>See your whole team's day in real-time</div>
            <div className="af"><div className="afic"><Sparkles size={14} color="var(--ac)" /></div>AI-generated weekly productivity summaries</div>
            <div className="af"><div className="afic"><Download size={14} color="var(--ac)" /></div>Advanced Excel export with date filters</div>
          </div>
        </div>
        <div className="ar">
          <div style={{ maxWidth: 340, width: '100%' }}>
            {/* LOGIN */}
            {panel === 'login' && (
              <div id="panel-login">
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Welcome back</h2>
                <p style={{ fontSize: '12.5px', color: 'var(--tx2)', marginBottom: 20 }}>Sign in to your workspace.</p>
                <div className="fd m3">
                  <label>Email Address</label>
                  <div className="iw hic">
                    <span className="iic"><Mail size={15} color="var(--tx3)" aria-hidden="true" /></span>
                    <input type="email" placeholder="you@company.com" autoComplete="email"
                      value={email} onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') doLogin() }} />
                  </div>
                </div>
                <div className="fd m3">
                  <label>Password</label>
                  <div className="iw hic hicr">
                    <span className="iic"><Lock size={15} color="var(--tx3)" aria-hidden="true" /></span>
                    <input type={showPw ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') doLogin() }} />
                    <span className="iic-r" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </span>
                  </div>
                </div>
                {error && <div className="errmsg m3" role="alert">{error}</div>}
                <button className="btn bp bfw" onClick={doLogin} disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                  <button onClick={() => { setPanel('signup'); setError('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'var(--fn)' }}>
                    Create account
                  </button>
                  <button onClick={() => { setPanel('forgot'); setError('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--tx2)', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'var(--fn)' }}>
                    Forgot password?
                  </button>
                </div>
              </div>
            )}

            {/* SIGNUP */}
            {panel === 'signup' && (
              <div id="panel-signup">
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Create account</h2>
                <p style={{ fontSize: '12.5px', color: 'var(--tx2)', marginBottom: 18 }}>
                  A verification email will be sent to confirm.
                </p>
                <div className="fd m3">
                  <label>Full Name</label>
                  <div className="iw hic">
                    <span className="iic"><User size={15} color="var(--tx3)" aria-hidden="true" /></span>
                    <input type="text" placeholder="Jane Doe" autoComplete="name"
                      value={name} onChange={e => setName(e.target.value)} />
                  </div>
                </div>
                <div className="fd m3">
                  <label>Email Address</label>
                  <div className="iw hic">
                    <span className="iic"><Mail size={15} color="var(--tx3)" aria-hidden="true" /></span>
                    <input type="email" placeholder="you@company.com"
                      value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="fd m3">
                  <label>Password</label>
                  <div className="iw hic hicr">
                    <span className="iic"><Lock size={15} color="var(--tx3)" aria-hidden="true" /></span>
                    <input type={showPw ? 'text' : 'password'} placeholder="Min 6 characters" minLength={6}
                      value={password} onChange={e => setPassword(e.target.value)} />
                    <span className="iic-r" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </span>
                  </div>
                </div>
                {error && <div className="errmsg m3" role="alert">{error}</div>}
                <button className="btn bp bfw" onClick={doSignup} disabled={loading}>
                  {loading ? 'Creating…' : 'Create Account'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button onClick={() => { setPanel('login'); setError('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'var(--fn)' }}>
                    Already have an account? Sign in
                  </button>
                </div>
              </div>
            )}

            {/* VERIFY */}
            {panel === 'verify' && (
              <div id="panel-verify" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--acbg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={24} color="var(--ac)" />
                  </div>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Verification email sent!</h2>
                <p style={{ fontSize: '12.5px', color: 'var(--tx2)', marginTop: 6, lineHeight: 1.6 }}>
                  We sent a link to <strong>{vfyEmail}</strong>.<br />
                  Click the link, then sign in below.
                </p>
                <div className="infbox" style={{ marginTop: 16, marginBottom: 16, textAlign: 'left' }}>
                  <Info size={16} color="var(--ac)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Check your spam folder if not received.</span>
                </div>
                <button className="btn bp bfw" onClick={resendVerification} disabled={loading || resendTimer > 0} style={{ marginBottom: 8 }}>
                  <Send size={13} />
                  {loading ? 'Sending…' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}
                </button>
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => { setPanel('login'); setError('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'var(--fn)' }}>
                    Go to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* FORGOT */}
            {panel === 'forgot' && (
              <div id="panel-forgot">
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Reset Password</h2>
                <p style={{ fontSize: '12.5px', color: 'var(--tx2)', marginBottom: 18 }}>
                  Enter your email — we'll send a reset link.
                </p>
                <div className="fd m3">
                  <label>Email Address</label>
                  <div className="iw hic">
                    <span className="iic"><Mail size={15} color="var(--tx3)" aria-hidden="true" /></span>
                    <input type="email" placeholder="you@company.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') sendPasswordReset() }} />
                  </div>
                </div>
                {error && <div className="errmsg m3" role="alert">{error}</div>}
                <button className="btn bp bfw" onClick={sendPasswordReset} disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button onClick={() => { setPanel('login'); setError('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--tx2)', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'var(--fn)' }}>
                    <ArrowLeft size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} /> Back to sign in
                  </button>
                </div>
              </div>
            )}

            {/* FORGOT DONE */}
            {panel === 'forgot-done' && (
              <div id="fp-step2" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--acbg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={24} color="var(--ac)" />
                  </div>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Check your inbox</h2>
                <p style={{ fontSize: '12.5px', color: 'var(--tx2)', marginTop: 6, lineHeight: 1.6 }}>
                  A password reset link has been sent.
                </p>
                <div className="infbox" style={{ marginTop: 16, textAlign: 'left' }}>
                  <Info size={16} color="var(--ac)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Check spam folder if not received.</span>
                </div>
                <div style={{ marginTop: 14 }}>
                  <button onClick={() => { setPanel('login'); setError('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--tx2)', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'var(--fn)' }}>
                    <ArrowLeft size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} /> Back to sign in
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function friendlyErr(code) {
  const m = {
    'user-not-found': 'No account with this email.',
    'user_not_found': 'No account with this email.',
    'wrong-password': 'Incorrect password.',
    'invalid-credential': 'Invalid email or password.',
    'invalid_credentials': 'Invalid email or password.',
    'email-already-in-use': 'Email already registered.',
    'email_taken': 'Email already registered.',
    'weak-password': 'Password must be at least 6 characters.',
    'weak_password': 'Password must be at least 6 characters.',
    'too-many-requests': 'Too many attempts. Please wait.',
    'too_many_requests': 'Too many attempts. Please wait.',
    'network-request-failed': 'Network error.',
    'email_not_confirmed': 'Please verify your email address.',
    'invalid_grant': 'Session expired. Please sign in again.',
  }
  return m[code] || code || 'Something went wrong. Please try again.'
}