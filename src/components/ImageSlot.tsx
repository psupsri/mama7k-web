import { useState } from 'react'
import type { MasterItem } from '../types/domain'

interface Props {
  item?: Pick<MasterItem, 'nameTh' | 'image'>
  size?: number
  round?: boolean
  ring?: string // outline color, e.g. primary pet or enemy pet
  dim?: boolean
  showTitle?: boolean
}

/**
 * Displays a master-data image. Falls back to the first letter of the name at the same
 * size, so layouts do not shift before images are uploaded (FR 9.4).
 */
export function ImageSlot({ item, size = 40, round = false, ring, dim, showTitle = true }: Props) {
  const [broken, setBroken] = useState(false)
  const name = item?.nameTh ?? '?'
  const hasImage = !!item?.image && !broken
  const radius = round ? size / 2 : Math.max(6, Math.round(size * 0.26))
  return (
    <span
      className={`img-slot${hasImage ? '' : ' fallback'}`}
      title={showTitle ? name : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: Math.max(10, Math.round(size * 0.4)),
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
        opacity: dim ? 0.5 : undefined,
      }}
    >
      {hasImage ? (
        <img src={item!.image} alt={name} loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span aria-hidden="true">{Array.from(name)[0]}</span>
      )}
      {!hasImage && <span className="sr-only">{name}</span>}
    </span>
  )
}
