import { useMemo, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { FormationType, Placement, Row } from '../types/domain'
import { useMaster } from '../hooks/queries'
import { useToast } from '../hooks/useToast'
import { rowSize } from '../lib/formation'
import { FormationFrame, SkillColumn, SlotCharacter } from './Formation'
import { Icon } from './Icon'
import { ImageSlot } from './ImageSlot'

const MAX = 3

type DragData = { kind: 'placed'; characterId: string; row: Row; slot: number } | { kind: 'roster'; characterId: string }
type DropData = { kind: 'slot'; row: Row; slot: number } | { kind: 'roster' }

interface Props {
  formation: FormationType
  placements: Placement[]
  onChange: (placements: Placement[]) => void
  variant?: 'ally' | 'enemy'
  /** Opens a picker for a slot (tap fallback, also used for keyboard users). */
  onPickSlot: (row: Row, slot: number) => void
  /** Ally builds: reserved skill order and the toggle for the upper/lower boxes. */
  skillOrder?: string[]
  onSkillToggle?: (skillId: string) => void
}

/**
 * Formation with drag & drop: drag a character from the roster onto a slot, drag between
 * slots to move/swap, or drag a placed character back to the roster to remove it.
 * Tapping still works: tap a slot to pick, tap a roster character to fill the next free slot.
 */
export function FormationEditor({ formation, placements, onChange, variant = 'ally', onPickSlot, skillOrder, onSkillToggle }: Props) {
  const m = useMaster()
  const toast = useToast()
  const [dragging, setDragging] = useState<DragData | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so the page and roster can still scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )

  const at = (row: Row, slot: number) => placements.find((p) => p.row === row && p.slot === slot)

  const firstFree = (): { row: Row; slot: number } | undefined => {
    for (const row of ['FRONT', 'BACK'] as Row[])
      for (let slot = 0; slot < rowSize(formation, row); slot++) if (!at(row, slot)) return { row, slot }
  }

  const place = (characterId: string, row: Row, slot: number) => {
    const occupant = at(row, slot)
    const existing = placements.find((p) => p.characterId === characterId)
    if (occupant?.characterId === characterId) return
    let next = placements.filter((p) => p.characterId !== characterId && p !== occupant)
    if (existing && occupant) {
      // Moving a placed character onto another one swaps them.
      next = [...next, { ...occupant, row: existing.row, slot: existing.slot }]
    } else if (!existing && !occupant && placements.length >= MAX) {
      toast(`ใส่ได้ ${MAX} ตัว ลากตัวเดิมออกก่อน หรือวางทับเพื่อแทนที่`, true)
      return
    }
    onChange([...next, { characterId, row, slot }])
  }

  const remove = (characterId: string) => onChange(placements.filter((p) => p.characterId !== characterId))

  const onDragStart = (e: DragStartEvent) => setDragging(e.active.data.current as DragData)

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const src = e.active.data.current as DragData | undefined
    const dst = e.over?.data.current as DropData | undefined
    if (!src || !dst) return
    if (dst.kind === 'roster') {
      if (src.kind === 'placed') remove(src.characterId)
      return
    }
    place(src.characterId, dst.row, dst.slot)
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <FormationFrame
        formation={formation}
        renderSlot={(row, slot) => (
          <DropSlot key={slot} row={row} slot={slot} variant={variant} filled={!!at(row, slot)}>
            {(() => {
              const p = at(row, slot)
              if (!p) {
                return (
                  <button type="button" className="slot-fill" aria-label="เลือกตัวละครสำหรับช่องนี้" onClick={() => onPickSlot(row, slot)}>
                    <Icon name="plus" size={16} />
                  </button>
                )
              }
              return (
                <span className="slot-inner">
                  <button
                    type="button"
                    className="slot-remove"
                    aria-label={`เอา ${m?.character[p.characterId]?.name} ออกจากทีม`}
                    title="เอาออก"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => remove(p.characterId)}
                  >
                    <Icon name="close" size={12} strokeWidth={3} />
                  </button>
                  <DragChar data={{ kind: 'placed', characterId: p.characterId, row, slot }} onClick={() => onPickSlot(row, slot)} />
                  {skillOrder && onSkillToggle && <SkillColumn characterId={p.characterId} skillOrder={skillOrder} onToggle={onSkillToggle} />}
                </span>
              )
            })()}
          </DropSlot>
        )}
      />
      <Roster
        placedIds={placements.map((p) => p.characterId)}
        removing={dragging?.kind === 'placed'}
        onTap={(id) => {
          // Tap toggles: add to the next free slot, or take out if already in the team.
          if (placements.some((p) => p.characterId === id)) return remove(id)
          const free = firstFree()
          if (!free) toast(`ใส่ได้ ${MAX} ตัว แตะตัวที่อยู่ในทีมเพื่อเอาออกก่อน`, true)
          else place(id, free.row, free.slot)
        }}
      />
      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="drag-ghost">
            <ImageSlot item={m?.character[dragging.characterId]} size={48} showTitle={false} />
            <span>{m?.character[dragging.characterId]?.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function DropSlot({ row, slot, variant, filled, children }: { row: Row; slot: number; variant: string; filled: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${row}:${slot}`, data: { kind: 'slot', row, slot } satisfies DropData })
  return (
    <div ref={setNodeRef} className={`slot ${variant} editable${filled ? ' filled' : ''}${isOver ? ' over' : ''}`}>
      {children}
    </div>
  )
}

function DragChar({ data, onClick }: { data: DragData; onClick: () => void }) {
  const id = data.kind === 'placed' ? `placed:${data.characterId}` : `roster:${data.characterId}`
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id, data })
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="slot-char drag-handle"
      style={{ opacity: isDragging ? 0.35 : 1 }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      aria-label="แตะเพื่อเปลี่ยน หรือลากเพื่อย้าย"
    >
      <SlotCharacter characterId={data.characterId} />
    </button>
  )
}

function Roster({ placedIds, removing, onTap }: { placedIds: string[]; removing: boolean; onTap: (id: string) => void }) {
  const m = useMaster()
  const [q, setQ] = useState('')
  const { setNodeRef, isOver } = useDroppable({ id: 'roster', data: { kind: 'roster' } satisfies DropData })
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (m?.characters ?? []).filter(
      (c) => (c.active || placedIds.includes(c.id)) && (!s || c.name.toLowerCase().includes(s) || c.aliases.some((a) => a.toLowerCase().includes(s))),
    )
  }, [m, q, placedIds])

  return (
    <div ref={setNodeRef} className={`roster${removing ? ' removing' : ''}${isOver ? ' over' : ''}`}>
      <div className="row between wrap">
        <span className="sublabel">{removing ? 'ปล่อยที่นี่เพื่อเอาตัวละครออกจากทีม' : 'ลากไปวางในช่อง หรือแตะเพื่อใส่ · แตะตัวที่มีเครื่องหมายถูกเพื่อเอาออก'}</span>
        <input className="input input-sm" style={{ maxWidth: 200 }} placeholder="ค้นหาตัวละคร" aria-label="ค้นหาตัวละคร" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="roster-grid">
        {list.map((c) => (
          <RosterItem key={c.id} characterId={c.id} placed={placedIds.includes(c.id)} onTap={() => onTap(c.id)} />
        ))}
      </div>
    </div>
  )
}

function RosterItem({ characterId, placed, onTap }: { characterId: string; placed: boolean; onTap: () => void }) {
  const m = useMaster()
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `roster:${characterId}`,
    data: { kind: 'roster', characterId } satisfies DragData,
  })
  const c = m?.character[characterId]
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`roster-item drag-handle${placed ? ' placed' : ''}`}
      style={{ opacity: isDragging ? 0.35 : undefined }}
      {...attributes}
      {...listeners}
      onClick={onTap}
      aria-label={placed ? `${c?.name} (อยู่ในทีม แตะเพื่อเอาออก)` : `ใส่ ${c?.name} ในทีม`}
      aria-pressed={placed}
    >
      <ImageSlot item={c} size={40} showTitle={false} />
      <span className="slot-name">{c?.name}</span>
      {placed && (
        <span className="roster-check">
          <Icon name="check" size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

