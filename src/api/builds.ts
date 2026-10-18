import { db, nextId } from '../mock/db'
import type {
  BuildDetail,
  BuildListPage,
  BuildSummary,
  CharacterRecommendation,
  FormationType,
  OffenseBuild,
  Placement,
  SpeedRule,
  Visibility,
} from '../types/domain'
import {
  ApiError,
  buildVotes,
  canView,
  computeStats,
  findBuildOr404,
  isMember,
  requireUser,
  requireVerified,
  respond,
  toSummary,
  viewer,
} from './internal'
import { validatePlacements } from './lineups'

export type BuildSort = 'WIN14' | 'VOTES' | 'NEWEST'

export interface BuildListQuery {
  enemyPetId?: string | null
  sort?: BuildSort
  page?: number // 1-based
  pageSize?: number
}

export const DEFAULT_PAGE_SIZE = 9 // 3 rows of 3 cards: one screen on a laptop
const MAX_PAGE_SIZE = 50

function sortSummaries(list: BuildSummary[], sort: BuildSort) {
  const pct = (s: BuildSummary) => s.stats14.overallWinPct ?? -1
  return list.sort((a, b) => {
    if (sort === 'VOTES') return b.stats14.total - a.stats14.total
    if (sort === 'NEWEST') return b.build.createdAt.localeCompare(a.build.createdAt)
    return pct(b) - pct(a) || b.stats14.total - a.stats14.total
  })
}

