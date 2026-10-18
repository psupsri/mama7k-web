import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '../../api/admin'
import type { MasterEntity } from '../../api/admin'
import type { MasterItem } from '../../types/domain'
import { useMaster } from '../../hooks/queries'
import { useToast } from '../../hooks/useToast'
import { errorMessage } from '../../lib/errors'
import { ImageSlot } from '../../components/ImageSlot'
import { Modal } from '../../components/Modal'
import { Loading } from '../../components/States'
import { ENTITIES, ENTITY_LABEL } from './labels'


type Draft = MasterItem & Record<string, unknown>

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // matches the API limit

export function AdminMasterPage() {
  const m = useMaster()
  const qc = useQueryClient()
  const toast = useToast()
  const [entity, setEntity] = useState<MasterEntity>('characters')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<{ draft: Draft; isNew: boolean } | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ['master'] })
  const toggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => adminApi.adminSetMasterActive(entity, v.id, v.active),
    onSuccess: refresh,
    onError: (e) => toast(errorMessage(e), true),
  })

  if (!m) return <Loading />
  const rows = (m[entity] as Draft[]).filter((r) => {
    const s = q.trim().toLowerCase()
    return !s || r.nameTh.toLowerCase().includes(s) || r.nameEn.toLowerCase().includes(s) || r.id === s
  })

  const newDraft = (): Draft => {
    const base: Draft = { id: '', nameTh: '', nameEn: '', active: true }
    return base
  }

  return (
    <div className="stack">
      <div className="row wrap">
        {ENTITIES.map((e) => (
          <button key={e} className="chip" aria-pressed={entity === e} onClick={() => setEntity(e)}>
            {ENTITY_LABEL[e]} <span className="faint small">{(m[e] as unknown[]).length}</span>
          </button>
        ))}
      </div>
      <div className="row wrap between">
        <input className="input" style={{ maxWidth: 320 }} placeholder="ค้นหาชื่อ, ชื่ออังกฤษ หรือ id" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหา" />
        <button className="btn btn-primary" onClick={() => setEditing({ draft: newDraft(), isNew: true })}>
          + เพิ่ม{ENTITY_LABEL[entity]}
        </button>
      </div>
      <div className="card table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>รูป</th>
              <th>id</th>
              <th>ชื่อไทย</th>
              <th>ชื่ออังกฤษ</th>
              <th>สถานะ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ opacity: r.active ? 1 : 0.55 }}>
                <td>
                  <ImageSlot item={r} size={36} round={entity === 'sets' || entity === 'rings'} />
                </td>
                <td className="faint small">{r.id}</td>
                <td>{r.nameTh}</td>
                <td className="small muted">{r.nameEn}</td>
                <td>
                  <label className="checkbox small">
                    <input type="checkbox" checked={r.active} onChange={(e) => toggle.mutate({ id: r.id, active: e.target.checked })} />
                    {r.active ? 'ใช้งาน' : 'ปิด'}
                  </label>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-sm" onClick={() => setEditing({ draft: structuredClone(r), isNew: false })}>
                    แก้ไข
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="faint small">รายการที่ปิดใช้งานจะเลือกตอนสร้างใหม่ไม่ได้ แต่ Build และบ้านศัตรูเดิมยังแสดงปกติ ไม่มีการลบจริง</p>

      {editing && (
        <MasterForm
          entity={entity}
          initial={editing.draft}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refresh()
            setEditing(null)
            toast('บันทึกแล้ว')
          }}
        />
      )}
    </div>
  )
}

function MasterForm({
  entity,
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  entity: MasterEntity
  initial: Draft
  isNew: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [d, setD] = useState<Draft>(initial)
  // A chosen image is previewed locally and uploaded after the item is saved (it must exist first).
  const [file, setFile] = useState<File | null>(null)
  const set = (patch: Record<string, unknown>) => setD((x) => ({ ...x, ...patch }))
  const save = useMutation({
    mutationFn: async () => {
      let id = d.id
      if (isNew) id = (await adminApi.adminCreateMaster(entity, d)).id
      else await adminApi.adminSaveMaster(entity, d)
      if (file) await adminApi.adminUploadImage(entity, id, file)
    },
    onSuccess: onSaved,
    onError: (e) => toast(errorMessage(e), true),
  })

  const onFile = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_IMAGE_BYTES) {
      toast('รูปใหญ่เกิน 2 MB', true)
      return
    }
    setFile(f)
    set({ image: URL.createObjectURL(f) })
  }

  return (
    <Modal
      title={`${isNew ? 'เพิ่ม' : 'แก้ไข'}${ENTITY_LABEL[entity]}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="btn btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
            บันทึก
          </button>
        </>
      }
    >
      <div className="row">
        <ImageSlot item={d} size={72} round={entity === 'sets' || entity === 'rings'} />
        <div className="stack" style={{ gap: 6 }}>
          <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
            อัปโหลดรูป
            <input type="file" accept="image/png,image/webp,image/jpeg" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {file && <span className="small muted">จะอัปโหลดเมื่อกดบันทึก</span>}
          <span className="faint small">1:1 · {entity === 'characters' || entity === 'pets' ? 'อย่างน้อย 256 px' : 'อย่างน้อย 128 px พื้นโปร่งใส'}</span>
        </div>
      </div>
      {!isNew && <span className="faint small">id {d.id} (เปลี่ยนไม่ได้)</span>}
      <label className="field">
        <span>ชื่อไทย (ชื่อที่คอมมูเรียก แสดงให้ผู้ใช้เห็น)</span>
        <input className="input" value={d.nameTh} onChange={(e) => set({ nameTh: e.target.value })} />
      </label>
      <label className="field">
        <span>ชื่ออังกฤษ (ไม่บังคับ ใช้ค้นหาได้)</span>
        <input className="input" value={d.nameEn} onChange={(e) => set({ nameEn: e.target.value })} />
      </label>
    </Modal>
  )
}
