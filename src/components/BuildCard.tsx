import { Link } from 'react-router-dom'
import type { BuildSummary } from '../types/domain'
import { useMaster } from '../hooks/queries'
import { formatPct } from '../lib/labels'
import { orderedPlacements, teamTitle } from '../lib/formation'
import { ImageSlot } from './ImageSlot'
import { WinBar } from './StatsCard'
import { VisibilityBadge } from './game'

export function BuildCard({ s, to, active }: { s: BuildSummary; to?: string; active?: boolean }) {
  const m = useMaster()
  const b = s.build
  const chars = orderedPlacements(b.placements)
  const body = (
    <>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{teamTitle(b.placements, m?.character)}</span>
          <span className="small muted">{s.isMine ? 'โดยคุณ' : `โดย ${s.creatorName}`}</span>
        </div>
        <div className="row" style={{ gap: 4 }}>
          {b.adminHidden && <span className="badge badge-danger">ถูกซ่อนโดย Admin</span>}
          <VisibilityBadge visibility={b.visibility} groupNames={s.groupNames} />
        </div>
      </div>
      {b.description && <p className="small clamp-2" style={{ color: 'var(--text-2)' }}>{b.description}</p>}
      <div className="row" style={{ gap: 5 }}>
        {chars.map((p) => (
          <ImageSlot key={p.characterId} item={m?.character[p.characterId]} size={30} />
        ))}
        {b.ownPets[0] && (
          <span className="small muted" style={{ marginLeft: 6 }}>
            Pet {m?.pet[b.ownPets[0]]?.nameTh}
            {b.ownPets.length > 1 ? ` +${b.ownPets.length - 1}` : ''}
          </span>
        )}
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="grow">
          <WinBar pct={s.stats14.overallWinPct} small />
        </div>
        <span className={`num small ${s.stats14.overallWinPct === null ? 'muted' : 'win-text'}`}>
          {formatPct(s.stats14.overallWinPct)}
        </span>
        <span className="small muted">{s.stats14.total} โหวต / 14 วัน</span>
      </div>
    </>
  )
  // Without a link target (e.g. a build hidden from this viewer) the card is display-only.
  if (!to) return <div className="build-card">{body}</div>
  return (
    <Link to={to} className={`build-card${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
      {body}
    </Link>
  )
}
