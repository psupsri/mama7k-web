import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '../../api/admin'
import type { FeedbackStatus } from '../../api/admin'
import type { Feedback } from '../../types/domain'
import { useToast } from '../../hooks/useToast'
import { errorMessage } from '../../lib/errors'
import { FEEDBACK_KIND_LABEL, formatDateTime } from '../../lib/labels'
import { Empty, ErrorState, Loading } from '../../components/States'

const KIND_BADGE: Record<Feedback['kind'], string> = { BUG: 'badge-danger', IDEA: 'badge-gold', DATA: 'badge-group', OTHER: 'badge-soft' }

/** Feedback sent from the site's footer; staff mark it handled, reopen it or delete spam. */
export function AdminFeedbackPage() {
  const [status, setStatus] = useState<FeedbackStatus>('open')
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'feedback', status], queryFn: () => adminApi.adminListFeedback(status) })

  const run = (fn: () => Promise<unknown>, done: string) =>
    fn()
      .then(() => {
        qc.invalidateQueries({ queryKey: ['admin', 'feedback'] })
        toast(done)
      })
      .catch((e) => toast(errorMessage(e), true))

  return (
    <div className="stack">
      <div className="row wrap" role="group" aria-label="สถานะ">
        <button type="button" className="chip" aria-pressed={status === 'open'} onClick={() => setStatus('open')}>
          รอจัดการ
        </button>
        <button type="button" className="chip" aria-pressed={status === 'done'} onClick={() => setStatus('done')}>
          จัดการแล้ว
        </button>
      </div>
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} />
      ) : data!.length === 0 ? (
        <Empty>{status === 'open' ? 'ไม่มีความคิดเห็นที่รอจัดการ' : 'ยังไม่มีรายการที่จัดการแล้ว'}</Empty>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {data!.map((f) => (
            <article key={f.id} className="card stack" style={{ gap: 10 }}>
              <div className="row wrap between">
                <span className="row wrap" style={{ gap: 8 }}>
                  <span className={`badge ${KIND_BADGE[f.kind]}`}>{FEEDBACK_KIND_LABEL[f.kind]}</span>
                  <span className="small muted">{formatDateTime(f.createdAt)}</span>
                </span>
                <span className="small muted">{f.user ? `${f.user.displayName} (@${f.user.username})` : 'Guest'}</span>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{f.message}</p>
              {(f.contact || f.page) && (
                <div className="row wrap small muted" style={{ gap: 16 }}>
                  {f.contact && <span>ติดต่อ: {f.contact}</span>}
                  {f.page && (
                    <span>
                      หน้า: <Link to={f.page}>{f.page}</Link>
                    </span>
                  )}
                </div>
              )}
              <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => confirm('ลบความคิดเห็นนี้ถาวร?') && run(() => adminApi.adminDeleteFeedback(f.id), 'ลบแล้ว')}
                >
                  ลบ
                </button>
                <button
                  className={`btn btn-sm${f.resolvedAt ? '' : ' btn-primary'}`}
                  onClick={() => run(() => adminApi.adminResolveFeedback(f.id, !f.resolvedAt), f.resolvedAt ? 'เปิดใหม่แล้ว' : 'จัดการแล้ว')}
                >
                  {f.resolvedAt ? 'เปิดใหม่' : 'จัดการแล้ว'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
