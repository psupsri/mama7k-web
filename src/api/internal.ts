// Helpers shared by the mock API modules. Everything in here represents logic the Go
// backend owns (auth, access control, aggregation); the UI must never import this file.
import { db, getSessionUserId, persist, setSessionUserId } from '../mock/db'
import { EQUIP_LEVELS } from '../lib/labels'
import type {
  BuildStats,
  BuildSummary,
  OffenseBuild,
  StatsWindow,
  User,
  Vote,
} from '../types/domain'

export class ApiError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 150

/** Simulates a network round trip and persists any mutation the handler made. */
export async function respond<T>(fn: () => T, mutates = false): Promise<T> {
  await new Promise((r) => setTimeout(r, LATENCY_MS))
  const result = fn()
  if (mutates) persist()
  // Return copies so callers cannot mutate the mock DB by accident.
  return structuredClone(result)
}

export function viewer(): User | null {
  const id = getSessionUserId()
  if (!id) return null
  const user = db.users.find((u) => u.id === id)
  if (!user || user.deleted || user.suspended) {
    setSessionUserId(null)
    return null
  }
  return user
}

export function requireUser(): User {
  const u = viewer()
  if (!u) throw new ApiError('UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ')
  return u
}

export function requireVerified(): User {
  const u = requireUser()
  if (!u.emailVerified) throw new ApiError('EMAIL_NOT_VERIFIED', 'กรุณายืนยันอีเมลก่อน')
  return u
}

export function requireAdmin(superOnly = false): User {
  const u = requireUser()
  const ok = superOnly ? u.role === 'SUPER_ADMIN' : u.role !== 'USER'
  if (!ok) throw new ApiError('FORBIDDEN', 'ไม่มีสิทธิ์')
  return u
}

export function isAdmin(u: User | null) {
  return !!u && u.role !== 'USER'
}

export function isMember(userId: string, groupId: string) {
  return db.members.some((m) => m.userId === userId && m.groupId === groupId)
}

export function audit(actorId: string, action: string, target: string) {
  db.auditLog.unshift({ id: `a${db.auditLog.length + 1}`, actorId, action, target, at: new Date().toISOString() })
}

/**
 * Build access rule (FR 4.6):
 * public, or the viewer is the creator, or the viewer belongs to a group the build is
 * shared with and that group has not hidden it. Orphaned builds are visible to nobody.
 */
export function canView(u: User | null, b: OffenseBuild): boolean {
  if (b.creatorDeleted && b.visibility !== 'PUBLIC') return false
  if (b.adminHidden) return !!u && (u.id === b.creatorId || isAdmin(u))
  if (b.visibility === 'PUBLIC') return true
  if (!u) return false
  if (b.creatorId === u.id) return true
  if (b.visibility === 'GROUP') return b.shares.some((s) => !s.hidden && isMember(u.id, s.groupId))
  return false
}

export function findBuildOr404(u: User | null, id: string): OffenseBuild {
  const b = db.builds.find((x) => x.id === id)
  // Inaccessible builds look exactly like missing ones (FR 4.6: do not reveal existence).
  if (!b || !canView(u, b)) throw new ApiError('NOT_FOUND', 'ไม่พบ Build')
  return b
}

const DAY = 24 * 60 * 60 * 1000

export function computeStats(votes: Vote[], window: StatsWindow, now = Date.now()): BuildStats {
  const inWindow = window === 'ALL' ? votes : votes.filter((v) => now - Date.parse(v.votedAt) <= 14 * DAY)
  const levels = EQUIP_LEVELS.map((level) => {
    const vs = inWindow.filter((v) => v.equipLevel === level)
    const win = vs.filter((v) => v.result === 'WIN').length
    const total = vs.length
    return { level, win, loss: total - win, total, winPct: total ? (win / total) * 100 : null }
  })
  const total = inWindow.length
  const wins = inWindow.filter((v) => v.result === 'WIN').length
  return { window, levels, total, overallWinPct: total ? (wins / total) * 100 : null }
}

export function buildVotes(buildId: string) {
  return db.votes.filter((v) => v.buildId === buildId)
}

export function displayName(userId: string | null) {
  if (!userId) return 'Deleted user'
  return db.users.find((u) => u.id === userId)?.displayName ?? 'Deleted user'
}

export function toSummary(u: User | null, b: OffenseBuild): BuildSummary {
  const isMine = !!u && b.creatorId === u.id
  const visibleShares = isMine ? b.shares : b.shares.filter((s) => !s.hidden && !!u && isMember(u.id, s.groupId))
  return {
    build: b,
    creatorName: displayName(b.creatorId),
    groupNames: visibleShares.map((s) => db.groups.find((g) => g.id === s.groupId)?.name ?? '?'),
    stats14: computeStats(buildVotes(b.id), 'D14'),
    isMine,
  }
}

/** Removes a group share from a build; a group build left with no groups becomes private. */
export function dropShare(b: OffenseBuild, groupId: string) {
  b.shares = b.shares.filter((s) => s.groupId !== groupId)
  if (b.visibility === 'GROUP' && b.shares.length === 0) b.visibility = 'PRIVATE'
}

export function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
