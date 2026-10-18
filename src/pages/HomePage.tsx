import { useState } from 'react'
import { vars } from '../lib/style'
import { Link, useSearchParams } from 'react-router-dom'
import { useLineups, useMaster, useMe } from '../hooks/queries'
import { formationInfo } from '../lib/formation'
import { Formation } from '../components/Formation'
import { Icon } from '../components/Icon'
import { ImageSlot } from '../components/ImageSlot'
import { Picker } from '../components/Picker'
import { Empty, ErrorState, Loading } from '../components/States'

export function HomePage() {
  const m = useMaster()
  const { data: me } = useMe()
  const [params, setParams] = useSearchParams()
  const selected = params.get('c')?.split(',').filter(Boolean) ?? []
  const [picking, setPicking] = useState(false)
  const { data, isLoading, error } = useLineups(selected)

  const setSelected = (ids: string[]) => setParams(ids.length ? { c: ids.join(',') } : {}, { replace: true })

  return (
    <div className="page">
      <div className="row between wrap">
        <div className="stack" style={{ gap: 4 }}>
          <h1>บ้านศัตรู</h1>
          <p className="muted">เลือกตัวละครที่เจอในบ้านศัตรู แล้วดูว่าควรใช้ทีมไหนตี</p>
        </div>
        {me && (
          <Link to="/lineups/new" className="btn btn-primary">
            <Icon name="plus" /> เพิ่มบ้านศัตรู
          </Link>
        )}
      </div>

      <section className="card stack" aria-label="ค้นหาจากตัวละคร">
        <div className="row between wrap">
          <span className="label">ตัวละครในบ้านศัตรู</span>
          {selected.length > 0 && (
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected([])}>
              ล้าง
            </button>
          )}
        </div>
        <div className="row wrap">
          {selected.map((id) => (
            <button key={id} className="chip chip-img" aria-pressed="true" onClick={() => setSelected(selected.filter((x) => x !== id))} title="เอาออก">
              <ImageSlot item={m?.character[id]} size={26} round showTitle={false} />
              {m?.character[id]?.name}
              <Icon name="close" size={14} />
            </button>
          ))}
          {selected.length < 3 && (
            <button className="btn btn-sm" onClick={() => setPicking(true)}>
              <Icon name="search" size={14} /> {selected.length ? 'เพิ่มตัวละคร' : 'เลือกตัวละคร'}
            </button>
          )}
        </div>
      </section>

      {isLoading || !m ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} />
      ) : data!.length === 0 ? (
        <Empty>
          ยังไม่มีบ้านศัตรูที่มีตัวละครเหล่านี้
          {me && (
            <div style={{ marginTop: 12 }}>
              <Link to={`/lineups/new?c=${selected.join(',')}`} className="btn btn-primary">
                เพิ่มบ้านศัตรูนี้
              </Link>
            </div>
          )}
        </Empty>
      ) : (
        <div className="grid-auto" style={vars({ '--min': '300px' })}>
          {data!.map(({ lineup, visibleBuildCount }) => (
            <Link key={lineup.id} to={`/lineups/${lineup.id}`} className="card card-enemy stack" style={{ color: 'inherit' }}>
              <div className="row between">
                <span className="label" style={{ color: 'var(--enemy-text)' }}>
                  {formationInfo(lineup.formation).label}
                </span>
                <span className="small muted">{visibleBuildCount} Build</span>
              </div>
              <Formation formation={lineup.formation} placements={lineup.placements} variant="enemy" size="sm" />
            </Link>
          ))}
        </div>
      )}

      {picking && m && (
        <Picker
          title="เลือกตัวละครในบ้านศัตรู"
          items={m.characters}
          selected={selected}
          multiple
          max={3}
          onChange={setSelected}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}
