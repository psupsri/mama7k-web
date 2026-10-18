import type { CSSProperties } from 'react'

/** Typed helper for setting CSS custom properties inline, e.g. vars({ '--min': '300px' }). */
export function vars(v: Record<`--${string}`, string>, extra?: CSSProperties): CSSProperties {
  return { ...(v as CSSProperties), ...extra }
}
