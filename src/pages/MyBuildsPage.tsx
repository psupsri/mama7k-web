import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Visibility } from '../types/domain'
import { useMyBuilds } from '../hooks/queries'
import { BuildCard } from '../components/BuildCard'
import { Empty, ErrorState, Loading } from '../components/States'
import { vars } from '../lib/style'
import { RequireAuth } from './RequireAuth'

export function MyBuildsPage() {
  return (
    <RequireAuth>
      <MyBuilds />
    </RequireAuth>
  )
}

function MyBuilds() {
  const { data, isLoading, error } = useMyBuilds()
  const [filter, setFilter] = useState<Visibility | 'ALL'>('ALL')
  const list = (data ?? []).filter((s) => filter === 'ALL' || s.build.visibility === filter)

  return (
    <div className="page">
      <div className="row between wrap">
        <h1>Build ของฉัน</h1>
        <Link to="/" className="btn btn-primary">
          + สร้าง Build (เลือกบ้านศัตรูก่อน)
        </Link>
      </div>
      <div className="row wrap">
        {(['ALL', 'PUBLIC', 'GROUP', 'PRIVATE'] as const).map((v) => (
          <button key={v} className="chip" aria-pressed={filter === v} onClick={() => setFilter(v)}>
            {v === 'ALL' ? 'ทั้งหมด' : v === 'PUBLIC' ? 'Public' : v === 'GROUP' ? 'Group' : 'Private'}
          </button>
        ))}
      </div>
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} />
      ) : list.length === 0 ? (
        <Empty>ยังไม่มี Build</Empty>
      ) : (
        <div className="grid-auto" style={vars({ '--min': '320px' })}>
          {list.map((s) => (
            <BuildCard key={s.build.id} s={s} to={`/lineups/${s.lineupId}/b/${s.build.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
