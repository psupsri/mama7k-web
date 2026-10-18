import type {
  BuildDetail,
  BuildListPage,
  BuildSummary,
  CharacterRecommendation,
  FormationType,
  OffenseBuild,
  Placement,
  SkillRef,
  SpeedRule,
  Visibility,
} from '../types/domain'
import { http } from './client'

export type BuildSort = 'WIN14' | 'VOTES' | 'NEWEST'

export interface BuildListQuery {
  enemyPetId?: string | null
  sort?: BuildSort
  page?: number // 1-based
  pageSize?: number
}

export const DEFAULT_PAGE_SIZE = 9 // 3 rows of 3 cards: one screen on a laptop

export const listBuildsForLineup = (lineupId: string, q: BuildListQuery = {}) =>
  http.get<BuildListPage>(`/lineups/${lineupId}/builds`, {
    enemyPet: q.enemyPetId,
    sort: q.sort,
    page: q.page,
    pageSize: q.pageSize,
  })

export const listMyBuilds = () => http.get<(BuildSummary & { lineupId: string })[]>('/me/builds')

export const getBuild = (id: string) => http.get<BuildDetail>(`/builds/${id}`)

export interface BuildInput {
  lineupId: string
  description: string
  visibility: Visibility
  groupIds: string[]
  counterPets: string[]
  formation: FormationType
  placements: Placement[]
  ownPets: string[]
  skillOrder: SkillRef[]
  speed: SpeedRule
  recommendations: CharacterRecommendation[]
}

export const createBuild = (input: BuildInput) => http.post<OffenseBuild>('/builds', input)

export const updateBuild = (id: string, input: BuildInput) => http.put<OffenseBuild>(`/builds/${id}`, input)

/** Votes and shares go with the build (FR 4.7). */
export const deleteBuild = (id: string) => http.del(`/builds/${id}`)
