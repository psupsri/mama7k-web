import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as authApi from '../api/auth'
import { errorMessage } from '../lib/errors'
import { useMe } from '../hooks/queries'
import { applyTheme, getTheme, type Theme } from '../lib/theme'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { useToast } from '../hooks/useToast'

export function Layout() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const nav = useNavigate()
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.clear()
      nav('/')
    },
  })

  return (
    <>
      <a href="#main" className="sr-only">
        ข้ามไปเนื้อหา
      </a>
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">7K</span>
            <span className="brand-text">Re Community</span>
          </Link>
          <nav className="nav" aria-label="เมนูหลัก">
            <NavLink to="/" end>
              บ้านศัตรู
            </NavLink>
            {me && <NavLink to="/me/builds">Build ของฉัน</NavLink>}
            {me && <NavLink to="/groups">Group</NavLink>}
            {me && me.role !== 'USER' && <NavLink to="/admin">Admin</NavLink>}
          </nav>
          <div className="header-right">
            <ThemeToggle />
            {me ? (
              <>
                <Link to="/profile" className="btn btn-sm">
                  {me.displayName}
                </Link>
                <button className="btn btn-sm btn-ghost" onClick={() => logout.mutate()}>
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-sm">
                  เข้าสู่ระบบ
                </Link>
                <Link to="/register" className="btn btn-sm btn-primary">
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="container">
        <Outlet />
      </main>
      <DevLogin />
    </>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getTheme)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      className="icon-btn"
      aria-label={next === 'dark' ? 'เปลี่ยนเป็นธีมมืด' : 'เปลี่ยนเป็นธีมสว่าง'}
      title={next === 'dark' ? 'ธีมมืด' : 'ธีมสว่าง'}
      onClick={() => {
        applyTheme(next)
        setTheme(next)
      }}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}

const DEV_USERS = [
  { email: 'pisit@example.com', name: 'Pisit', note: 'Super Admin · Owner กิลด์มาม่า · สมาชิก Night Raid' },
  { email: 'mee@example.com', name: 'หมีน้อย', note: 'สมาชิกกิลด์มาม่า' },
  { email: 'shadow@example.com', name: 'ShadowBlade', note: 'Moderator · Owner Night Raid' },
  { email: 'fah@example.com', name: 'สายฟ้า', note: 'Owner ห้องลับสายฟ้า (นอก 2 Group แรก)' },
  { email: 'banned@example.com', name: 'โดนแบน', note: 'ถูกระงับ: login ไม่ได้' },
]

/** Development-only quick login with the seeded users (password123). Not in production builds. */
function DevLogin() {
  const [open, setOpen] = useState(false)
  const { data: me } = useMe()
  const qc = useQueryClient()
  const toast = useToast()
  if (!import.meta.env.DEV) return null

  const switchTo = async (email: string | null) => {
    try {
      if (email) await authApi.login(email, 'password123')
      else await authApi.logout()
      qc.clear()
      setOpen(false)
      toast(email ? `เข้าสู่ระบบเป็น ${email}` : 'ออกจากระบบแล้ว (Guest)')
    } catch (e) {
      toast(errorMessage(e), true)
    }
  }

  return (
    <>
      <button className="dev-fab" onClick={() => setOpen(true)}>
        Dev: {me?.displayName ?? 'Guest'}
      </button>
      {open && (
        <Modal title="Dev login" onClose={() => setOpen(false)}>
          <p className="muted small">
            เข้าสู่ระบบด้วยผู้ใช้ตัวอย่างจาก seed เพื่อทดสอบสิทธิ์ (รหัสผ่าน password123) ล้างข้อมูลกลับเป็นค่าเริ่มต้นด้วย <code>go run ./cmd/seed</code> ในโฟลเดอร์ api
          </p>
          <div className="stack" style={{ gap: 6 }}>
            <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => switchTo(null)}>
              Guest (ไม่ได้เข้าสู่ระบบ)
            </button>
            {DEV_USERS.map((u) => (
              <button key={u.email} className="btn" style={{ justifyContent: 'space-between', textAlign: 'left' }} onClick={() => switchTo(u.email)}>
                <span>
                  {u.name} <span className="faint small">{u.email}</span>
                </span>
                <span className="small muted">{u.note}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}
