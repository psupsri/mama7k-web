import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DEFAULT_PAGE_SIZE, type BuildSort } from '../api/builds'
import type { BuildListPage } from '../types/domain'
import { useLineup, useLineupBuilds, useMaster, useMe, type MasterLookup } from '../hooks/queries'
import { vars } from '../lib/style'
import { BuildCard } from '../components/BuildCard'
import { BuildDetailView } from '../components/BuildDetailView'
import { EnemyLineupCard } from '../components/EnemyLineupCard'
import { Icon } from '../components/Icon'
import { ImageSlot } from '../components/ImageSlot'
import { Pagination } from '../components/Pagination'
import { Picker } from '../components/Picker'
import { Empty, ErrorState, Loading } from '../components/States'

const SORTS: { value: BuildSort; label: string }[] = [
  { value: 'WIN14', label: 'ชนะสูงสุด 14 วัน' },
  { value: 'VOTES', label: 'โหวตมากสุด 14 วัน' },
  { value: 'NEWEST', label: 'ใหม่ล่าสุด' },
]

/**
 * Two modes: with no build selected, the lineup and filters sit on the side and the builds
 * fill the rest (grid + paging); with a build selected it becomes a master–detail view with a
 * way back to the full list.
 */
export function LineupPage() {
  const { lineupId = '', buildId } = useParams()
  const m = useMaster()
  const { data: me } = useMe()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const enemyPetId = params.get('pet')
  const sort = (params.get('sort') as BuildSort) || 'WIN14'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [pickPet, setPickPet] = useState(false)

  const lineup = useLineup(lineupId)
  const builds = useLineupBuilds(lineupId, { enemyPetId, sort, page, pageSize: DEFAULT_PAGE_SIZE })

  // Changing a filter or the sort starts again from page 1.
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    if (k !== 'page') next.delete('page')
    setParams(next, { replace: k !== 'page' })
  }
  const qs = params.toString() ? `?${params}` : ''
  const listUrl = `/lineups/${lineupId}${qs}`

  if (lineup.isLoading || !m) return <div className="page"><Loading /></div>
  if (lineup.error || !lineup.data) return <div className="page"><ErrorState error={lineup.error} /></div>

  const filters = (
    <Filters
      m={m}
      data={builds.data}
      enemyPetId={enemyPetId}
      sort={sort}
      onPet={(id) => setParam('pet', id)}
      onSort={(s) => setParam('sort', s)}
      onPickPet={() => setPickPet(true)}
    />
  )
  const createButton = me ? (
    <Link to={`/builds/new?lineup=${lineupId}`} className="btn btn-primary">
      <Icon name="plus" size={16} /> สร้าง Build ตีบ้านนี้
    </Link>
  ) : (
    <Link to={`/login?next=/lineups/${lineupId}`} className="btn">
      เข้าสู่ระบบเพื่อสร้าง Build
    </Link>
  )
  const pager = (compact: boolean) =>
    builds.data && (
      <Pagination page={builds.data.page} total={builds.data.total} pageSize={builds.data.pageSize} compact={compact} onChange={(p) => setParam('page', String(p))} />
    )
  const empty = <Empty>{enemyPetId ? 'ยังไม่มี Build ที่รับมือ Pet นี้ได้' : 'ยังไม่มี Build สำหรับบ้านนี้'}</Empty>

  return (
    <div className="page">
      <nav aria-label="breadcrumb" className="row small faint">
        <Link to="/" className="muted">
          บ้านศัตรู
        </Link>
        <span aria-hidden="true">/</span>
        {buildId ? (
          <Link to={listUrl} className="muted">
            {lineup.data.placements.map((p) => m.character[p.characterId]?.nameTh).join(' · ')}
          </Link>
        ) : (
          <span>{lineup.data.placements.map((p) => m.character[p.characterId]?.nameTh).join(' · ')}</span>
        )}
      </nav>

      {!buildId ? (
        /* ---------- list mode: lineup + filters on the side, builds fill the rest ---------- */
        <div className="split">
          <aside className="split-aside" aria-label="บ้านศัตรูและตัวกรอง">
            <EnemyLineupCard lineup={lineup.data} />
            <section className="card stack" aria-label="ตัวกรอง">
              {filters}
              <div className="row between wrap">
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{builds.data?.total ?? 0} Build</span>
                {createButton}
              </div>
            </section>
          </aside>
          <div className="split-main">
            {builds.isLoading ? (
              <Loading rows={2} />
            ) : builds.data!.items.length === 0 ? (
              empty
            ) : (
              <div className="grid-auto" style={vars({ '--min': '250px' })}>
                {builds.data!.items.map((s) => (
                  <BuildCard key={s.build.id} s={s} to={`/lineups/${lineupId}/b/${s.build.id}${qs}`} />
                ))}
              </div>
            )}
            {pager(false)}
          </div>
        </div>
      ) : (
        /* ---------- detail mode: master–detail ---------- */
        <div className="split has-detail">
          <aside className="split-aside" aria-label="รายการ Build">
            <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => nav(listUrl)}>
              <Icon name="back" size={16} /> กลับไปรายการทั้งหมด ({builds.data?.total ?? 0})
            </button>
            <EnemyLineupCard lineup={lineup.data} />
            {builds.isLoading ? (
              <Loading rows={2} />
            ) : builds.data!.items.length === 0 ? (
              empty
            ) : (
              builds.data!.items.map((s) => (
                <BuildCard key={s.build.id} s={s} active={s.build.id === buildId} to={`/lineups/${lineupId}/b/${s.build.id}${qs}`} />
              ))
            )}
            {pager(true)}
          </aside>
          <div className="split-main">
            <BuildDetailView key={buildId} buildId={buildId} backTo={listUrl} />
          </div>
        </div>
      )}

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

function Filters({
  m,
  data,
  enemyPetId,
  sort,
  onPet,
  onSort,
  onPickPet,
}: {
  m: MasterLookup
  data?: BuildListPage
  enemyPetId: string | null
  sort: BuildSort
  onPet: (id: string | null) => void
  onSort: (s: BuildSort) => void
  onPickPet: () => void
}) {
  const pets = data?.counterPets ?? []
  const chips = enemyPetId && !pets.includes(enemyPetId) ? [...pets, enemyPetId] : pets
  return (
    <>
      <div className="stack" style={{ gap: 8 }}>
        <span className="sublabel">ศัตรูใช้ Pet อะไร?</span>
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="chip" aria-pressed={!enemyPetId} onClick={() => onPet(null)}>
            ทั้งหมด
          </button>
          {chips.map((id) => (
            <button key={id} className="chip chip-img" aria-pressed={enemyPetId === id} onClick={() => onPet(id)}>
              <ImageSlot item={m.pet[id]} size={24} round showTitle={false} />
              {m.pet[id]?.nameTh}
            </button>
          ))}
          <button className="chip" onClick={onPickPet}>
            เลือก…
          </button>
        </div>
      </div>
      <label className="row small">
        <span className="sublabel">เรียงตาม</span>
        <select className="select input-sm" style={{ width: 'auto' }} value={sort} onChange={(e) => onSort(e.target.value as BuildSort)}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
