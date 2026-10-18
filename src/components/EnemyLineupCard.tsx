import type { ReactNode } from 'react'
import type { DefenseLineup } from '../types/domain'
import { formationInfo } from '../lib/formation'
import { Formation } from './Formation'

export function EnemyLineupCard({ lineup, children, action }: { lineup: DefenseLineup; children?: ReactNode; action?: ReactNode }) {
  return (
    <section className="card card-enemy stack" aria-label="บ้านศัตรู">
      <div className="row between">
        <span className="label" style={{ color: 'var(--enemy-text)' }}>
          บ้านศัตรู · {formationInfo(lineup.formation).label}
        </span>
        {action}
      </div>
      <Formation formation={lineup.formation} placements={lineup.placements} variant="enemy" size="sm" />
      {children}
    </section>
  )
}
