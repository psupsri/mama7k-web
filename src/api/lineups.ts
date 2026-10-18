import { db, nextId } from '../mock/db'
import { lineupKey, rowSize } from '../lib/formation'
import type { DefenseLineup, FormationType, LineupSummary, Placement } from '../types/domain'
import { ApiError, canView, requireVerified, respond, viewer } from './internal'

export interface LineupQuery {
  characterIds?: string[] // all must appear in the lineup
}

export function listLineups(q: LineupQuery = {}) {
  return respond<LineupSummary[]>(() => {
    const u = viewer()
    const ids = q.characterIds ?? []
    return db.lineups
      .filter((l) => ids.every((id) => l.placements.some((p) => p.characterId === id)))
      .map((lineup) => ({
        lineup,
        // Counts only builds this viewer may see (FR 4.6).
        visibleBuildCount: db.builds.filter((b) => b.lineupId === lineup.id && canView(u, b)).length,
      }))
      .sort((a, b) => b.visibleBuildCount - a.visibleBuildCount || b.lineup.createdAt.localeCompare(a.lineup.createdAt))
  })
}

export function getLineup(id: string) {
  return respond(() => {
    const l = db.lineups.find((x) => x.id === id)
    if (!l) throw new ApiError('NOT_FOUND', 'ไม่พบบ้านศัตรู')
    return l
  })
}

export function validatePlacements(formation: FormationType, placements: Placement[]) {
  if (placements.length !== 3) throw new ApiError('VALIDATION', 'ต้องมีตัวละคร 3 ตัว')
  const chars = new Set(placements.map((p) => p.characterId))
  if (chars.size !== 3) throw new ApiError('VALIDATION', 'ตัวละครซ้ำกันไม่ได้')
  const slots = new Set(placements.map((p) => `${p.row}:${p.slot}`))
  if (slots.size !== 3) throw new ApiError('VALIDATION', 'ตำแหน่งซ้ำกัน')
  for (const p of placements) {
    if (p.slot < 0 || p.slot >= rowSize(formation, p.row)) throw new ApiError('VALIDATION', 'ตำแหน่งไม่อยู่ใน Formation')
    if (!db.characters.some((c) => c.id === p.characterId)) throw new ApiError('VALIDATION', 'ไม่พบตัวละคร')
  }
}

/** Creates a lineup, or returns the existing one when it is a duplicate (FR 3.2). */
export function createLineup(formation: FormationType, placements: Placement[]) {
  return respond<{ lineup: DefenseLineup; existed: boolean }>(() => {
    const u = requireVerified()
    validatePlacements(formation, placements)
    for (const p of placements) {
      if (!db.characters.find((c) => c.id === p.characterId)!.active) throw new ApiError('VALIDATION', 'มีตัวละครที่ปิดใช้งานแล้ว')
    }
    const key = lineupKey(formation, placements)
    const existing = db.lineups.find((l) => lineupKey(l.formation, l.placements) === key)
    if (existing) return { lineup: existing, existed: true }
    const lineup: DefenseLineup = {
      id: nextId('l'),
      formation,
      placements,
      createdBy: u.id,
      createdAt: new Date().toISOString(),
    }
    db.lineups.push(lineup)
    return { lineup, existed: false }
  }, true)
}
