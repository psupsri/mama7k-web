import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as groupsApi from '../api/groups'
import { useGroup, useMe } from '../hooks/queries'
import { formatDate } from '../lib/labels'
import { vars } from '../lib/style'
import { BuildCard } from '../components/BuildCard'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { Empty, ErrorState, Loading } from '../components/States'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/errors'
import { RequireAuth } from './RequireAuth'

export function GroupDetailPage() {
  return (
    <RequireAuth>
      <GroupDetail />
    </RequireAuth>
  )
}

function GroupDetail() {
  const { groupId = '' } = useParams()
  const { data: g, isLoading, error } = useGroup(groupId)
  const { data: me } = useMe()
  const qc = useQueryClient()
  const nav = useNavigate()
  const toast = useToast()
  const [transferTo, setTransferTo] = useState<{ id: string; name: string } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)

  const run = (fn: () => Promise<unknown>, ok: string, after?: () => void) =>
    fn()
      .then(() => {
        qc.invalidateQueries()
        toast(ok)
        after?.()
      })
      .catch((e) => toast(errorMessage(e), true))

  const hide = useMutation({
    mutationFn: (v: { buildId: string; hidden: boolean }) => groupsApi.setBuildHidden(groupId, v.buildId, v.hidden),
    onSuccess: (_, v) => {
      qc.invalidateQueries()
      toast(v.hidden ? 'ซ่อน Build ใน Group นี้แล้ว' : 'แสดง Build ใน Group นี้แล้ว')
    },
    onError: (e) => toast(errorMessage(e), true),
  })

  if (isLoading) return <div className="page"><Loading /></div>
  if (error || !g) return <div className="page"><ErrorState error={error} backTo="/groups" /></div>

  const inviteLink = `${location.origin}/join/${g.group.inviteCode}`
  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast('คัดลอกแล้ว'))

  return (
    <div className="page">
      <nav aria-label="breadcrumb" className="row small">
        <Link to="/groups" className="muted">
          Group
        </Link>
        <span className="faint">/</span>
        <span className="faint">{g.group.name}</span>
      </nav>

      <div className="row between wrap">
        <div className="stack" style={{ gap: 4 }}>
          <h1>{g.group.name}</h1>
          <span className="muted small">{g.memberCount} สมาชิก{g.isOwner && ' · คุณเป็น Owner'}</span>
        </div>
        <div className="row wrap">
          {g.isOwner ? (
            <>
              <button className="btn btn-sm" onClick={() => setRenaming(g.group.name)}>
                <Icon name="edit" size={14} /> เปลี่ยนชื่อ
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() =>
                  confirm(`ลบ Group "${g.group.name}" ถาวร? Build ที่ไม่เหลือ Group จะกลายเป็น Private ของผู้สร้าง`) &&
                  run(() => groupsApi.deleteGroup(groupId), 'ลบ Group แล้ว', () => nav('/groups'))
                }
              >
                ลบ Group
              </button>
            </>
          ) : (
            <button
              className="btn btn-sm btn-danger"
              onClick={() =>
                confirm('ออกจาก Group? คุณจะเห็น Build ของ Group นี้ไม่ได้ทันที และ Build ของคุณที่แชร์ไว้จะถูกถอดออกจาก Group นี้') &&
                run(() => groupsApi.leaveGroup(groupId), 'ออกจาก Group แล้ว', () => nav('/groups'))
              }
            >
              ออกจาก Group
            </button>
          )}
        </div>
      </div>

      <div className="grid-auto" style={vars({ '--min': '320px' })}>
        {g.isOwner && (
          <section className="card stack">
            <span className="label">เชิญสมาชิก</span>
            <div className="row">
              <code className="num" style={{ fontSize: 22, letterSpacing: '0.12em' }}>
                {g.group.inviteCode}
              </code>
              <button className="icon-btn" aria-label="คัดลอก Invite Code" onClick={() => copy(g.group.inviteCode)}>
                <Icon name="copy" />
              </button>
            </div>
            <div className="row small">
              <span className="muted grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inviteLink}
              </span>
              <button className="btn btn-sm" onClick={() => copy(inviteLink)}>
                คัดลอกลิงก์
              </button>
            </div>
            <button
              className="btn btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() =>
                confirm('สร้างโค้ดใหม่? โค้ดและลิงก์เดิมจะใช้ไม่ได้ทันที') &&
                run(() => groupsApi.regenerateInvite(groupId), 'สร้าง Invite Code ใหม่แล้ว')
              }
            >
              สร้างโค้ดใหม่
            </button>
          </section>
        )}

        <section className="card stack">
          <span className="label">สมาชิก</span>
          <table className="table">
            <tbody>
              {g.members.map((mem) => (
                <tr key={mem.user.id}>
                  <td>
                    {mem.user.displayName} {mem.user.id === me?.id && <span className="faint small">(คุณ)</span>}
                    {mem.isOwner && <span className="badge badge-gold" style={{ marginLeft: 6 }}>Owner</span>}
                  </td>
                  <td className="small muted">เข้าร่วม {formatDate(mem.joinedAt)}</td>
                  {g.isOwner && (
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!mem.isOwner && (
                        <>
                          <button className="btn btn-sm btn-ghost" onClick={() => setTransferTo({ id: mem.user.id, name: mem.user.displayName })}>
                            โอน Owner
                          </button>
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--danger)' }}
                            onClick={() =>
                              confirm(`นำ ${mem.user.displayName} ออกจาก Group?`) &&
                              run(() => groupsApi.kickMember(groupId, mem.user.id), 'นำสมาชิกออกแล้ว')
                            }
                          >
                            นำออก
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="row between wrap">
        <span className="label">Build ที่แชร์ใน Group นี้ ({g.builds.length})</span>
        {g.isOwner && <span className="small muted">Owner ซ่อน Build ที่ไม่ต้องการให้สมาชิกใช้ได้ (ไม่ลบ Build และไม่ลบโหวต)</span>}
      </div>
      {g.builds.length === 0 ? (
        <Empty>ยังไม่มี Build ที่แชร์ใน Group นี้</Empty>
      ) : (
        <div className="grid-auto" style={vars({ '--min': '320px' })}>
          {g.builds.map(({ summary, hidden }) => (
            <div key={summary.build.id} className="stack" style={{ gap: 6, opacity: hidden ? 0.6 : 1 }}>
              <BuildCard s={summary} to={!hidden || summary.isMine ? `/lineups/${summary.build.lineupId}/b/${summary.build.id}` : undefined} />
              <div className="row between small">
                {hidden ? <span className="badge badge-danger">ซ่อนอยู่ใน Group นี้</span> : <span />}
                {g.isOwner && (
                  <button className="btn btn-sm" disabled={hide.isPending} onClick={() => hide.mutate({ buildId: summary.build.id, hidden: !hidden })}>
                    <Icon name={hidden ? 'eye' : 'eyeOff'} size={14} /> {hidden ? 'แสดง' : 'ซ่อน'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {transferTo && (
        <Modal
          title="โอนสิทธิ์ Owner"
          onClose={() => setTransferTo(null)}
          footer={
            <>
              <button className="btn" onClick={() => setTransferTo(null)}>
                ยกเลิก
              </button>
              <button
                className="btn btn-primary"
                onClick={() => run(() => groupsApi.transferOwner(groupId, transferTo.id), 'โอนสิทธิ์แล้ว', () => setTransferTo(null))}
              >
                ยืนยันโอน
              </button>
            </>
          }
        >
          <p>
            โอนสิทธิ์ Owner ให้ <strong>{transferTo.name}</strong>? คุณจะกลายเป็นสมาชิกทั่วไปและจัดการ Group ไม่ได้อีก
          </p>
        </Modal>
      )}
      {renaming !== null && (
        <Modal
          title="เปลี่ยนชื่อ Group"
          onClose={() => setRenaming(null)}
          footer={
            <button className="btn btn-primary" onClick={() => run(() => groupsApi.renameGroup(groupId, renaming), 'เปลี่ยนชื่อแล้ว', () => setRenaming(null))}>
              บันทึก
            </button>
          }
        >
          <input className="input" autoFocus aria-label="ชื่อ Group" value={renaming} onChange={(e) => setRenaming(e.target.value)} />
        </Modal>
      )}
    </div>
  )
}
