import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ title, onClose, children, footer, wide }: Props) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  // Runs once per open: parents usually pass an inline onClose, which must not refocus.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus()
    }
  }, [])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={wide ? { maxWidth: 760 } : undefined}
      >
        <div className="row between">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" aria-label="ปิด" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {children}
        {footer && <div className="row wrap" style={{ justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  )
}
