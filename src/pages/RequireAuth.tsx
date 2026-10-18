import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useMe } from '../hooks/queries'
import { Loading } from '../components/States'

export function RequireAuth({ children, verified, admin }: { children: ReactNode; verified?: boolean; admin?: boolean }) {
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
  if (verified && !me.emailVerified) {
    return (
      <div className="page">
        <div className="banner">
          ต้องยืนยันอีเมลก่อนจึงจะสร้างหรือโหวตได้ <Link to="/profile">ไปที่หน้าโปรไฟล์</Link>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
