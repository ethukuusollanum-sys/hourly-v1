import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type = 'inf') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const iconMap = { ok: CheckCircle, er: XCircle, inf: Info }

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <div id="toasts" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map(t => {
          const Icon = iconMap[t.type] || Info
          return (
            <div key={t.id} className={`toast ${t.type === 'ok' ? 'tok' : t.type === 'er' ? 'ter' : 'tinf'}`}>
              <Icon size={14} />
              <span>{t.msg}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}