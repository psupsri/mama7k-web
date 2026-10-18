import type { ReactNode } from 'react'
import type { FormationType, Placement, Row } from '../types/domain'
import { useMaster } from '../hooks/queries'
import { ROW_LABEL, ROWS, rowSize, skillAt } from '../lib/formation'
import { ImageSlot } from './ImageSlot'

/**
 * The two reserved-skill boxes stacked like the in-game skill buttons:
 * upper skill on top, lower skill below. A number marks its reservation order.
 */
export function SkillColumn({
  characterId,
  skillOrder,
  small,
  onToggle,
}: {
  characterId: string
  skillOrder: string[]
  small?: boolean
  onToggle?: (skillId: string) => void
}) {
  const m = useMaster()
  return (
    <span className={`skill-col${small ? ' sm' : ''}`}>
      {([1, 2] as const).map((pos) => {
        const sk = skillAt(m, characterId, pos)
        const order = sk ? skillOrder.indexOf(sk.id) + 1 : 0
        const label = `${pos === 1 ? 'สกิลบน' : 'สกิลล่าง'}${order ? ` จองลำดับ ${order}` : ''}`
        const cls = `skill-box${order ? ' on' : ''}`
        return onToggle ? (
          <button
            key={pos}
            type="button"
            className={cls}
            aria-label={`${m?.character[characterId]?.name} ${label}`}
            aria-pressed={order > 0}
            disabled={!sk}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              if (sk) onToggle(sk.id)
            }}
          >
            {order || ''}
          </button>
        ) : (
          <span key={pos} className={cls} title={label}>
            {order || ''}
          </span>
        )
      })}
    </span>
  )
}

export function SlotCharacter({ characterId, small }: { characterId: string; small?: boolean }) {
  const m = useMaster()
  const c = m?.character[characterId]
  return (
    <>
      <ImageSlot item={c} size={small ? 32 : 40} showTitle={false} />
      <span className="slot-name">{c?.name}</span>
    </>
  )
}

interface Props {
  formation: FormationType
  placements: Placement[]
  variant?: 'ally' | 'enemy'
  /** When given (ally builds), shows the upper/lower skill boxes beside each character. */
  skillOrder?: string[]
  size?: 'sm' | 'md'
}

/** Read-only formation. Slots have the same size in every formation and rows are centered. */
export function Formation({ formation, placements, variant = 'ally', skillOrder, size = 'md' }: Props) {
  const small = size === 'sm'
  return (
    <FormationFrame
      formation={formation}
      renderSlot={(row, slot) => {
        const p = placements.find((x) => x.row === row && x.slot === slot)
        return (
          <div key={slot} className={`slot ${variant}${small ? ' slot-sm' : ''}${p ? ' filled' : ''}`}>
            {p && (
              <span className="slot-inner">
                <span className="slot-char">
                  <SlotCharacter characterId={p.characterId} small={small} />
                </span>
                {skillOrder && <SkillColumn characterId={p.characterId} skillOrder={skillOrder} small={small} />}
              </span>
            )}
          </div>
        )
      }}
    />
  )
}

export function FormationFrame({
  formation,
  renderSlot,
}: {
  formation: FormationType
  renderSlot: (row: Row, slot: number) => ReactNode
}) {
  return (
    <div className="formation">
      {ROWS.map((row) => (
        <div key={row} className="formation-row">
          <span className="formation-row-label">{ROW_LABEL[row]}</span>
          <div className="formation-slots">{Array.from({ length: rowSize(formation, row) }, (_, slot) => renderSlot(row, slot))}</div>
        </div>
      ))}
    </div>
  )
}
