import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as authApi from '../api/auth'
import { resetDb } from '../mock/db'
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
      <DevPanel />
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

/** Mock-only tool for testing permissions as different users. Removed when the real API lands. */
function DevPanel() {
  const [open, setOpen] = useState(false)
  const { data: me } = useMe()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: users = [] } = useQuery({ queryKey: ['devUsers'], queryFn: authApi.devListUsers, enabled: open })

  const switchTo = async (id: string | null) => {
    await authApi.devSwitchUser(id)
    qc.clear()
    setOpen(false)
    const u = users.find((x) => x.id === id)
    toast(u?.suspended ? 'ผู้ใช้นี้ถูกระงับ จึงเข้าสู่ระบบไม่ได้ (เป็น Guest)' : `สลับเป็น ${u?.displayName ?? 'Guest'}`)
  }

  return (
    <>
      <button className="dev-fab" onClick={() => setOpen(true)}>
        Mock: {me?.displayName ?? 'Guest'}
      </button>
      {open && (
        <Modal title="Mock tools" onClose={() => setOpen(false)}>
          <p className="muted small">สลับผู้ใช้เพื่อทดสอบสิทธิ์การมองเห็น Build, Group และ Admin ข้อมูลเก็บใน localStorage ของเบราว์เซอร์นี้</p>
          <div className="stack" style={{ gap: 6 }}>
            <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => switchTo(null)} aria-pressed={!me}>
              Guest (ไม่ได้เข้าสู่ระบบ)
            </button>
            {users.map((u) => (
              <button key={u.id} className="btn" style={{ justifyContent: 'space-between' }} onClick={() => switchTo(u.id)}>
                <span>
                  {u.displayName} <span className="faint small">{u.email}</span>
                </span>
                <span className="row" style={{ gap: 4 }}>
                  {u.role !== 'USER' && <span className="badge badge-gold">{u.role}</span>}
                  {u.suspended && <span className="badge badge-danger">ถูกระงับ</span>}
                  {!u.emailVerified && <span className="badge badge-soft">ยังไม่ยืนยันอีเมล</span>}
                  {me?.id === u.id && <span className="badge badge-public">ใช้อยู่</span>}
                </span>
              </button>
            ))}
          </div>
          <hr className="divider" />
          <Link to="/demo/visibility" className="btn btn-primary" onClick={() => setOpen(false)}>
            ดูตัวอย่างสิทธิ์ Group และ Build
          </Link>
          <button
            className="btn btn-danger"
            onClick={() => {
              resetDb()
              qc.clear()
              setOpen(false)
              toast('รีเซ็ตข้อมูล mock แล้ว')
            }}
          >
            รีเซ็ตข้อมูล mock ทั้งหมด
          </button>
        </Modal>
      )}
    </>
  )
}
