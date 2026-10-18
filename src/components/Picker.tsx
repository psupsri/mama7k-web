import { useMemo, useState } from 'react'
import type { MasterItem } from '../types/domain'
import { ImageSlot } from './ImageSlot'
import { Modal } from './Modal'

interface Props<T extends MasterItem> {
  title: string
  items: T[]
  /** Selected ids. Single mode closes on pick. */
  selected: string[]
  multiple?: boolean
  max?: number
  disabledIds?: string[]
  round?: boolean
  subtitle?: (item: T) => string | undefined
  onChange: (ids: string[]) => void
  onClose: () => void
  /** Shows a "remove" action, e.g. to empty a formation slot. */
  onClear?: () => void
}

/** Searchable image grid for picking master data (by name or alias). Inactive items are hidden. */
export function Picker<T extends MasterItem>({
  title,
  items,
  selected,
  multiple,
  max,
  disabledIds = [],
  round,
  subtitle,
  onChange,
  onClose,
  onClear,
}: Props<T>) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter(
      (i) =>
        (i.active || selected.includes(i.id)) &&
        (!s || i.name.toLowerCase().includes(s) || i.aliases.some((a) => a.toLowerCase().includes(s))),
    )
  }, [items, q, selected])

  const toggle = (id: string) => {
    if (!multiple) {
      onChange([id])
      onClose()
      return
    }
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else if (!max || selected.length < max) onChange([...selected, id])
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        (multiple || onClear) && (
          <>
            {onClear && (
              <button
                className="btn btn-danger"
                onClick={() => {
                  onClear()
                  onClose()
                }}
              >
                เอาออก
              </button>
            )}
            {multiple && (
              <button className="btn btn-primary" onClick={onClose}>
                เสร็จ ({selected.length}
                {max ? `/${max}` : ''})
              </button>
            )}
          </>
        )
      }
    >
      <label className="field">
        <span className="sr-only">ค้นหา</span>
        <input className="input" autoFocus placeholder="ค้นหาชื่อ…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="picker-grid">
        {filtered.map((i) => {
          const isSel = selected.includes(i.id)
          const disabled = !isSel && disabledIds.includes(i.id)
          return (
            <button
              key={i.id}
              className="picker-item"
              aria-pressed={isSel}
              disabled={disabled}
              onClick={() => toggle(i.id)}
            >
              <ImageSlot item={i} size={52} round={round} showTitle={false} />
              <span>{i.name}</span>
              {subtitle?.(i) && <span className="faint small">{subtitle(i)}</span>}
            </button>
          )
        })}
        {filtered.length === 0 && <p className="muted">ไม่พบรายการ</p>}
      </div>
    </Modal>
  )
}
