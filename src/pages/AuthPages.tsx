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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const done = useAfterAuth()
  const login = useMutation({ mutationFn: () => authApi.login(email, password), onSuccess: done })
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
          <span>อีเมล</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>รหัสผ่าน</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {login.error && <p className="error-text">{errorMessage(login.error)}</p>}
        <button className="btn btn-primary" disabled={login.isPending}>
          เข้าสู่ระบบ
        </button>
        <Link to="/reset-password" className="small" style={{ alignSelf: 'center' }}>
          ลืมรหัสผ่าน?
        </Link>
      </form>
      <p className="faint small">Mock: ใช้อีเมลของผู้ใช้ตัวอย่าง เช่น pisit@example.com กับรหัสผ่านอะไรก็ได้ หรือสลับผู้ใช้จากปุ่ม Mock ด้านล่างซ้าย</p>
    </AuthCard>
  )
}

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const done = useAfterAuth()
  const reg = useMutation({ mutationFn: () => authApi.register(email, password, name), onSuccess: done })
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
          <span>อีเมล</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Display Name</span>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</span>
          <input className="input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {reg.error && <p className="error-text">{errorMessage(reg.error)}</p>}
        <button className="btn btn-primary" disabled={reg.isPending}>
          สมัครสมาชิก
        </button>
      </form>
    </AuthCard>
  )
}

export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const reset = useMutation({ mutationFn: () => authApi.requestPasswordReset(email) })
  return (
    <AuthCard title="ลืมรหัสผ่าน" footer={<Link to="/login">กลับไปเข้าสู่ระบบ</Link>}>
      {reset.isSuccess ? (
        <p>ถ้ามีบัญชีที่ใช้อีเมลนี้ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว</p>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            reset.mutate()
          }}
        >
          <label className="field">
            <span>อีเมล</span>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn btn-primary" disabled={reset.isPending}>
            ส่งลิงก์ตั้งรหัสผ่านใหม่
          </button>
        </form>
      )}
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
  const verify = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => {
      qc.invalidateQueries()
      toast('ยืนยันอีเมลแล้ว')
    },
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
      {!me.emailVerified && (
        <div className="banner row wrap between">
          <span>ยังไม่ได้ยืนยันอีเมล จึงยังสร้าง Build หรือโหวตไม่ได้</span>
          <button className="btn btn-sm btn-primary" onClick={() => verify.mutate()}>
            จำลองการกดลิงก์ยืนยัน
          </button>
        </div>
      )}
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <label className="field">
          <span>อีเมล</span>
          <input className="input" value={me.email} disabled />
        </label>
        <label className="field">
          <span>Display Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={save.isPending || name === me.displayName}>
          บันทึก
        </button>
      </form>

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

export function NotFoundPage() {
  return (
    <div className="page">
      <div className="empty">
        ไม่พบหน้านี้ <Link to="/">กลับหน้าแรก</Link>
      </div>
    </div>
  )
}
