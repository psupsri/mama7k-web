// Domain types shared by the UI and the mock API layer.
// These mirror what the Go API will return, so the UI should not need to change
// when the mock layer is swapped for real HTTP calls.

export type ID = string

// ---------- Master data ----------

export interface MasterItem {
  id: ID
  code: string
  name: string
  aliases: string[]
  image?: string
  active: boolean
}

export type Character = MasterItem

export type SkillSlot = 1 | 2 // 1 = upper skill, 2 = lower skill (as stacked in-game)

export interface Skill extends MasterItem {
  characterId: ID
  slot: SkillSlot
}

export type Pet = MasterItem

export interface EquipmentSet extends MasterItem {
  effect2: string
  effect4: string
}

export type RingRarity = 'LEGENDARY' | 'RARE' | 'UNCOMMON' | 'COMMON'

export interface Ring extends MasterItem {
  rarity: RingRarity
  effect: string
}

export interface StatType extends MasterItem {
  unit: 'PERCENT' | 'NUMBER'
}

export interface MasterData {
  characters: Character[]
  skills: Skill[]
  pets: Pet[]
  sets: EquipmentSet[]
  rings: Ring[]
  stats: StatType[]
}

// ---------- Formation ----------

export type FormationType = 'F3B2' | 'F2B3' | 'F1B4' | 'F4B1'
export type Row = 'FRONT' | 'BACK'

export interface Placement {
  characterId: ID
  row: Row
  slot: number // 0-based index within the row
}

// ---------- Users / groups ----------

export type UserRole = 'USER' | 'MODERATOR' | 'SUPER_ADMIN'

export interface User {
  id: ID
  email: string
  displayName: string
  role: UserRole
  suspended: boolean
  deleted: boolean
  emailVerified: boolean
}

export interface Group {
  id: ID
  name: string
  ownerId: ID
  inviteCode: string
  createdAt: string
}

export interface GroupMember {
  groupId: ID
  userId: ID
  joinedAt: string
}

// ---------- Defense lineup ----------

export interface DefenseLineup {
  id: ID
  formation: FormationType
  placements: Placement[]
  createdBy: ID | null
  createdAt: string
}

// ---------- Offense build ----------

export type Visibility = 'PUBLIC' | 'GROUP' | 'PRIVATE'

export type Star = 4 | 5 | 6

export interface RingOption {
  ringId: ID
  star: Star
  stack?: { ringId: ID; star?: Star }
}

export interface StatTarget {
  statId: ID
  value?: number // undefined = "เน้น" (focus, no number)
}

export interface CharacterRecommendation {
  characterId: ID
  sets: ID[] // first = primary
  stats: StatTarget[] // max 4
  rings: RingOption[] // first = primary; empty = any ring
  ringStackRequired: boolean
  note: string
}

export type SpeedRule = { kind: 'FASTER' } | { kind: 'MIN'; value: number } | null

export interface BuildShare {
  groupId: ID
  hidden: boolean
}

export interface OffenseBuild {
  id: ID
  lineupId: ID
  description: string
  creatorId: ID | null // null once the creator deleted their account
  creatorDeleted: boolean
  visibility: Visibility
  shares: BuildShare[]
  adminHidden: boolean
  counterPets: ID[]
  formation: FormationType
  placements: Placement[]
  ownPets: ID[] // first = primary
  skillOrder: ID[] // skill ids, index 0 = order 1, max 3
  speed: SpeedRule
  recommendations: CharacterRecommendation[]
  createdAt: string
  updatedAt: string
}

// ---------- Votes ----------

export type BattleResult = 'WIN' | 'LOSS'
export type EquipLevel = 'EXACT_EQUIPMENT' | 'SAME_SET_DIFFERENT_SUBSTATS' | 'CHARACTERS_ONLY'

export interface Vote {
  id: ID
  buildId: ID
  userId: ID | null // null = anonymised (voter deleted account)
  result: BattleResult
  equipLevel: EquipLevel
  votedAt: string
}

export type StatsWindow = 'ALL' | 'D14'

export interface LevelStats {
  level: EquipLevel
  win: number
  loss: number
  total: number
  winPct: number | null // null = N/A
}

export interface BuildStats {
  window: StatsWindow
  levels: LevelStats[]
  total: number
  overallWinPct: number | null
}

// ---------- View models returned by the API ----------

export interface BuildSummary {
  build: OffenseBuild
  creatorName: string
  groupNames: string[] // only groups the viewer can see
  stats14: BuildStats
  isMine: boolean
}

export interface Page<T> {
  items: T[]
  total: number
  page: number // 1-based
  pageSize: number
}

export interface BuildListPage extends Page<BuildSummary> {
  /** Enemy pets countered by any build the viewer can see here (for the filter chips). */
  counterPets: ID[]
}

export interface BuildDetail extends BuildSummary {
  lineup: DefenseLineup
  statsAll: BuildStats
  myVote: Vote | null
  canEdit: boolean
  canVote: boolean
}

export interface LineupSummary {
  lineup: DefenseLineup
  visibleBuildCount: number
}

export interface GroupSummary {
  group: Group
  memberCount: number
  isOwner: boolean
}

export interface GroupDetail extends GroupSummary {
  members: { user: Pick<User, 'id' | 'displayName'>; joinedAt: string; isOwner: boolean }[]
  builds: { summary: BuildSummary; hidden: boolean }[]
}
