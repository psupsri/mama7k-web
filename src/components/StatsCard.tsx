import { useState } from 'react'
import type { BuildStats } from '../types/domain'
import { EQUIP_LEVEL_LABEL, formatPct } from '../lib/labels'

export function WinBar({ pct, small }: { pct: number | null; small?: boolean }) {
  return (
    <div className={`bar${small ? ' bar-sm' : ''}${pct === null ? ' bar-none' : ''}`}>
      {pct !== null && <span style={{ width: `${pct}%` }} />}
    </div>
  )
}

export function StatsCard({ d14, all }: { d14: BuildStats; all: BuildStats }) {
  const [win, setWin] = useState<'D14' | 'ALL'>('D14')
  const stats = win === 'D14' ? d14 : all
  return (
    <section className="card" aria-label="สถิติผลโหวต">
      <div className="card-head">
        <span className="label">อัตราชนะ</span>
        <div className="segmented" role="tablist" aria-label="ช่วงเวลา">
          <button role="tab" aria-selected={win === 'D14'} onClick={() => setWin('D14')}>
            14 วัน
          </button>
          <button role="tab" aria-selected={win === 'ALL'} onClick={() => setWin('ALL')}>
            ทั้งหมด
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>ระดับอุปกรณ์</th>
              <th style={{ textAlign: 'right' }}>ชนะ</th>
              <th style={{ textAlign: 'right' }}>แพ้</th>
              <th style={{ textAlign: 'right' }}>WIN %</th>
            </tr>
          </thead>
          <tbody>
            {stats.levels.map((l) => (
              <tr key={l.level}>
                <td style={{ minWidth: 170 }}>
                  {EQUIP_LEVEL_LABEL[l.level]}
                  <div style={{ marginTop: 6 }}>
                    <WinBar pct={l.winPct} small />
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>{l.win}</td>
                <td style={{ textAlign: 'right' }}>{l.loss}</td>
                <td className={`num ${l.winPct === null ? 'muted' : 'win-text'}`} style={{ textAlign: 'right' }}>
                  {formatPct(l.winPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="faint small" style={{ marginTop: 8 }}>
        {win === 'D14' ? 'โหวตที่บันทึกหรือเปลี่ยนในช่วง 14 × 24 ชั่วโมงที่ผ่านมา' : 'โหวตปัจจุบันทั้งหมด'} · รวม {stats.total} โหวต
      </p>
    </section>
  )
}
