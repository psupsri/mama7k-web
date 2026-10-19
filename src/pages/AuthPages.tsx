import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as authApi from '../api/auth'
import { useMe } from '../hooks/queries'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/errors'
import { RequireAuth } from './RequireAuth'

function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="page" style={{ maxWidth: 420, margin: '0 auto' }}>
      <div className="card stack" style={{ gap: 16, padding: 24 }}>
        <h1 style={{ fontSize: 24 }}>{title}</h1>
        {children}
      </div>
      {footer && <div className="small muted" style={{ textAlign: 'center' }}>{footer}</div>}
    </div>
  )
}

function useAfterAuth() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  return () => {
    qc.clear()
    nav(params.get('next') || '/', { replace: true })
  }
}

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const done = useAfterAuth()
  const login = useMutation({ mutationFn: () => authApi.login(username, password), onSuccess: done })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate()
  }
  return (
    <AuthCard
      title="เข้าสู่ระบบ"
      footer={
        <>
          ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
        </>
      }
    >
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>ชื่อผู้ใช้</span>
          <input
            className="input"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="field">
          <span>รหัสผ่าน</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {login.error && <p className="error-text">{errorMessage(login.error)}</p>}
        <button className="btn btn-primary" disabled={login.isPending}>
          เข้าสู่ระบบ
        </button>
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
          ลืมรหัสผ่าน? ติดต่อทีมงานเพื่อขอรหัสผ่านชั่วคราว
        </p>
      </form>
      {import.meta.env.DEV && <p className="faint small">Dev: ผู้ใช้ตัวอย่าง เช่น pisit รหัสผ่าน password123 หรือใช้ปุ่ม Dev ด้านล่างซ้าย</p>}
    </AuthCard>
  )
}

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const done = useAfterAuth()
  const reg = useMutation({ mutationFn: () => authApi.register(username, password, name), onSuccess: done })
  return (
    <AuthCard
      title="สมัครสมาชิก"
      footer={
        <>
          มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
        </>
      }
    >
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          reg.mutate()
        }}
      >
        <label className="field">
          <span>ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ · a-z, 0-9 และ . _ - @ ยาว 3–30 ตัว)</span>
          <input
            className="input"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            pattern="[A-Za-z0-9._@\-]{3,30}"
            title="a-z, 0-9 และ . _ - @ ยาว 3–30 ตัว"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="field">
          <span>ชื่อที่แสดง (ภาษาไทยได้ · เปลี่ยนภายหลังได้)</span>
          <input className="input" required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</span>
          <input className="input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <p className="small muted" style={{ margin: 0 }}>เราไม่เก็บอีเมล ถ้าลืมรหัสผ่านต้องติดต่อทีมงาน จึงควรจดรหัสผ่านไว้ให้ดี</p>
        {reg.error && <p className="error-text">{errorMessage(reg.error)}</p>}
        <button className="btn btn-primary" disabled={reg.isPending}>
          สมัครสมาชิก
        </button>
      </form>
    </AuthCard>
  )
}

export function ProfilePage() {
  return (
    <RequireAuth>
      <Profile />
    </RequireAuth>
  )
}

function Profile() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const nav = useNavigate()
  const toast = useToast()
  const [name, setName] = useState(me?.displayName ?? '')
  const [confirmText, setConfirmText] = useState('')

  const save = useMutation({
    mutationFn: () => authApi.updateProfile(name),
    onSuccess: () => {
      qc.invalidateQueries()
      toast('บันทึกแล้ว')
    },
    onError: (e) => toast(errorMessage(e), true),
  })
  const del = useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: () => {
      qc.clear()
      toast('ลบบัญชีแล้ว')
      nav('/')
    },
  })
  if (!me) return null

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <h1>โปรไฟล์</h1>
      {me.mustChangePassword && <div className="banner">ทีมงานรีเซ็ตรหัสผ่านให้แล้ว กรุณาตั้งรหัสผ่านใหม่ของคุณก่อนใช้งานต่อ</div>}
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <label className="field">
          <span>ชื่อผู้ใช้</span>
          <input className="input" value={me.username} disabled />
        </label>
        <label className="field">
          <span>ชื่อที่แสดง</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={save.isPending || name === me.displayName}>
          บันทึก
        </button>
      </form>

      <ChangePassword forced={me.mustChangePassword} />

      <section className="card stack" style={{ borderColor: 'var(--loss-border)' }}>
        <h2 style={{ fontSize: 17, color: 'var(--danger)' }}>ลบบัญชี</h2>
        <ul className="muted small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Build ที่เป็น Public ยังอยู่และทุกคนดูได้ แต่ไม่มีใครแก้ไขได้</li>
          <li>Build ที่แชร์กับ Group หรือ Private จะไม่มีใครเห็นอีก</li>
          <li>โหวตของคุณยังนับในสถิติแบบไม่ระบุตัวตน</li>
          <li>Group ที่คุณเป็น Owner จะโอนให้สมาชิกที่อยู่นานที่สุด หรือถูกลบถ้าไม่มีสมาชิก</li>
        </ul>
        <label className="field">
          <span>พิมพ์ "ลบบัญชี" เพื่อยืนยัน</span>
          <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </label>
        <button className="btn btn-danger" style={{ alignSelf: 'flex-start' }} disabled={confirmText !== 'ลบบัญชี' || del.isPending} onClick={() => del.mutate()}>
          ลบบัญชีถาวร
        </button>
      </section>
    </div>
  )
}

function ChangePassword({ forced }: { forced: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const change = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: (u) => {
      qc.setQueryData(['me'], u)
      setCurrent('')
      setNext('')
      setAgain('')
      toast('เปลี่ยนรหัสผ่านแล้ว เครื่องอื่นที่เคยเข้าสู่ระบบถูกออกจากระบบ')
    },
  })
  const mismatch = again !== '' && again !== next
  return (
    <form
      className="card stack"
      style={forced ? { borderColor: 'var(--gold)' } : undefined}
      onSubmit={(e) => {
        e.preventDefault()
        if (!mismatch) change.mutate()
      }}
    >
      <h2 style={{ fontSize: 17 }}>เปลี่ยนรหัสผ่าน</h2>
      <label className="field">
        <span>{forced ? 'รหัสผ่านชั่วคราวที่ได้จากทีมงาน' : 'รหัสผ่านปัจจุบัน'}</span>
        <input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="field">
        <span>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</span>
        <input className="input" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={next} onChange={(e) => setNext(e.target.value)} />
      </label>
      <label className="field">
        <span>ยืนยันรหัสผ่านใหม่</span>
        <input className="input" type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
      </label>
      {mismatch && <p className="error-text">รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน</p>}
      {change.error && <p className="error-text">{errorMessage(change.error)}</p>}
      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={change.isPending || mismatch}>
        เปลี่ยนรหัสผ่าน
      </button>
    </form>
  )
}

export function NotFoundPage() {
  return (
    <div className="page">
      <div className="empty">
        ไม่พบหน้านี้ <Link to="/">กลับหน้าแรก</Link>
      </div>
    </div>
  )
}
