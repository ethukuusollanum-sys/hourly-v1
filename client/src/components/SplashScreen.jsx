import { useEffect, useState, useRef } from 'react'

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('enter')
  const ringRef = useRef(null)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('spin'), 200)
    const t2 = setTimeout(() => setPhase('zoom'), 2200)
    const t3 = setTimeout(() => onFinish(), 2900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onFinish])

  useEffect(() => {
    if (phase !== 'spin') return
    let angle = 0
    const id = setInterval(() => {
      angle = (angle + 4) % 360
      if (ringRef.current) ringRef.current.setAttribute('transform', `rotate(${angle} 60 60)`)
    }, 30)
    return () => clearInterval(id)
  }, [phase])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 28,
      zIndex: 9999,
      opacity: phase === 'zoom' ? 0 : 1,
      transition: 'opacity .5s ease',
    }}>
      <div style={{
        position: 'relative',
        transform: phase === 'zoom' ? 'scale(3.5)' : 'scale(1)',
        opacity: phase === 'enter' ? 0 : 1,
        transition: 'transform .55s cubic-bezier(.34,1.56,.64,1), opacity .4s ease',
      }}>
        <svg viewBox="0 0 120 120" style={{
          position: 'absolute', top: -20, left: -20, width: 120, height: 120,
          pointerEvents: 'none',
        }} aria-hidden="true">
          <g ref={ringRef}>
            {Array.from({length: 12}).map((_, i) => {
              const a = i * 30
              const rad = a * Math.PI / 180
              const r1 = 52, r2 = 58
              const x1 = 60 + r1 * Math.sin(rad)
              const y1 = 60 - r1 * Math.cos(rad)
              const x2 = 60 + r2 * Math.sin(rad)
              const y2 = 60 - r2 * Math.cos(rad)
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="var(--ac)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
              )
            })}
          </g>
        </svg>

        <img src="/icons/icon-512.png" alt="Hourly Tracker logo" width="80" height="80"
          style={{ display: 'block', borderRadius: 16, position: 'relative', zIndex: 1 }} />
      </div>
      <div style={{
        fontSize: 13, color: 'var(--tx2)',
        letterSpacing: '2.5px', textTransform: 'uppercase',
        opacity: phase === 'enter' ? 0 : 1,
        transition: 'opacity .4s ease .15s',
      }}>
        Hourly Tracker
      </div>
    </div>
  )
}