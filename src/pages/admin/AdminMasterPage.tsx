import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '../../api/admin'
import { ENTITY_PREFIX, type MasterEntity } from '../../api/admin'
import type { MasterItem } from '../../types/domain'
import { useMaster, type MasterLookup } from '../../hooks/queries'
import { useToast } from '../../hooks/useToast'
import { errorMessage } from '../../lib/errors'
import { RARITY_LABEL } from '../../lib/labels'
import { ImageSlot } from '../../components/ImageSlot'
import { Modal } from '../../components/Modal'
import { Loading } from '../../components/States'
import { ENTITIES, ENTITY_LABEL } from './labels'


type Draft = MasterItem & Record<string, unknown>

const MAX_IMAGE_BYTES = 300_000

function extraColumn(entity: MasterEntity, item: Draft, m: MasterLookup) {
  switch (entity) {
    case 'skills':
      return `${m.character[String(item.characterId)]?.name} · ${item.slot === 1 ? 'บน' : 'ล่าง'}`
    case 'sets':
      return `2: ${item.effect2} · 4: ${item.effect4}`
    case 'rings':
      return `${RARITY_LABEL[item.rarity as keyof typeof RARITY_LABEL]} · ${item.effect}`
    case 'stats':
      return item.unit === 'PERCENT' ? '%' : 'ตัวเลข'
    default:
      return ''
  }
}

export function AdminMasterPage() {
  const m = useMaster()
  const qc = useQueryClient()
  const toast = useToast()
  const [entity, setEntity] = useState<MasterEntity>('characters')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<{ draft: Draft; isNew: boolean } | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ['master'] })
  const toggle = useMutation({
    mutationFn: (v: { code: string; active: boolean }) => adminApi.adminSetMasterActive(entity, v.code, v.active),
    onSuccess: refresh,
    onError: (e) => toast(errorMessage(e), true),
  })

  if (!m) return <Loading />
  const rows = (m[entity] as Draft[]).filter((r) => {
    const s = q.trim().toLowerCase()
    return !s || r.name.toLowerCase().includes(s) || r.code.includes(s) || r.aliases.some((a) => a.toLowerCase().includes(s))
  })

  const newDraft = (): Draft => {
    const base: Draft = { id: '', code: ENTITY_PREFIX[entity], name: '', aliases: [], active: true }
    if (entity === 'skills') Object.assign(base, { characterId: m.characters[0]?.id, slot: 1 })
    if (entity === 'sets') Object.assign(base, { effect2: '', effect4: '' })
    if (entity === 'rings') Object.assign(base, { rarity: 'COMMON', effect: '' })
    if (entity === 'stats') base.unit = 'PERCENT'
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
        <input className="input" style={{ maxWidth: 320 }} placeholder="ค้นหาชื่อ, alias หรือ code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหา" />
        <button className="btn btn-primary" onClick={() => setEditing({ draft: newDraft(), isNew: true })}>
          + เพิ่ม{ENTITY_LABEL[entity]}
        </button>
      </div>
      <div className="card table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>รูป</th>
              <th>ชื่อที่แสดง</th>
              <th>code</th>
              <th>alias</th>
              <th>รายละเอียด</th>
              <th>สถานะ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} style={{ opacity: r.active ? 1 : 0.55 }}>
                <td>
                  <ImageSlot item={r} size={36} round={entity === 'sets' || entity === 'rings'} />
                </td>
                <td>{r.name}</td>
                <td className="faint small">{r.code}</td>
                <td className="small muted">{r.aliases.join(', ')}</td>
                <td className="small muted">{extraColumn(entity, r, m)}</td>
                <td>
                  <label className="checkbox small">
                    <input type="checkbox" checked={r.active} onChange={(e) => toggle.mutate({ code: r.code, active: e.target.checked })} />
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
          m={m}
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
  m,
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  entity: MasterEntity
  m: MasterLookup
  initial: Draft
  isNew: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [d, setD] = useState<Draft>(initial)
  const set = (patch: Record<string, unknown>) => setD((x) => ({ ...x, ...patch }))
  const save = useMutation({
    mutationFn: () => adminApi.adminSaveMaster(entity, d),
    onSuccess: onSaved,
    onError: (e) => toast(errorMessage(e), true),
  })

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      toast('รูปใหญ่เกิน 300 KB (ข้อจำกัดของ mock)', true)
      return
    }
    const reader = new FileReader()
    reader.onload = () => set({ image: String(reader.result) })
    reader.readAsDataURL(file)
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
          {d.image && (
            <button className="btn btn-sm btn-ghost" onClick={() => set({ image: undefined })}>
              เอารูปออก
            </button>
          )}
          <span className="faint small">1:1 · {entity === 'characters' || entity === 'pets' ? 'อย่างน้อย 256 px' : 'อย่างน้อย 128 px พื้นโปร่งใส'}</span>
        </div>
      </div>
      <label className="field">
        <span>code {isNew ? `(ขึ้นต้นด้วย ${ENTITY_PREFIX[entity]} เปลี่ยนภายหลังไม่ได้)` : '(เปลี่ยนไม่ได้)'}</span>
        <input className="input" value={d.code} disabled={!isNew} onChange={(e) => set({ code: e.target.value.toLowerCase(), id: e.target.value.toLowerCase() })} />
      </label>
      <label className="field">
        <span>ชื่อที่แสดง (ชื่อที่คอมมูเรียก)</span>
        <input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <label className="field">
        <span>alias (คั่นด้วย , เช่น ชื่อในเกม)</span>
        <input
          className="input"
          value={d.aliases.join(', ')}
          onChange={(e) => set({ aliases: e.target.value.split(',').map((a) => a.trim()).filter(Boolean) })}
        />
      </label>
      {entity === 'skills' && (
        <label className="field">
          <span>ตัวละครเจ้าของสกิล</span>
          <select className="select" value={String(d.characterId)} onChange={(e) => set({ characterId: e.target.value })}>
            {m.characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {entity === 'skills' && (
        <label className="field">
          <span>ตำแหน่งสกิล</span>
          <select className="select" value={String(d.slot)} onChange={(e) => set({ slot: Number(e.target.value) })}>
            <option value="1">บน</option>
            <option value="2">ล่าง</option>
          </select>
        </label>
      )}
      {entity === 'sets' && (
        <>
          <label className="field">
            <span>Effect 2 ชิ้น</span>
            <input className="input" value={String(d.effect2 ?? '')} onChange={(e) => set({ effect2: e.target.value })} />
          </label>
          <label className="field">
            <span>Effect 4 ชิ้น</span>
            <input className="input" value={String(d.effect4 ?? '')} onChange={(e) => set({ effect4: e.target.value })} />
          </label>
        </>
      )}
      {entity === 'rings' && (
        <>
          <label className="field">
            <span>ความหายาก</span>
            <select className="select" value={String(d.rarity)} onChange={(e) => set({ rarity: e.target.value })}>
              {Object.entries(RARITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Effect</span>
            <input className="input" value={String(d.effect ?? '')} onChange={(e) => set({ effect: e.target.value })} />
          </label>
        </>
      )}
      {entity === 'stats' && (
        <label className="field">
          <span>หน่วย</span>
          <select className="select" value={String(d.unit)} onChange={(e) => set({ unit: e.target.value })}>
            <option value="PERCENT">%</option>
            <option value="NUMBER">ตัวเลข</option>
          </select>
        </label>
      )}
    </Modal>
  )
}
