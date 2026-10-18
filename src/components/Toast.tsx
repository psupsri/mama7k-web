import { useCallback, useState, type ReactNode } from 'react'
import { ToastContext } from '../hooks/useToast'

interface ToastItem {
  id: number
  text: string
  error?: boolean
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((text: string, error = false) => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, text, error }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.error ? ' error' : ''}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
