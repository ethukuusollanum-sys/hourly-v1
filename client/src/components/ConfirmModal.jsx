import { useState, useCallback, useRef, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal() {
  const [state, setState] = useState({ isOpen: false, message: '', title: 'Confirm', confirmLabel: 'Delete', type: 'danger' })
  const resolveRef = useRef(null)
  const confirmBtnRef = useRef(null)

  const confirm = useCallback((message, title = 'Confirm', confirmLabel = 'Delete', type = 'danger') => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({ isOpen: true, message, title, confirmLabel, type })
    })
  }, [])

  useEffect(() => {
    window.__confirm = confirm
    return () => { delete window.__confirm }
  }, [confirm])

  useEffect(() => {
    if (state.isOpen) {
      confirmBtnRef.current?.focus()
    }
  }, [state.isOpen])

  useEffect(() => {
    if (!state.isOpen) return
    function handleKey(e) {
      if (e.key === 'Escape') handleCancel()
      if (e.key === 'Enter') handleConfirm()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [state.isOpen])

  function handleConfirm() {
    resolveRef.current?.(true)
    setState({ isOpen: false, message: '', title: 'Confirm', confirmLabel: 'Delete', type: 'danger' })
  }

  function handleCancel() {
    resolveRef.current?.(false)
    setState({ isOpen: false, message: '', title: 'Confirm', confirmLabel: 'Delete', type: 'danger' })
  }

  if (!state.isOpen) return null

  return (
    <div className="ov" onClick={handleCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ animation: 'su .25s ease' }}>
        <div className="mh" style={{ border: 'none', paddingBottom: 0 }}>
          <div id="confirm-title" className="mt2" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: state.type === 'danger' ? 'rgba(244,63,94,.12)' : 'rgba(249,115,22,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={16} color={state.type === 'danger' ? 'var(--red)' : 'var(--or)'} />
            </span>
            {state.title}
          </div>
          <button className="ib" onClick={handleCancel} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="mb2" style={{ paddingTop: 8 }}>
          <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.6 }}>{state.message}</p>
        </div>
        <div className="mf" style={{ gap: 8 }}>
          <button className="btn bs bsm" onClick={handleCancel}>Cancel</button>
          <button className={`btn ${state.type === 'danger' ? 'bdr' : 'bp'} bsm`} ref={confirmBtnRef} onClick={handleConfirm}>{state.confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
