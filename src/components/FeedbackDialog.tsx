import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import * as feedbackApi from '../api/feedback'
import type { FeedbackKind } from '../types/domain'
import { useMe } from '../hooks/queries'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/errors'
import { FEEDBACK_KIND_LABEL } from '../lib/labels'
import { Modal } from './Modal'

const KINDS: FeedbackKind[] = ['BUG', 'IDEA', 'DATA', 'OTHER']

/** Feedback form for everyone; only staff can read what is sent (Admin → Feedback). */
export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const { data: me } = useMe()
  const { pathname, search } = useLocation()
  const toast = useToast()
  const [kind, setKind] = useState<FeedbackKind>('BUG')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const send = useMutation({
    mutationFn: () => feedbackApi.sendFeedback(kind, message, contact, pathname + search),
    onSuccess: () => {
      toast('ส่งแล้ว ขอบคุณสำหรับความคิดเห็น')
      onClose()
    },
  })
  const canSend = message.trim() !== '' && !send.isPending

  return (
    <Modal
      title="ส่งความคิดเห็น"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="btn btn-primary" disabled={!canSend} onClick={() => send.mutate()}>
            ส่ง
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <div className="row wrap" role="group" aria-label="ประเภท">
          {KINDS.map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {FEEDBACK_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <label className="field">
          <span>ข้อความ</span>
          <textarea
            className="textarea"
            rows={5}
            maxLength={2000}
            placeholder={kind === 'BUG' ? 'เกิดอะไรขึ้น ทำอะไรอยู่ตอนนั้น' : kind === 'DATA' ? 'ข้อมูลไหนผิด ควรเป็นอะไร' : 'เล่าให้ฟังได้เลย'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <label className="field">
          <span>ช่องทางติดต่อกลับ (ไม่บังคับ)</span>
          <input className="input" maxLength={100} placeholder="เช่น Discord หรือ LINE ID" value={contact} onChange={(e) => setContact(e.target.value)} />
        </label>
        <p className="small muted" style={{ margin: 0 }}>
          {me ? `ส่งในชื่อ ${me.displayName} (@${me.username})` : 'ส่งแบบไม่ระบุตัวตน'} · แนบหน้าที่เปิดอยู่ไปด้วย · ทีมงานเท่านั้นที่เห็น
        </p>
        {send.error && <p className="error-text">{errorMessage(send.error)}</p>}
      </div>
    </Modal>
  )
}
