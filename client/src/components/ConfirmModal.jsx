import { useState, useCallback, useRef, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal() {
  const [state, setState] = useState({ isOpen: false, message: '', title: 'Confirm' })
  const resolveRef = useRef(null)

  const confirm = useCallback((message, title = 'Confirm') => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({ isOpen: true, message, title })
    })
  }, [])

  useEffect(() => {
    window.__confirm = confirm
    return () => { delete window.__confirm }
  }, [confirm])

  function handleConfirm() {
    resolveRef.current?.(true)
    setState({ isOpen: false, message: '', title: 'Confirm' })
  }

  function handleCancel() {
    resolveRef.current?.(false)
    setState({ isOpen: false, message: '', title: 'Confirm' })
  }

  if (!state.isOpen) return null

  return (
    <div className="ov" onClick={handleCancel}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="mt2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="var(--or)" />
            {state.title}
          </div>
          <button className="ib" onClick={handleCancel}><X size={16} /></button>
        </div>
        <div className="mb2">
          <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.6 }}>{state.message}</p>
        </div>
        <div className="mf">
          <button className="btn bs bsm" onClick={handleCancel}>Cancel</button>
          <button className="btn bdr bsm" onClick={handleConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}
