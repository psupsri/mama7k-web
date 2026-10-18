import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '../../api/admin'
import type { DefenseLineup, FormationType, Placement, Row, UserRole } from '../../types/domain'
import { useMaster, useMe } from '../../hooks/queries'
import { useToast } from '../../hooks/useToast'
import { errorMessage } from '../../lib/errors'
import { FORMATIONS, fitPlacements, formationInfo } from '../../lib/formation'
import { formatDate } from '../../lib/labels'
import { vars } from '../../lib/style'
import { BuildCard } from '../../components/BuildCard'
import { Formation } from '../../components/Formation'
import { FormationEditor } from '../../components/FormationEditor'
import { Modal } from '../../components/Modal'
import { Picker } from '../../components/Picker'
import { Empty, Loading } from '../../components/States'

function useAdminAction() {
  const qc = useQueryClient()
  const toast = useToast()
  return (fn: () => Promise<unknown>, ok: string, after?: () => void) =>
    fn()
      .then(() => {
        qc.invalidateQueries()
        toast(ok)
        after?.()
      })
      .catch((e) => toast(errorMessage(e), true))
}

// ---------- Lineups ----------

export function AdminLineupsPage() {
  const m = useMaster()
  const run = useAdminAction()
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'lineups'], queryFn: adminApi.adminListLineups })
  const [editing, setEditing] = useState<DefenseLineup | null>(null)
  const [merging, setMerging] = useState<DefenseLineup | null>(null)

  if (isLoading || !m) return <Loading />
  const name = (l: DefenseLineup) => l.placements.map((p) => m.character[p.characterId]?.name).join(' · ')

  return (
    <div className="stack">
      <p className="small muted">
        แก้บ้านที่สร้างผิด, merge บ้านซ้ำเข้ากับบ้านที่ถูก (Build และโหวตย้ายตาม) หรือลบบ้านที่ไม่มี Build จำนวน Build นับรวมทุก Visibility แต่ Admin ไม่เห็นเนื้อหา Build ที่ไม่ใช่ Public
      </p>
      <div className="grid-auto" style={vars({ '--min': '320px' })}>
        {data!.map(({ lineup, buildCount, publicCount }) => (
          <section key={lineup.id} className="card card-enemy stack">
            <div className="row between">
              <span className="label" style={{ color: 'var(--enemy-text)' }}>
                {lineup.id} · {formationInfo(lineup.formation).label}
              </span>
              <span className="small muted">
                {buildCount} Build ({publicCount} Public)
              </span>
            </div>
            <Formation formation={lineup.formation} placements={lineup.placements} variant="enemy" size="sm" />
            <div className="row wrap">
              <Link to={`/lineups/${lineup.id}`} className="btn btn-sm">
                ดู
              </Link>
              <button className="btn btn-sm" onClick={() => setEditing(lineup)}>
                แก้ไข
              </button>
              <button className="btn btn-sm" onClick={() => setMerging(lineup)}>
                Merge
              </button>
              <button
                className="btn btn-sm btn-danger"
                disabled={buildCount > 0}
                title={buildCount > 0 ? 'ลบได้เฉพาะบ้านที่ไม่มี Build' : undefined}
                onClick={() => confirm(`ลบบ้าน ${name(lineup)}?`) && run(() => adminApi.adminDeleteLineup(lineup.id), 'ลบบ้านแล้ว')}
              >
                ลบ
              </button>
            </div>
          </section>
        ))}
      </div>

      {editing && <LineupEditModal lineup={editing} onClose={() => setEditing(null)} />}
      {merging && (
        <Modal title="Merge บ้านศัตรู" onClose={() => setMerging(null)}>
          <p>
            ย้าย Build ทั้งหมดจาก <strong>{name(merging)}</strong> ไปยังบ้านที่เลือก แล้วลบบ้านนี้ทิ้ง
          </p>
          <div className="stack" style={{ gap: 6 }}>
            {data!
              .filter((x) => x.lineup.id !== merging.id)
              .map(({ lineup, buildCount }) => (
                <button
                  key={lineup.id}
                  className="btn"
                  style={{ justifyContent: 'space-between' }}
                  onClick={() =>
                    confirm(`ยืนยัน merge ${merging.id} → ${lineup.id}?`) &&
                    run(() => adminApi.adminMergeLineup(merging.id, lineup.id), 'Merge แล้ว', () => setMerging(null))
                  }
                >
                  <span>
                    {lineup.id} · {name(lineup)} <span className="faint small">{formationInfo(lineup.formation).label}</span>
                  </span>
                  <span className="small muted">{buildCount} Build</span>
                </button>
              ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

function LineupEditModal({ lineup, onClose }: { lineup: DefenseLineup; onClose: () => void }) {
  const m = useMaster()
  const run = useAdminAction()
  const [formation, setFormation] = useState<FormationType>(lineup.formation)
  const [placements, setPlacements] = useState<Placement[]>(lineup.placements)
  const [slot, setSlot] = useState<{ row: Row; slot: number } | null>(null)
  const current = slot ? placements.find((p) => p.row === slot.row && p.slot === slot.slot) : undefined

  return (
    <Modal
      title={`แก้ไขบ้าน ${lineup.id}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            ยกเลิก
          </button>
          <button
            className="btn btn-primary"
            disabled={placements.length !== 3}
            onClick={() => run(() => adminApi.adminUpdateLineup(lineup.id, formation, placements), 'บันทึกแล้ว', onClose)}
          >
            บันทึก
          </button>
        </>
      }
    >
      <div className="row wrap">
        {FORMATIONS.map((f) => (
          <button
            key={f.type}
            className="chip"
            aria-pressed={formation === f.type}
            onClick={() => {
              setFormation(f.type)
              setPlacements((ps) => fitPlacements(f.type, ps))
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <FormationEditor formation={formation} placements={placements} onChange={setPlacements} variant="enemy" onPickSlot={(row, s) => setSlot({ row, slot: s })} />
      <p className="small muted">ถ้าแก้แล้วไปซ้ำกับบ้านที่มีอยู่ ระบบจะให้ใช้ Merge แทน</p>
      {slot && m && (
        <Picker
          title="เลือกตัวละคร"
          items={m.characters}
          selected={current ? [current.characterId] : []}
          disabledIds={placements.length >= 3 && !current ? m.characters.map((c) => c.id) : placements.map((p) => p.characterId)}
          onChange={([id]) =>
            setPlacements([...placements.filter((p) => !(p.row === slot.row && p.slot === slot.slot) && p.characterId !== id), { characterId: id, row: slot.row, slot: slot.slot }])
          }
          onClear={current ? () => setPlacements(placements.filter((p) => p !== current)) : undefined}
          onClose={() => setSlot(null)}
        />
      )}
    </Modal>
  )
}

// ---------- Public builds ----------

export function AdminBuildsPage() {
  const run = useAdminAction()
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'builds', q], queryFn: () => adminApi.adminListPublicBuilds(q) })

  return (
    <div className="stack">
      <p className="small muted">Admin จัดการได้เฉพาะ Public Build รวมถึง Build ของผู้ที่ลบบัญชีแล้ว · Build ใน Group และ Private ไม่แสดงที่นี่</p>
      <input className="input" style={{ maxWidth: 320 }} placeholder="ค้นหาตัวละคร คำอธิบาย หรือผู้สร้าง" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหา" />
      {isLoading ? (
        <Loading />
      ) : data!.length === 0 ? (
        <Empty>ไม่พบ Build</Empty>
      ) : (
        <div className="grid-auto" style={vars({ '--min': '320px' })}>
          {data!.map((s) => (
            <div key={s.build.id} className="stack" style={{ gap: 6 }}>
              <BuildCard s={s} to={`/lineups/${s.build.lineupId}/b/${s.build.id}`} />
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-sm"
                  onClick={() => run(() => adminApi.adminSetBuildHidden(s.build.id, !s.build.adminHidden), s.build.adminHidden ? 'แสดง Build แล้ว' : 'ซ่อน Build แล้ว')}
                >
                  {s.build.adminHidden ? 'แสดง' : 'ซ่อน'}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => confirm(`ลบ Build นี้ถาวร? โหวตทั้งหมดจะถูกลบด้วย`) && run(() => adminApi.adminDeleteBuild(s.build.id), 'ลบ Build แล้ว')}
                >
                  ลบถาวร
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Users ----------

const ROLES: UserRole[] = ['USER', 'MODERATOR', 'SUPER_ADMIN']

export function AdminUsersPage() {
  const run = useAdminAction()
  const { data: me } = useMe()
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'users', q], queryFn: () => adminApi.adminListUsers(q) })
  const isSuper = me?.role === 'SUPER_ADMIN'

  return (
    <div className="stack">
      <input className="input" style={{ maxWidth: 320 }} placeholder="ค้นหาอีเมลหรือชื่อ" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหา" />
      {isLoading ? (
        <Loading />
      ) : (
        <div className="card table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Display Name</th>
                <th>อีเมล</th>
                <th>Role</th>
                <th>สถานะ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data!.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.displayName} {u.id === me?.id && <span className="faint small">(คุณ)</span>}
                  </td>
                  <td className="small muted">{u.email}</td>
                  <td>
                    {isSuper && u.id !== me?.id ? (
                      <select
                        className="select input-sm"
                        value={u.role}
                        aria-label={`Role ของ ${u.displayName}`}
                        onChange={(e) => run(() => adminApi.adminSetRole(u.id, e.target.value as UserRole), 'เปลี่ยน role แล้ว')}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="small">{u.role}</span>
                    )}
                  </td>
                  <td>{u.suspended ? <span className="badge badge-danger">ถูกระงับ</span> : <span className="badge badge-public">ปกติ</span>}</td>
                  <td style={{ textAlign: 'right' }}>
                    {u.id !== me?.id && (
                      <button
                        className={`btn btn-sm${u.suspended ? '' : ' btn-danger'}`}
                        onClick={() => run(() => adminApi.adminSetSuspended(u.id, !u.suspended), u.suspended ? 'ปลดระงับแล้ว' : 'ระงับบัญชีแล้ว')}
                      >
                        {u.suspended ? 'ปลดระงับ' : 'ระงับ'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------- Audit ----------

export function AdminAuditPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'audit'], queryFn: adminApi.adminAuditLog })
  if (isLoading) return <Loading />
  if (error) return <Empty>{errorMessage(error)}</Empty>
  if (data!.length === 0) return <Empty>ยังไม่มีรายการ ลองทำ action ใดก็ได้ในหน้า Admin</Empty>
  return (
    <div className="card table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>เวลา</th>
            <th>ผู้ทำ</th>
            <th>Action</th>
            <th>เป้าหมาย</th>
          </tr>
        </thead>
        <tbody>
          {data!.map((a) => (
            <tr key={a.id}>
              <td className="small muted">
                {formatDate(a.at)} {new Date(a.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </td>
              <td>{a.actorName}</td>
              <td>
                <code className="small">{a.action}</code>
              </td>
              <td className="small">{a.target}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
