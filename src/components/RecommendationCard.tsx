import type { CharacterRecommendation, Placement } from '../types/domain'
import { useMaster } from '../hooks/queries'
import { ROW_LABEL } from '../lib/formation'
import { ImageSlot } from './ImageSlot'
import { RingList, Section, SetList, StatPills } from './game'

const ACCENTS = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)']
const HEAD_BG = ['var(--rec-head-1)', 'var(--rec-head-2)', 'var(--rec-head-3)']

export function RecommendationCard({
  rec,
  placement,
  index,
  skillOrders,
}: {
  rec: CharacterRecommendation
  placement?: Placement
  index: number
  skillOrders: number[]
}) {
  const m = useMaster()
  const c = m?.character[rec.characterId]
  return (
    <article className="card rec-card" aria-label={c?.nameTh}>
      <div className="rec-head" style={{ background: HEAD_BG[index % 3] }}>
        <ImageSlot item={c} size={52} ring={ACCENTS[index % 3]} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{c?.nameTh}</span>
          <span className="small muted">
            {placement && `แถว${ROW_LABEL[placement.row]}`}
            {skillOrders.length > 0 && ` · สกิลลำดับ ${skillOrders.join(', ')}`}
          </span>
        </div>
      </div>
      <div className="rec-body">
        <Section label="เซ็ต">
          <SetList ids={rec.sets} />
        </Section>
        <Section label="สเตตัสรวม">
          <StatPills stats={rec.stats} />
        </Section>
        <Section label="แหวน">
          <RingList rings={rec.rings} stackRequired={rec.ringStackRequired} />
        </Section>
        {rec.note && (
          <Section label="หมายเหตุ">
            <p style={{ color: 'var(--text-2)' }}>{rec.note}</p>
          </Section>
        )}
      </div>
    </article>
  )
}
