import type { FormationType, Placement, Row, SkillRef, SkillSlot } from '../types/domain'

export const FORMATIONS: { type: FormationType; front: number; back: number; label: string }[] = [
  { type: 'F3B2', front: 3, back: 2, label: 'หน้า 3 / หลัง 2' },
  { type: 'F2B3', front: 2, back: 3, label: 'หน้า 2 / หลัง 3' },
  { type: 'F1B4', front: 1, back: 4, label: 'หน้า 1 / หลัง 4' },
  { type: 'F4B1', front: 4, back: 1, label: 'หน้า 4 / หลัง 1' },
]

export function formationInfo(type: FormationType) {
  return FORMATIONS.find((f) => f.type === type)!
}

export function rowSize(type: FormationType, row: Row) {
  const f = formationInfo(type)
  return row === 'FRONT' ? f.front : f.back
}

export const ROW_LABEL: Record<Row, string> = { FRONT: 'หน้า', BACK: 'หลัง' }

/** Drops placements that no longer fit after the formation changes. */
export function fitPlacements(type: FormationType, placements: Placement[]): Placement[] {
  return placements.filter((p) => p.slot < rowSize(type, p.row))
}

/**
 * Canonical key used for duplicate detection of defense lineups.
 * Same formation + same set of characters per row; order within a row is ignored.
 */
export function lineupKey(type: FormationType, placements: Placement[]): string {
  const ids = (row: Row) =>
    placements
      .filter((p) => p.row === row)
      .map((p) => p.characterId)
      .sort()
      .join(',')
  return `${type}|F:${ids('FRONT')}|B:${ids('BACK')}`
}

/** Back row first: it is drawn on top, as on the in-game screen. */
export const ROWS: Row[] = ['BACK', 'FRONT']

/** 1-based reservation order of a character's upper/lower skill, or 0 when not reserved. */
export function skillOrderOf(order: SkillRef[], characterId: string, slot: SkillSlot) {
  return order.findIndex((s) => s.characterId === characterId && s.slot === slot) + 1
}

export const SKILL_LABEL: Record<SkillSlot, string> = { 1: 'สกิลบน', 2: 'สกิลล่าง' }

/** Placements in reading order: back row first, then left to right. */
export function orderedPlacements(placements: Placement[]) {
  return [...placements].sort((a, b) => (a.row === 'BACK' ? 0 : 1) - (b.row === 'BACK' ? 0 : 1) || a.slot - b.slot)
}

/** A build has no name; it is identified by its team, e.g. "ยุนกอน · สกัล · โดยอง". */
export function teamTitle(placements: Placement[], characters: Record<string, { nameTh: string }> | undefined) {
  return orderedPlacements(placements)
    .map((p) => characters?.[p.characterId]?.nameTh ?? '?')
    .join(' · ')
}
