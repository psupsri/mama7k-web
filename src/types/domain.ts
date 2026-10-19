// Domain types as the Go API returns them (api/internal/app/domain.go). Keep the two in sync.

export type ID = string

// ---------- Master data ----------

export interface MasterItem {
  /** Running number per type ("12"), assigned once and never changed. */
  id: ID
  /** Thai community name, shown to users. */
  nameTh: string
  /** English name, also matched by search. May be empty. */
  nameEn: string
  image?: string
  active: boolean
}

export type Character = MasterItem

export type SkillSlot = 1 | 2 // 1 = upper skill, 2 = lower skill (as stacked in-game)

/** A reserved skill. Skills are not master data: every character has an upper and a lower one. */
export interface SkillRef {
  characterId: ID
  slot: SkillSlot
}

export type Pet = MasterItem

export type EquipmentSet = MasterItem
export type Ring = MasterItem
export type StatType = MasterItem

export interface MasterData {
  characters: Character[]
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
  username: string
  displayName: string
  role: UserRole
  suspended: boolean
  deleted: boolean
  /** Set after a Super Admin resets the password; the web asks for a new one first. */
  mustChangePassword: boolean
}

export interface Group {
  id: ID
  name: string
  ownerId: ID
  inviteCode: string
  createdAt: string
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

/** Speed compared with the enemy (kind omitted = not specified) plus a free-text note. */
export type SpeedRule = { kind?: 'FASTER' | 'SLOWER'; note?: string } | null

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
  skillOrder: SkillRef[] // index 0 = order 1, max 3
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

// ---------- feedback ----------

export type FeedbackKind = 'BUG' | 'IDEA' | 'DATA' | 'OTHER'

export interface Feedback {
  id: ID
  kind: FeedbackKind
  message: string
  contact: string
  page: string // path the sender was on
  user: { id: ID; username: string; displayName: string } | null // null = guest
  createdAt: string
  resolvedAt: string | null
}
