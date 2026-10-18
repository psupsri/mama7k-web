import { NavLink, Outlet } from 'react-router-dom'
import { useMe } from '../../hooks/queries'
import { RequireAuth } from '../RequireAuth'

export function AdminLayout() {
  const { data: me } = useMe()
  return (
    <RequireAuth admin>
      <div className="page">
        <div className="row between wrap">
          <h1>Admin</h1>
          <span className="badge badge-gold">{me?.role}</span>
        </div>
        <nav className="nav" aria-label="เมนู Admin" style={{ order: 0, width: '100%' }}>
          <NavLink to="/admin" end>
            Master Data
          </NavLink>
          <NavLink to="/admin/import">นำเข้าไฟล์</NavLink>
          <NavLink to="/admin/lineups">บ้านศัตรู</NavLink>
          <NavLink to="/admin/builds">Public Build</NavLink>
          <NavLink to="/admin/users">ผู้ใช้</NavLink>
          {me?.role === 'SUPER_ADMIN' && <NavLink to="/admin/audit">Audit log</NavLink>}
        </nav>
        <Outlet />
      </div>
    </RequireAuth>
  )
}