export function listBuildsForLineup(lineupId: string, q: BuildListQuery = {}) {
  return respond<BuildListPage>(() => {
    const u = viewer()
    const visible = db.builds.filter((b) => b.lineupId === lineupId && canView(u, b))
    const counterPets = [...new Set(visible.flatMap((b) => b.counterPets))].sort()
    const list = visible
      // A build with no counter pets works against any enemy pet (FR 4.2).
      .filter((b) => !q.enemyPetId || b.counterPets.length === 0 || b.counterPets.includes(q.enemyPetId))
      .map((b) => toSummary(u, b))
    sortSummaries(list, q.sort ?? 'WIN14')
    const pageSize = Math.min(Math.max(1, q.pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
    const page = Math.max(1, q.page ?? 1)
    return {
      items: list.slice((page - 1) * pageSize, page * pageSize),
      total: list.length,
      page,
      pageSize,
      counterPets,
    }
  })
}

export function listMyBuilds() {
  return respond<(BuildSummary & { lineupId: string })[]>(() => {
    const u = requireUser()
    return db.builds
      .filter((b) => b.creatorId === u.id)
      .map((b) => ({ ...toSummary(u, b), lineupId: b.lineupId }))
      .sort((a, b) => b.build.updatedAt.localeCompare(a.build.updatedAt))
  })
}

export function getBuild(id: string) {
  return respond<BuildDetail>(() => {
    const u = viewer()
    const b = findBuildOr404(u, id)
    const votes = buildVotes(b.id)
    return {
      ...toSummary(u, b),
      lineup: db.lineups.find((l) => l.id === b.lineupId)!,
      statsAll: computeStats(votes, 'ALL'),
      myVote: u ? (votes.find((v) => v.userId === u.id) ?? null) : null,
      canEdit: !!u && b.creatorId === u.id && !b.creatorDeleted,
      canVote: !!u && u.emailVerified,
    }
  })
}

export interface BuildInput {
  lineupId: string
  description: string
  visibility: Visibility
  groupIds: string[]
  counterPets: string[]
  formation: FormationType
  placements: Placement[]
  ownPets: string[]
  skillOrder: string[]
  speed: SpeedRule
  recommendations: CharacterRecommendation[]
}

function validate(userId: string, input: BuildInput) {
  if (input.description.length > 2000) throw new ApiError('VALIDATION', 'คำอธิบายยาวเกิน 2000 ตัวอักษร')
  if (!db.lineups.some((l) => l.id === input.lineupId)) throw new ApiError('VALIDATION', 'ไม่พบบ้านศัตรู')
  validatePlacements(input.formation, input.placements)
  const placed = input.placements.map((p) => p.characterId)

  if (input.skillOrder.length > 3) throw new ApiError('VALIDATION', 'ลำดับสกิลได้สูงสุด 3')
  for (const sid of input.skillOrder) {
    const skill = db.skills.find((s) => s.id === sid)
    if (!skill || !placed.includes(skill.characterId)) throw new ApiError('VALIDATION', 'สกิลต้องเป็นของตัวละครในทีม')
  }
  if (new Set(input.ownPets).size !== input.ownPets.length) throw new ApiError('VALIDATION', 'Pet ซ้ำกัน')
  if (new Set(input.counterPets).size !== input.counterPets.length) throw new ApiError('VALIDATION', 'Pet ศัตรูซ้ำกัน')
  if (input.speed?.kind === 'MIN' && !(input.speed.value > 0)) throw new ApiError('VALIDATION', 'ค่า Speed ต้องมากกว่า 0')

  const recChars = input.recommendations.map((r) => r.characterId).sort().join()
  if (recChars !== [...placed].sort().join()) throw new ApiError('VALIDATION', 'คำแนะนำต้องครบทุกตัวละคร')
  for (const r of input.recommendations) {
    if (r.stats.length > 4) throw new ApiError('VALIDATION', 'สเตตัสได้สูงสุด 4 ตัวต่อตัวละคร')
    if (new Set(r.stats.map((s) => s.statId)).size !== r.stats.length) throw new ApiError('VALIDATION', 'สเตตัสซ้ำกัน')
    if (new Set(r.sets).size !== r.sets.length) throw new ApiError('VALIDATION', 'เซ็ตซ้ำกัน')
    for (const ring of r.rings) {
      if (ring.stack && ring.stack.ringId === ring.ringId) throw new ApiError('VALIDATION', 'ซ้อนแหวนวงเดียวกันไม่ได้')
      if (r.ringStackRequired && !ring.stack) throw new ApiError('VALIDATION', 'ตัวเลือกแหวนทุกตัวต้องมีแหวนซ้อน')
    }
  }
  if (input.visibility === 'GROUP') {
    if (input.groupIds.length === 0) throw new ApiError('VALIDATION', 'เลือกอย่างน้อย 1 Group')
    for (const gid of input.groupIds) {
      if (!isMember(userId, gid)) throw new ApiError('VALIDATION', 'แชร์ได้เฉพาะ Group ที่คุณเป็นสมาชิก')
    }
  }
}

export function createBuild(input: BuildInput) {
  return respond(() => {
    const u = requireVerified()
    validate(u.id, input)
    const now = new Date().toISOString()
    const b: OffenseBuild = {
      id: nextId('b'),
      lineupId: input.lineupId,
      description: input.description.trim(),
      creatorId: u.id,
      creatorDeleted: false,
      visibility: input.visibility,
      shares: input.visibility === 'GROUP' ? input.groupIds.map((groupId) => ({ groupId, hidden: false })) : [],
      adminHidden: false,
      counterPets: input.counterPets,
      formation: input.formation,
      placements: input.placements,
      ownPets: input.ownPets,
      skillOrder: input.skillOrder,
      speed: input.speed,
      recommendations: input.recommendations,
      createdAt: now,
      updatedAt: now,
    }
    db.builds.push(b)
    return b
  }, true)
}

export function updateBuild(id: string, input: BuildInput) {
  return respond(() => {
    const u = requireVerified()
    const b = findBuildOr404(u, id)
    if (b.creatorId !== u.id || b.creatorDeleted) throw new ApiError('FORBIDDEN', 'แก้ไขได้เฉพาะผู้สร้าง')
    if (input.lineupId !== b.lineupId) throw new ApiError('VALIDATION', 'เปลี่ยนบ้านศัตรูของ Build ไม่ได้')
    validate(u.id, input)

    // Changing visibility type ends all shares; adding/removing groups keeps the others' hidden flag (FR 4.5).
    if (input.visibility !== 'GROUP') b.shares = []
    else if (b.visibility !== 'GROUP') b.shares = input.groupIds.map((groupId) => ({ groupId, hidden: false }))
    else b.shares = input.groupIds.map((groupId) => b.shares.find((s) => s.groupId === groupId) ?? { groupId, hidden: false })

    Object.assign(b, {
      description: input.description.trim(),
      visibility: input.visibility,
      counterPets: input.counterPets,
      formation: input.formation,
      placements: input.placements,
      ownPets: input.ownPets,
      skillOrder: input.skillOrder,
      speed: input.speed,
      recommendations: input.recommendations,
      updatedAt: new Date().toISOString(),
    })
    return b
  }, true)
}

export function deleteBuild(id: string) {
  return respond(() => {
    const u = requireUser()
    const b = findBuildOr404(u, id)
    if (b.creatorId !== u.id || b.creatorDeleted) throw new ApiError('FORBIDDEN', 'ลบได้เฉพาะผู้สร้าง')
    db.builds = db.builds.filter((x) => x.id !== id)
    db.votes = db.votes.filter((v) => v.buildId !== id) // FR 4.7: votes go with the build
    return true
  }, true)
}
