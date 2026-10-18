import type { DefenseLineup, FormationType, LineupSummary, Placement } from '../types/domain'
import { http } from './client'

export interface LineupQuery {
  characterIds?: string[] // all must appear in the lineup
}

export const listLineups = (q: LineupQuery = {}) =>
  http.get<LineupSummary[]>('/lineups', { characters: (q.characterIds ?? []).join(',') })

export const getLineup = (id: string) => http.get<DefenseLineup>(`/lineups/${id}`)

/** Creates a lineup, or returns the existing one when it is a duplicate (FR 3.2). */
export const createLineup = (formation: FormationType, placements: Placement[]) =>
  http.post<{ lineup: DefenseLineup; existed: boolean }>('/lineups', { formation, placements })
