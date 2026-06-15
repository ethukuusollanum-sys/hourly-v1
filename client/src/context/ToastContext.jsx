import { createContext, useContext, useState, useCallback } from 'react'

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

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <div id="toasts">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type === 'ok' ? 'tok' : t.type === 'er' ? 'ter' : 'tinf'}`}>
            <span>{t.type === 'ok' ? '✅' : t.type === 'er' ? '❌' : 'ℹ️'}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
