import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as votesApi from '../api/votes'
import type { BattleResult, BuildDetail, EquipLevel, User } from '../types/domain'
import { EQUIP_LEVELS, EQUIP_LEVEL_HINT, EQUIP_LEVEL_LABEL, RESULT_LABEL } from '../lib/labels'
import { Modal } from './Modal'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/errors'

interface Draft {
  result: BattleResult
  level: EquipLevel | null
  confirmReplace: boolean
}

export function VotePanel({ detail, me, compact }: { detail: BuildDetail; me: User | null; compact?: boolean }) {
  const qc = useQueryClient()
  const toast = useToast()
  const location = useLocation()
  const [draft, setDraft] = useState<Draft | null>(null)
  const myVote = detail.myVote

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['build', detail.build.id] })
    qc.invalidateQueries({ queryKey: ['lineupBuilds'] })
    qc.invalidateQueries({ queryKey: ['myBuilds'] })
    qc.invalidateQueries({ queryKey: ['group'] })
  }

  const cast = useMutation({
    mutationFn: (d: { result: BattleResult; level: EquipLevel }) => votesApi.castVote(detail.build.id, d.result, d.level),
    onSuccess: () => {
      toast(myVote ? 'เปลี่ยนโหวตแล้ว' : 'บันทึกโหวตแล้ว')
      setDraft(null)
      refresh()
    },
    onError: (e) => toast(errorMessage(e), true),
  })

  const cancel = useMutation({
    mutationFn: () => votesApi.cancelVote(detail.build.id),
    onSuccess: () => {
      toast('ยกเลิกโหวตแล้ว')
      refresh()
    },
    onError: (e) => toast(errorMessage(e), true),
  })

  if (!me) {
    return (
      <div className="row wrap">
        <span className="muted">ลองใช้แล้ว?</span>
        <Link className="btn" to={`/login?next=${encodeURIComponent(location.pathname)}`}>
          เข้าสู่ระบบเพื่อโหวต
        </Link>
      </div>
    )
  }
  if (!me.emailVerified) {
    return <div className="banner">ยืนยันอีเมลก่อนจึงจะโหวตได้ (ดูที่หน้าโปรไฟล์)</div>
  }

  const submit = () => {
    if (!draft?.level) return
    // FR 6.2: replacing an existing vote needs explicit confirmation.
    if (myVote && !draft.confirmReplace) {
      setDraft({ ...draft, confirmReplace: true })
      return
    }
    cast.mutate({ result: draft.result, level: draft.level })
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {myVote && (
        <div className="row wrap small">
          <span className="muted">
            โหวตของคุณ: <strong style={{ color: myVote.result === 'WIN' ? 'var(--win-text)' : 'var(--loss-text)' }}>{RESULT_LABEL[myVote.result]}</strong> ·{' '}
            {EQUIP_LEVEL_LABEL[myVote.equipLevel]}
          </span>
          <button className="btn btn-sm btn-ghost" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            ยกเลิกโหวต
          </button>
        </div>
      )}
      <div className="row" style={{ gap: 10 }}>
        {!compact && <span className="muted">{myVote ? 'เปลี่ยนผล:' : 'ลองใช้แล้ว?'}</span>}
        <button
          className={`btn btn-win${compact ? ' btn-lg grow' : ''}`}
          style={{ minWidth: 112 }}
          onClick={() => setDraft({ result: 'WIN', level: myVote?.equipLevel ?? null, confirmReplace: false })}
        >
          ชนะ
        </button>
        <button
          className={`btn btn-loss${compact ? ' btn-lg grow' : ''}`}
          style={{ minWidth: 112 }}
          onClick={() => setDraft({ result: 'LOSS', level: myVote?.equipLevel ?? null, confirmReplace: false })}
        >
          แพ้
        </button>
      </div>

      {draft && (
        <Modal
          title={draft.confirmReplace ? 'แทนที่โหวตเดิม?' : `โหวต: ${RESULT_LABEL[draft.result]}`}
          onClose={() => setDraft(null)}
          footer={
            <>
              <button className="btn" onClick={() => (draft.confirmReplace ? setDraft({ ...draft, confirmReplace: false }) : setDraft(null))}>
                {draft.confirmReplace ? 'ย้อนกลับ' : 'ยกเลิก'}
              </button>
              <button className="btn btn-primary" disabled={!draft.level || cast.isPending} onClick={submit}>
                {draft.confirmReplace ? 'ยืนยันแทนที่' : 'บันทึกโหวต'}
              </button>
            </>
          }
        >
          {draft.confirmReplace && myVote && draft.level ? (
            <div className="stack">
              <p>คุณมีโหวตใน Build นี้อยู่แล้ว ระบบจะแทนที่โหวตเดิมด้วยโหวตใหม่</p>
              <div className="card stack" style={{ gap: 6 }}>
                <span className="muted small">เดิม</span>
                <span>
                  {RESULT_LABEL[myVote.result]} · {EQUIP_LEVEL_LABEL[myVote.equipLevel]}
                </span>
                <span className="muted small">ใหม่</span>
                <span>
                  {RESULT_LABEL[draft.result]} · {EQUIP_LEVEL_LABEL[draft.level]}
                </span>
              </div>
            </div>
          ) : (
            <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="muted" style={{ marginBottom: 10 }}>
                คุณใช้อุปกรณ์ตรงกับที่แนะนำแค่ไหน?
              </legend>
              {EQUIP_LEVELS.map((lv) => (
                <label key={lv} className="radio-card">
                  <input
                    type="radio"
                    name="equip-level"
                    checked={draft.level === lv}
                    onChange={() => setDraft({ ...draft, level: lv })}
                  />
                  <span className="stack" style={{ gap: 2 }}>
                    <strong style={{ fontWeight: 600 }}>{EQUIP_LEVEL_LABEL[lv]}</strong>
                    <span className="small muted">{EQUIP_LEVEL_HINT[lv]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
        </Modal>
      )}
    </div>
  )
}
