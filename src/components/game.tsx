import type { CSSProperties, ReactNode } from 'react'
import { useMaster } from '../hooks/queries'
import type { RingOption, SpeedRule, StatTarget, Visibility } from '../types/domain'
import { VISIBILITY_LABEL } from '../lib/labels'
import { Icon } from './Icon'
import { ImageSlot } from './ImageSlot'

export function VisibilityBadge({ visibility, groupNames = [] }: { visibility: Visibility; groupNames?: string[] }) {
  if (visibility === 'GROUP' && groupNames.length > 0) {
    return (
      <span className="badge badge-group" title={groupNames.join(', ')}>
        {groupNames.length === 1 ? groupNames[0] : `${groupNames[0]} +${groupNames.length - 1}`}
      </span>
    )
  }
  const cls = visibility === 'PUBLIC' ? 'badge-public' : visibility === 'GROUP' ? 'badge-group' : 'badge-private'
  return <span className={`badge ${cls}`}>{VISIBILITY_LABEL[visibility]}</span>
}

export function SetChip({ setId, primary }: { setId: string; primary?: boolean }) {
  const m = useMaster()
  const s = m?.set[setId]
  return (
    <span className={`chip chip-img${primary ? ' chip-primary' : ''}`}>
      <ImageSlot item={s} size={26} round />
      {s?.name ?? setId}
    </span>
  )
}

export function SetList({ ids }: { ids: string[] }) {
  if (ids.length === 0) return <div className="dashed-box">เซ็ตอะไรก็ได้</div>
  return (
    <div className="row wrap">
      {ids.map((id, i) => (
        <span key={id} className="row" style={{ gap: 6 }}>
          {i === 1 && <span className="or">หรือ</span>}
          <SetChip setId={id} primary={i === 0} />
        </span>
      ))}
    </div>
  )
}

export function StatPills({ stats }: { stats: StatTarget[] }) {
  const m = useMaster()
  if (stats.length === 0) return <div className="dashed-box">ไม่ได้ระบุสเตตัส</div>
  return (
    <div className="stat-grid">
      {stats.map((s) => {
        const st = m?.stat[s.statId]
        return (
          <div key={s.statId} className="stat-pill">
            <span style={{ fontSize: 13 }}>{st?.name ?? s.statId}</span>
            {s.value === undefined ? (
              <span className="small" style={{ color: 'var(--gold-text)', fontWeight: 600 }}>
                เน้น
              </span>
            ) : (
              <span className="num" style={{ fontSize: 16 }}>
                {s.value}
                <span className="small muted">{st?.unit === 'PERCENT' ? '%+' : '+'}</span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function RingIcon({ option, bg }: { option: RingOption; bg: string }) {
  const m = useMaster()
  const main = m?.ring[option.ringId]
  if (!option.stack) return <ImageSlot item={main} size={32} round />
  return (
    <span style={{ position: 'relative', width: 44, height: 32, flex: 'none' }}>
      <ImageSlot item={main} size={32} round />
      <span style={{ position: 'absolute', right: 0, top: -4, borderRadius: 999, boxShadow: `0 0 0 2px ${bg}` }}>
        <ImageSlot item={m?.ring[option.stack.ringId]} size={20} round />
      </span>
    </span>
  )
}

export function RingLabel({ option }: { option: RingOption }) {
  const m = useMaster()
  return (
    <>
      <span style={{ fontWeight: 600 }}>
        {m?.ring[option.ringId]?.name} <span className="star">★{option.star}</span>
      </span>
      {option.stack && (
        <>
          <span className="muted">+ ซ้อน</span>
          <span style={{ fontWeight: 600 }}>
            {m?.ring[option.stack.ringId]?.name}
            {option.stack.star && <span className="star"> ★{option.stack.star}</span>}
          </span>
        </>
      )}
    </>
  )
}

export function RingList({ rings, stackRequired }: { rings: RingOption[]; stackRequired: boolean }) {
  if (rings.length === 0) return <div className="dashed-box">แหวนอะไรก็ได้</div>
  return (
    <div className="stack" style={{ '--gap': '6px' } as CSSProperties}>
      {rings.map((r, i) => (
        <div key={i} className={`ring-row${i === 0 ? ' primary' : ''}`}>
          <span className={`badge ${i === 0 ? 'badge-gold' : 'badge-soft'}`}>{i === 0 ? 'หลัก' : 'ใช้แทนได้'}</span>
          <RingIcon option={r} bg={i === 0 ? 'var(--gold-soft-bg)' : 'var(--surface-2)'} />
          <RingLabel option={r} />
        </div>
      ))}
      {stackRequired && <span className="badge badge-danger" style={{ alignSelf: 'flex-start' }}>ต้องซ้อนแหวนเท่านั้น</span>}
    </div>
  )
}

export function PetGroup({ ids, emptyText = 'Pet อะไรก็ได้' }: { ids: string[]; emptyText?: string }) {
  const m = useMaster()
  if (ids.length === 0) return <span className="muted">{emptyText}</span>
  return (
    <div className="row wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
      {ids.map((id, i) => (
        <span key={id} className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
          {i === 1 && <span className="or" style={{ paddingBottom: 18 }}>หรือ</span>}
          <span className="stack" style={{ '--gap': '4px', alignItems: 'center' } as CSSProperties}>
            <ImageSlot item={m?.pet[id]} size={i === 0 ? 52 : 36} ring={i === 0 ? 'var(--gold)' : undefined} />
            <span className="small" style={i === 0 ? { color: 'var(--gold-text)', fontWeight: 600 } : undefined}>
              {m?.pet[id]?.name}
            </span>
          </span>
        </span>
      ))}
    </div>
  )
}

export function CounterPets({ ids }: { ids: string[] }) {
  const m = useMaster()
  return (
    <div className="row wrap small" style={{ color: 'var(--enemy-muted)', fontSize: 13 }}>
      <Icon name="shield" size={15} />
      {ids.length === 0 ? (
        <span>รับมือได้กับ Pet ศัตรูทุกตัว</span>
      ) : (
        <>
          <span>รับมือได้เมื่อศัตรูใช้ Pet:</span>
          {ids.map((id) => (
            <span key={id} className="row" style={{ gap: 6 }}>
              <ImageSlot item={m?.pet[id]} size={24} ring="var(--enemy-text)" />
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{m?.pet[id]?.name}</strong>
            </span>
          ))}
        </>
      )}
    </div>
  )
}

export function SpeedText({ speed }: { speed: SpeedRule }) {
  if (!speed) return null
  return (
    <span className="row small" style={{ gap: 4, color: 'var(--gold-text)' }}>
      <Icon name="bolt" size={14} />
      {speed.kind === 'FASTER' ? 'เร็วกว่าฝั่งตรงข้าม' : `Speed อย่างน้อย ${speed.value}`}
    </span>
  )
}

export function Section({ label, right, children }: { label: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="stack" style={{ '--gap': '6px' } as CSSProperties}>
      <div className="row between">
        <span className="sublabel">{label}</span>
        {right}
      </div>
      {children}
    </div>
  )
}
