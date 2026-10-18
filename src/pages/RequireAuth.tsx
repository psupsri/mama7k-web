import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useMe } from '../hooks/queries'
import { Loading } from '../components/States'

export function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { data: me, isLoading } = useMe()
  const location = useLocation()
  if (isLoading) return <div className="page"><Loading rows={2} /></div>
  if (!me) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (admin && me.role === 'USER') {
    return (
      <div className="page">
        <div className="empty">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>
      </div>
    )
  }
  return <>{children}</>
}
