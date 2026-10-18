import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as buildsApi from '../api/builds'
import { useBuild, useMaster, useMe } from '../hooks/queries'
import { formationInfo, orderedPlacements, teamTitle } from '../lib/formation'
import { formatDate } from '../lib/labels'
import { Formation } from './Formation'
import { Icon } from './Icon'
import { ImageSlot } from './ImageSlot'
import { RecommendationCard } from './RecommendationCard'
import { StatsCard } from './StatsCard'
import { ErrorState, Loading } from './States'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/errors'
import { VotePanel } from './VotePanel'
import { CounterPets, PetGroup, Section, SpeedText, VisibilityBadge } from './game'
import { EnemyLineupCard } from './EnemyLineupCard'

export function BuildDetailView({ buildId, backTo, showEnemy }: { buildId: string; backTo: string; showEnemy?: boolean }) {
  const { data: d, isLoading, error } = useBuild(buildId)
  const { data: me } = useMe()
  const m = useMaster()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()

  const del = useMutation({
    mutationFn: () => buildsApi.deleteBuild(buildId),
    onSuccess: () => {
      qc.invalidateQueries()
      toast('ลบ Build แล้ว')
      nav(backTo)
    },
    onError: (e) => toast(errorMessage(e), true),
  })

  if (isLoading || !m) return <Loading rows={3} />
  if (error || !d) return <ErrorState error={error} backTo={backTo} />

  const b = d.build
  const ordersFor = (cid: string) => b.skillOrder.flatMap((sid, i) => (m.skill[sid]?.characterId === cid ? [i + 1] : []))
  const recs = orderedPlacements(b.placements).flatMap((p) => b.recommendations.filter((r) => r.characterId === p.characterId))

  return (
    <div className="stack" style={{ gap: 20 }}>
      <Link to={backTo} className="row small mobile-only" style={{ gap: 4 }}>
        <Icon name="back" size={16} /> Build อื่นของบ้านนี้
      </Link>

      {showEnemy && <EnemyLineupCard lineup={d.lineup} />}

      {b.creatorDeleted && <div className="banner">ผู้สร้างลบบัญชีแล้ว Build นี้จึงแก้ไขไม่ได้อีก</div>}
      {b.adminHidden && <div className="banner">Build นี้ถูกซ่อนโดย Admin ผู้ใช้อื่นจะมองไม่เห็น</div>}

      <section className="row wrap between" style={{ alignItems: 'flex-end', gap: 16 }} aria-label="ข้อมูล Build">
        <div className="stack" style={{ gap: 6 }}>
          <CounterPets ids={b.counterPets} />
          <h1>{teamTitle(b.placements, m.character)}</h1>
          <div className="row wrap small muted">
            <span>{d.isMine ? 'โดยคุณ' : `โดย ${d.creatorName}`}</span>
            <span aria-hidden="true">·</span>
            <VisibilityBadge visibility={b.visibility} groupNames={d.groupNames} />
            <span aria-hidden="true">·</span>
            <span>แก้ไขล่าสุด {formatDate(b.updatedAt)}</span>
          </div>
          {d.canEdit && (
            <div className="row wrap" style={{ marginTop: 4 }}>
              <Link to={`/builds/${b.id}/edit`} className="btn btn-sm">
                <Icon name="edit" size={14} /> แก้ไข
              </Link>
              <button
                className="btn btn-sm btn-danger"
                disabled={del.isPending}
                onClick={() => {
                  if (confirm('ลบ Build นี้? โหวตทั้งหมดของ Build จะถูกลบด้วย')) del.mutate()
                }}
              >
                <Icon name="trash" size={14} /> ลบ
              </button>
            </div>
          )}
        </div>
        <div className="desktop-only">
          <VotePanel detail={d} me={me ?? null} />
        </div>
      </section>

      <div className="detail-top">
        <section className="card stack area-team" style={{ gap: 16 }} aria-label="ทีมบุก">
          <div className="row between">
            <span className="label">ทีมบุก · {formationInfo(b.formation).label}</span>
            <SpeedText speed={b.speed} />
          </div>
          <Formation formation={b.formation} placements={b.placements} skillOrder={b.skillOrder} />
          <Section label="ลำดับสกิล">
            {b.skillOrder.length === 0 ? (
              <span className="muted">ไม่ได้ระบุ</span>
            ) : (
              <ol className="stack" style={{ gap: 4, margin: 0, padding: 0, listStyle: 'none' }}>
                {b.skillOrder.map((sid, i) => {
                  const sk = m.skill[sid]
                  return (
                    <li key={sid} className="row" style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)' }}>
                      <span className="num" style={{ color: 'var(--gold-text)' }}>
                        {i + 1}
                      </span>
                      <ImageSlot item={sk} size={28} />
                      <span>{sk && m.character[sk.characterId]?.name}</span>
                      <span className="small muted">{sk?.name}</span>
                    </li>
                  )
                })}
              </ol>
            )}
          </Section>
        </section>
        <div className="area-stats">
          <StatsCard d14={d.stats14} all={d.statsAll} />
        </div>
        <section className="card stack area-pets" style={{ gap: 10 }} aria-label="Pet">
          <span className="label">Pet ที่แนะนำ</span>
          <PetGroup ids={b.ownPets} />
        </section>
      </div>

      <span className="label">อุปกรณ์ที่แนะนำ</span>
      <div className="grid-auto">
        {recs.map((r, i) => (
          <RecommendationCard
            key={r.characterId}
            rec={r}
            index={i}
            placement={b.placements.find((p) => p.characterId === r.characterId)}
            skillOrders={ordersFor(r.characterId)}
          />
        ))}
      </div>

      {b.description && (
        <section className="card stack" style={{ gap: 6 }}>
          <span className="label">คำอธิบาย</span>
          <p style={{ color: 'var(--text-2)', whiteSpace: 'pre-line' }}>{b.description}</p>
        </section>
      )}

      <div className="action-bar mobile-only">
        <VotePanel detail={d} me={me ?? null} compact />
      </div>
    </div>
  )
}
