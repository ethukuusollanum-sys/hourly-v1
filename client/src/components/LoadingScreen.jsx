export default function LoadingScreen() {
  return (
    <div id="_loading" style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 16, zIndex: 9000,
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid var(--bd2)', borderTopColor: 'var(--ac)',
        borderRadius: '50%', animation: 'spin .8s linear infinite',
      }}/>
      <div style={{ fontSize: 13, color: 'var(--tx2)' }}>Loading…</div>
    </div>
  )
}
