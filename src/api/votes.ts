import { db, nextId } from '../mock/db'
import type { BattleResult, EquipLevel } from '../types/domain'
import { findBuildOr404, requireUser, requireVerified, respond } from './internal'

/** Creates or replaces the viewer's single vote on a build (FR 6.2). */
export function castVote(buildId: string, result: BattleResult, equipLevel: EquipLevel) {
  return respond(() => {
    const u = requireVerified()
    findBuildOr404(u, buildId)
    const existing = db.votes.find((v) => v.buildId === buildId && v.userId === u.id)
    const votedAt = new Date().toISOString()
    if (existing) {
      Object.assign(existing, { result, equipLevel, votedAt })
      return existing
    }
    const vote = { id: nextId('v'), buildId, userId: u.id, result, equipLevel, votedAt }
    db.votes.push(vote)
    return vote
  }, true)
}

export function cancelVote(buildId: string) {
  return respond(() => {
    const u = requireUser()
    findBuildOr404(u, buildId)
    db.votes = db.votes.filter((v) => !(v.buildId === buildId && v.userId === u.id))
    return true
  }, true)
}
