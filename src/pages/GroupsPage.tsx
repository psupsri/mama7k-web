import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as groupsApi from '../api/groups'
import { useMyGroups } from '../hooks/queries'
import { Icon } from '../components/Icon'
import { Empty, ErrorState, Loading } from '../components/States'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/errors'
import { vars } from '../lib/style'
import { RequireAuth } from './RequireAuth'

export function GroupsPage() {
  return (
    <RequireAuth>
      <Groups />
    </RequireAuth>
  )
}

function Groups() {
  const { data, isLoading, error } = useMyGroups()
  const qc = useQueryClient()
  const nav = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const create = useMutation({
    mutationFn: () => groupsApi.createGroup(name),
    onSuccess: (g) => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      toast('สร้าง Group แล้ว')
      nav(`/groups/${g.id}`)
    },
    onError: (e) => toast(errorMessage(e), true),
  })
  const join = useMutation({
    mutationFn: () => groupsApi.joinGroup(code),
    onSuccess: (g) => {
      qc.invalidateQueries()
      toast(`เข้าร่วม ${g.name} แล้ว`)
      nav(`/groups/${g.id}`)
    },
    onError: (e) => toast(errorMessage(e), true),
  })

  return (
    <div className="page">
      <h1>Group</h1>
      <div className="grid-auto" style={vars({ '--min': '300px' })}>
        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <h2 style={{ fontSize: 16 }}>สร้าง Group ใหม่</h2>
          <label className="field">
            <span>ชื่อ Group</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ชื่อกิลด์" />
          </label>
          <button className="btn btn-primary" disabled={!name.trim() || create.isPending}>
            สร้าง
          </button>
        </form>
        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault()
            join.mutate()
          }}
        >
          <h2 style={{ fontSize: 16 }}>เข้าร่วมด้วย Invite Code</h2>
          <label className="field">
            <span>Invite Code</span>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="เช่น MAMA7K" />
          </label>
          <button className="btn" disabled={!code.trim() || join.isPending}>
            เข้าร่วม
          </button>
        </form>
      </div>

      <span className="label">Group ของฉัน</span>
      {isLoading ? (
        <Loading rows={2} />
      ) : error ? (
        <ErrorState error={error} />
      ) : data!.length === 0 ? (
        <Empty>ยังไม่ได้อยู่ใน Group ใด</Empty>
      ) : (
        <div className="grid-auto" style={vars({ '--min': '260px' })}>
          {data!.map((g) => (
            <Link key={g.group.id} to={`/groups/${g.group.id}`} className="card row" style={{ color: 'inherit' }}>
              <span className="img-slot fallback" style={{ width: 44, height: 44, borderRadius: 12 }}>
                <Icon name="users" />
              </span>
              <span className="stack grow" style={{ gap: 0 }}>
                <strong style={{ fontFamily: 'var(--font-display)' }}>{g.group.name}</strong>
                <span className="small muted">{g.memberCount} สมาชิก</span>
              </span>
              {g.isOwner && <span className="badge badge-gold">Owner</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
