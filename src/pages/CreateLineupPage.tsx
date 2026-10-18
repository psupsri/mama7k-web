import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as lineupsApi from '../api/lineups'
import type { FormationType, Placement, Row } from '../types/domain'
import { useMaster } from '../hooks/queries'
import { FORMATIONS, fitPlacements, rowSize } from '../lib/formation'
import { FormationEditor } from '../components/FormationEditor'
import { Picker } from '../components/Picker'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/errors'
import { RequireAuth } from './RequireAuth'

function initialPlacements(ids: string[], formation: FormationType): Placement[] {
  const out: Placement[] = []
  for (const id of ids.slice(0, 3)) {
    const row: Row = out.filter((p) => p.row === 'FRONT').length < rowSize(formation, 'FRONT') ? 'FRONT' : 'BACK'
    out.push({ characterId: id, row, slot: out.filter((p) => p.row === row).length })
  }
  return out
}

export function CreateLineupPage() {
  return (
    <RequireAuth>
      <CreateLineup />
    </RequireAuth>
  )
}

function CreateLineup() {
  const m = useMaster()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [params] = useSearchParams()
  const [formation, setFormation] = useState<FormationType>('F3B2')
  const [placements, setPlacements] = useState<Placement[]>(() =>
    initialPlacements(params.get('c')?.split(',').filter(Boolean) ?? [], 'F3B2'),
  )
  const [slot, setSlot] = useState<{ row: Row; slot: number } | null>(null)

  const create = useMutation({
    mutationFn: () => lineupsApi.createLineup(formation, placements),
    onSuccess: ({ lineup, existed }) => {
      qc.invalidateQueries({ queryKey: ['lineups'] })
      toast(existed ? 'มีบ้านศัตรูนี้อยู่แล้ว พาไปที่บ้านเดิม' : 'เพิ่มบ้านศัตรูแล้ว')
      nav(`/lineups/${lineup.id}`)
    },
    onError: (e) => toast(errorMessage(e), true),
  })

  const current = slot ? placements.find((p) => p.row === slot.row && p.slot === slot.slot) : undefined

  const pick = (ids: string[]) => {
    if (!slot) return
    const id = ids[0]
    const rest = placements.filter((p) => !(p.row === slot.row && p.slot === slot.slot) && p.characterId !== id)
    setPlacements(id ? [...rest, { characterId: id, row: slot.row, slot: slot.slot }] : rest)
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h1>เพิ่มบ้านศัตรู</h1>
      <p className="muted">
        บ้านศัตรูเป็นข้อมูลกลางที่ทุกคนใช้ร่วมกัน ถ้ามีบ้านที่ตัวละครชุดเดียวกันอยู่แถวเดียวกันแล้ว ระบบจะพาไปที่บ้านเดิมแทน
      </p>

      <section className="card stack">
        <span className="label">Formation</span>
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
        <hr className="divider" />
        <div className="row between">
          <span className="label">ตัวละคร ({placements.length}/3)</span>
          <span className="small muted">ลากวาง หรือแตะช่องเพื่อเลือก</span>
        </div>
        <FormationEditor formation={formation} placements={placements} onChange={setPlacements} variant="enemy" onPickSlot={(row, s) => setSlot({ row, slot: s })} />
      </section>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={() => nav(-1)}>
          ยกเลิก
        </button>
        <button className="btn btn-primary" disabled={placements.length !== 3 || create.isPending} onClick={() => create.mutate()}>
          บันทึกบ้านศัตรู
        </button>
      </div>

      {slot && m && (
        <Picker
          title={current ? `เปลี่ยน ${m.character[current.characterId]?.nameTh}` : 'เลือกตัวละคร'}
          items={m.characters}
          selected={current ? [current.characterId] : []}
          disabledIds={placements.length >= 3 && !current ? m.characters.map((c) => c.id) : placements.map((p) => p.characterId)}
          onChange={pick}
          onClear={current ? () => pick([]) : undefined}
          onClose={() => setSlot(null)}
        />
      )}
    </div>
  )
}
