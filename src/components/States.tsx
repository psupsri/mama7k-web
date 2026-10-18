import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="กำลังโหลด">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  )
}

export function ErrorState({ error, backTo = '/' }: { error: unknown; backTo?: string }) {
  const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
  return (
    <div className="empty stack" style={{ alignItems: 'center' }}>
      <p>{msg}</p>
      <Link to={backTo} className="btn">
        กลับ
      </Link>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
