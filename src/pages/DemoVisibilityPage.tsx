import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as authApi from '../api/auth'
import type { Visibility } from '../types/domain'
import { useMe } from '../hooks/queries'
import { useToast } from '../hooks/useToast'
import { Icon } from '../components/Icon'
import { Loading } from '../components/States'
import { VisibilityBadge } from '../components/game'

const LINEUP_ID = 'l1'

/** Mock-only walkthrough: who sees which build, and a one-click "view as" for each user. */
export function DemoVisibilityPage() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: me } = useMe()
  const { data, isLoading } = useQuery({ queryKey: ['devMatrix', LINEUP_ID], queryFn: () => authApi.devVisibilityMatrix(LINEUP_ID) })

  const viewAs = async (id: string | null, name: string, path: string) => {
    await authApi.devSwitchUser(id)
    qc.clear()
    toast(`ตอนนี้คุณคือ ${name}`)
    nav(path)
  }

  if (isLoading || !data) return <div className="page"><Loading /></div>

  // Group roster derived from the viewers' memberships.
  const groups = new Map<string, { owner?: string; members: string[] }>()
  for (const v of data.viewers)
    for (const g of v.groups) {
      const entry = groups.get(g.name) ?? { members: [] }
      if (g.owner) entry.owner = v.name
      else entry.members.push(v.name)
      groups.set(g.name, entry)
    }

  return (
    <div className="page">
      <div className="stack" style={{ gap: 4 }}>
        <span className="badge badge-soft" style={{ alignSelf: 'flex-start' }}>
          Mock เท่านั้น
        </span>
        <h1>ตัวอย่างสิทธิ์การมองเห็น Build</h1>
        <p className="muted">
          Build ทั้งหมดในตารางอยู่ที่บ้านศัตรูหลังเดียวกัน (ลิโป้ · ฮายอน · ซอรัน) ตารางคำนวณด้วยกติกาเดียวกับที่แอปใช้จริง กด "ดูในฐานะ…" เพื่อสลับผู้ใช้แล้วเปิดหน้าจริง
        </p>
      </div>

      <section className="card stack">
        <span className="label">Group และสมาชิก</span>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Owner</th>
                <th>สมาชิก</th>
              </tr>
            </thead>
            <tbody>
              {[...groups].map(([name, g]) => (
                <tr key={name}>
                  <td style={{ fontWeight: 600 }}>{name}</td>
                  <td>{g.owner ?? '-'}</td>
                  <td className="muted">{g.members.join(', ') || '-'}</td>
                </tr>
              ))}
              <tr>
                <td className="muted">ไม่อยู่ Group ใด</td>
                <td colSpan={2} className="muted">
                  {data.viewers.filter((v) => v.id && v.groups.length === 0).map((v) => v.name).join(', ') || '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <span className="label">ใครเห็น Build ไหน</span>
        <div className="table-scroll">
          <table className="table" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Build</th>
                <th>แชร์</th>
                {data.viewers.map((v) => (
                  <th key={v.id ?? 'guest'} style={{ textAlign: 'center', minWidth: 96 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600 }}>{v.name}</div>
                    <div className="small faint">
                      {v.id === null ? v.role : v.groups.length ? v.groups.map((g) => `${g.owner ? 'Owner ' : ''}${g.name}`).join(', ') : 'นอก Group'}
                    </div>
                    {(me?.id ?? null) === v.id && <span className="badge badge-public">คุณอยู่ตอนนี้</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.builds.map((b) => (
                <tr key={b.id}>
                  <td style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 600 }}>{b.title}</div>
                    <div className="small muted">โดย {b.creatorName}</div>
                  </td>
                  <td style={{ minWidth: 170 }}>
                    <div className="stack" style={{ gap: 4 }}>
                      <span>
                        <VisibilityBadge visibility={b.visibility as Visibility} />
                      </span>
                      {b.shares.map((s) => (
                        <span key={s.groupName} className="small">
                          {s.groupName} {s.hidden && <span className="badge badge-danger">Owner ซ่อน</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                  {data.viewers.map((v) => {
                    const ok = b.visibleTo.includes(v.id)
                    return (
                      <td key={v.id ?? 'guest'} style={{ textAlign: 'center' }} aria-label={ok ? 'เห็น' : 'ไม่เห็น'}>
                        {ok ? (
                          <span className="win-text" style={{ display: 'inline-flex' }}>
                            <Icon name="check" strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="faint">–</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr>
                <td colSpan={2} className="small muted">
                  เปิดหน้าบ้านศัตรูนี้ในฐานะ
                </td>
                {data.viewers.map((v) => (
                  <td key={v.id ?? 'guest'} style={{ textAlign: 'center' }}>
                    <button className="btn btn-sm" onClick={() => viewAs(v.id, v.name, `/lineups/${LINEUP_ID}`)}>
                      ดูในฐานะ {v.name}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <span className="label">สิ่งที่ควรสังเกต</span>
        <ul className="stack" style={{ gap: 10, margin: 0, paddingLeft: 18 }}>
          <li>
            <strong>คนนอก Group</strong> (สายฟ้า ซึ่งอยู่แค่ห้องลับสายฟ้า) และ Guest เห็นแค่ Build ที่เป็น Public ตัวเลขจำนวน Build ในหน้าแรกก็นับเฉพาะที่ตัวเองเห็น ถ้าเปิดลิงก์ Build ของ Group ตรง ๆ จะขึ้นว่า "ไม่พบ Build"
            <div className="row wrap" style={{ marginTop: 6 }}>
              <button className="btn btn-sm" onClick={() => viewAs('u4', 'สายฟ้า', `/lineups/${LINEUP_ID}/b/b2`)}>
                ลองเปิด Build ของกิลด์มาม่าในฐานะสายฟ้า
              </button>
            </div>
          </li>
          <li>
            <strong>สมาชิก Group</strong> (หมีน้อย ในกิลด์มาม่า) เห็น Build ที่แชร์ให้กิลด์มาม่า รวมถึง Build ที่แชร์ให้ 2 Group พร้อมกัน แต่ไม่เห็น Build ของ Night Raid
          </li>
          <li>
            <strong>Build ที่ Owner ซ่อน</strong> (คาร์ม่า · ไคล์ · อีวาน) สมาชิกทุกคนในกิลด์มาม่ามองไม่เห็น รวมถึง Owner เองในหน้าบ้านศัตรู แต่ผู้สร้าง (หมีน้อย) ยังเห็นและแก้ไขได้ ส่วน Owner เห็นในหน้า Group เพื่อกด "แสดง" กลับ
            <div className="row wrap" style={{ marginTop: 6 }}>
              <button className="btn btn-sm" onClick={() => viewAs('u1', 'Pisit', '/groups/g1')}>
                เปิดหน้า Group กิลด์มาม่าในฐานะ Owner
              </button>
              <button className="btn btn-sm" onClick={() => viewAs('u2', 'หมีน้อย', `/lineups/${LINEUP_ID}/b/b8`)}>
                เปิด Build ที่ถูกซ่อนในฐานะผู้สร้าง
              </button>
            </div>
          </li>
          <li>
            <strong>คนที่อยู่หลาย Group</strong> (Pisit อยู่ทั้งกิลด์มาม่าและ Night Raid) เห็น Build ของทั้งสอง Group และเห็น Private Build ของตัวเอง
          </li>
          <li>
            ลองให้หมีน้อย <strong>ออกจาก Group</strong> ในหน้า Group แล้วกลับมาที่หน้านี้ จะเห็นว่าหมีน้อยไม่เห็น Build ของกิลด์มาม่าทันที และ Build ที่หมีน้อยแชร์ไว้กลายเป็น Private
            <div className="row wrap" style={{ marginTop: 6 }}>
              <button className="btn btn-sm" onClick={() => viewAs('u2', 'หมีน้อย', '/groups/g1')}>
                เปิดหน้า Group ในฐานะหมีน้อย
              </button>
            </div>
          </li>
        </ul>
        <p className="small faint">อยากเริ่มใหม่ กด Mock มุมล่างซ้าย แล้วเลือก "รีเซ็ตข้อมูล mock ทั้งหมด"</p>
      </section>
    </div>
  )
}
