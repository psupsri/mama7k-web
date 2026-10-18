import type { BattleResult, EquipLevel, Vote } from '../types/domain'
import { http } from './client'

/** Creates or replaces the viewer's single vote on a build (FR 6.2). */
export const castVote = (buildId: string, result: BattleResult, equipLevel: EquipLevel) =>
  http.put<Vote>(`/builds/${buildId}/vote`, { result, equipLevel })

export const cancelVote = (buildId: string) => http.del(`/builds/${buildId}/vote`)
