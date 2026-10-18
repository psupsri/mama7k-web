import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { BuildSort } from '../api/builds'
import { useLineup, useLineupBuilds, useMaster, useMe } from '../hooks/queries'
import { BuildCard } from '../components/BuildCard'
import { BuildDetailView } from '../components/BuildDetailView'
import { EnemyLineupCard } from '../components/EnemyLineupCard'
import { ImageSlot } from '../components/ImageSlot'
import { Picker } from '../components/Picker'
import { Empty, ErrorState, Loading } from '../components/States'

const SORTS: { value: BuildSort; label: string }[] = [
  { value: 'WIN14', label: 'ชนะสูงสุด 14 วัน' },
  { value: 'VOTES', label: 'โหวตมากสุด 14 วัน' },
  { value: 'NEWEST', label: 'ใหม่ล่าสุด' },
]

export function LineupPage() {
  const { lineupId = '', buildId } = useParams()
  const m = useMaster()
  const { data: me } = useMe()
  const [params, setParams] = useSearchParams()
  const enemyPetId = params.get('pet')
  const sort = (params.get('sort') as BuildSort) || 'WIN14'
  const [pickPet, setPickPet] = useState(false)

  const lineup = useLineup(lineupId)
  const builds = useLineupBuilds(lineupId, { enemyPetId, sort })
  // Unfiltered list only to suggest pets that builds actually counter.
  const all = useLineupBuilds(lineupId, { sort })
  const suggestedPets = useMemo(
    () => [...new Set((all.data ?? []).flatMap((s) => s.build.counterPets))],
    [all.data],
  )
  const petChips = enemyPetId && !suggestedPets.includes(enemyPetId) ? [...suggestedPets, enemyPetId] : suggestedPets

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }
  const qs = params.toString() ? `?${params}` : ''

  if (lineup.isLoading || !m) return <div className="page"><Loading /></div>
  if (lineup.error || !lineup.data) return <div className="page"><ErrorState error={lineup.error} /></div>

  return (
    <div className="page">
      <nav aria-label="breadcrumb" className="row small faint">
        <Link to="/" className="muted">
          บ้านศัตรู
        </Link>
        <span aria-hidden="true">/</span>
        <span>{lineup.data.placements.map((p) => m.character[p.characterId]?.name).join(' · ')}</span>
      </nav>

      <div className={`split${buildId ? ' has-detail' : ''}`}>
        <aside className="split-aside" aria-label="รายการ Build">
          <EnemyLineupCard lineup={lineup.data}>
            <hr className="divider" style={{ borderColor: 'var(--enemy-border)', margin: '4px 0' }} />
            <div className="stack" style={{ gap: 8 }}>
              <span className="small" style={{ color: 'var(--enemy-muted)' }}>
                ศัตรูใช้ Pet อะไร?
              </span>
              <div className="row wrap" style={{ gap: 6 }}>
                <button className="chip" aria-pressed={!enemyPetId} onClick={() => setParam('pet', null)}>
                  ทั้งหมด
                </button>
                {petChips.map((id) => (
                  <button key={id} className="chip chip-img" aria-pressed={enemyPetId === id} onClick={() => setParam('pet', id)}>
                    <ImageSlot item={m.pet[id]} size={24} round showTitle={false} />
                    {m.pet[id]?.name}
                  </button>
                ))}
                <button className="chip" onClick={() => setPickPet(true)}>
                  เลือก…
                </button>
              </div>
            </div>
          </EnemyLineupCard>

          <div className="row between">
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>
              {builds.data?.length ?? 0} Build
            </span>
            <label className="row small">
              <span className="sr-only">เรียงลำดับ</span>
              <select className="select input-sm" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {builds.isLoading ? (
            <Loading rows={2} />
          ) : builds.data!.length === 0 ? (
            <Empty>{enemyPetId ? 'ยังไม่มี Build ที่รับมือ Pet นี้ได้' : 'ยังไม่มี Build สำหรับบ้านนี้'}</Empty>
          ) : (
            builds.data!.map((s) => (
              <BuildCard key={s.build.id} s={s} active={s.build.id === buildId} to={`/lineups/${lineupId}/b/${s.build.id}${qs}`} />
            ))
          )}

          {me ? (
            <Link to={`/builds/new?lineup=${lineupId}`} className="btn btn-dashed btn-lg">
              + สร้าง Build ตีบ้านนี้
            </Link>
          ) : (
            <Link to={`/login?next=/lineups/${lineupId}`} className="btn">
              เข้าสู่ระบบเพื่อสร้าง Build
            </Link>
          )}
        </aside>

        <div className="split-main">
          {buildId ? (
            <BuildDetailView key={buildId} buildId={buildId} backTo={`/lineups/${lineupId}${qs}`} />
          ) : (
            <div className="empty desktop-only" style={{ justifyContent: 'center' }}>
              เลือก Build จากรายการด้านซ้ายเพื่อดูรายละเอียด
            </div>
          )}
        </div>
      </div>

      {pickPet && (
        <Picker
          title="ศัตรูใช้ Pet ตัวไหน?"
          items={m.pets}
          selected={enemyPetId ? [enemyPetId] : []}
          onChange={(ids) => setParam('pet', ids[0] ?? null)}
          onClose={() => setPickPet(false)}
        />
      )}
    </div>
  )
}
