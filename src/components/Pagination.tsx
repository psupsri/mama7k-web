import { Icon } from './Icon'

/** Page numbers to show: always first and last, a window around the current page, gaps as null. */
function pageList(page: number, count: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let p = 1; p <= count; p++) {
    if (p === 1 || p === count || Math.abs(p - page) <= 1) out.push(p)
    else if (out.at(-1) !== null) out.push(null)
  }
  return out
}

export function Pagination({
  page,
  total,
  pageSize,
  onChange,
  compact,
}: {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  compact?: boolean
}) {
  const count = Math.max(1, Math.ceil(total / pageSize))
  if (count <= 1) return null
  return (
    <nav className="pagination" aria-label="เปลี่ยนหน้า">
      <button className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="หน้าก่อนหน้า">
        <span style={{ display: 'inline-flex', transform: 'rotate(0deg)' }}>
          <Icon name="back" size={14} />
        </span>
        {!compact && 'ก่อนหน้า'}
      </button>
      {compact ? (
        <span className="small muted">
          หน้า {page} / {count}
        </span>
      ) : (
        pageList(page, count).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="faint" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`btn btn-sm${p === page ? ' btn-primary' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`หน้า ${p}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ),
        )
      )}
      <button className="btn btn-sm" disabled={page >= count} onClick={() => onChange(page + 1)} aria-label="หน้าถัดไป">
        {!compact && 'ถัดไป'}
        <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
          <Icon name="back" size={14} />
        </span>
      </button>
    </nav>
  )
}
