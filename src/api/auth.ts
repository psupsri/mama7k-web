import { db, nextId, setSessionUserId } from '../mock/db'
import type { User } from '../types/domain'
import { ApiError, canView, displayName, requireUser, respond, viewer } from './internal'
import { teamTitle } from '../lib/formation'
import { deleteGroupInternal } from './groups'

export function me() {
  return respond(() => viewer())
}

export function login(email: string, password: string) {
  return respond(() => {
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && !u.deleted)
    if (!user || !password) throw new ApiError('INVALID_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    if (user.suspended) throw new ApiError('SUSPENDED', 'บัญชีนี้ถูกระงับ')
    setSessionUserId(user.id)
    return user
  })
}

export function register(email: string, password: string, displayName: string) {
  return respond(() => {
    const e = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(e)) throw new ApiError('VALIDATION', 'อีเมลไม่ถูกต้อง')
    if (password.length < 8) throw new ApiError('VALIDATION', 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    if (!displayName.trim()) throw new ApiError('VALIDATION', 'กรุณาใส่ Display Name')
    if (db.users.some((u) => u.email === e && !u.deleted)) throw new ApiError('EMAIL_TAKEN', 'อีเมลนี้ถูกใช้แล้ว')
    const user: User = {
      id: nextId('u'),
      email: e,
      displayName: displayName.trim(),
      role: 'USER',
      suspended: false,
      deleted: false,
      emailVerified: false,
    }
    db.users.push(user)
    setSessionUserId(user.id)
    return user
  }, true)
}

/** Mock of clicking the link in the verification email. */
export function verifyEmail() {
  return respond(() => {
    const u = requireUser()
    db.users.find((x) => x.id === u.id)!.emailVerified = true
    return true
  }, true)
}

export function requestPasswordReset(email: string) {
  // Always succeeds so the response does not reveal whether the email exists.
  return respond(() => {
    void email
    return true
  })
}

export function logout() {
  return respond(() => {
    setSessionUserId(null)
    return true
  })
}

export function updateProfile(displayName: string) {
  return respond(() => {
    const u = requireUser()
    if (!displayName.trim()) throw new ApiError('VALIDATION', 'กรุณาใส่ Display Name')
    const row = db.users.find((x) => x.id === u.id)!
    row.displayName = displayName.trim()
    return row
  }, true)
}

/** FR 2.1 – account deletion. */
export function deleteAccount() {
  return respond(() => {
    const u = requireUser()
    // Builds stay; nobody can edit them. Group builds become private (= orphaned).
    for (const b of db.builds.filter((x) => x.creatorId === u.id)) {
      if (b.visibility === 'GROUP') {
        b.visibility = 'PRIVATE'
        b.shares = []
      }
      b.creatorDeleted = true
      b.creatorId = null
    }
    // Votes stay but are anonymised.
    for (const v of db.votes) if (v.userId === u.id) v.userId = null
    // Groups the user owns pass to the longest-standing member, or are deleted.
    for (const g of db.groups.filter((x) => x.ownerId === u.id)) {
      const next = db.members
        .filter((m) => m.groupId === g.id && m.userId !== u.id)
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))[0]
      if (next) g.ownerId = next.userId
      else deleteGroupInternal(g.id)
    }
    db.members = db.members.filter((m) => m.userId !== u.id)
    const row = db.users.find((x) => x.id === u.id)!
    row.deleted = true
    row.email = `deleted-${row.id}@invalid`
    row.displayName = 'Deleted user'
    setSessionUserId(null)
    return true
  }, true)
}

/** Dev-only helper behind the mock user switcher. Not part of the real API. */
export function devListUsers() {
  return respond(() => db.users.filter((u) => !u.deleted))
}

export function devSwitchUser(id: string | null) {
  return respond(() => {
    setSessionUserId(id)
    return true
  })
}

export interface VisibilityMatrix {
  viewers: { id: string | null; name: string; role: string; groups: { name: string; owner: boolean }[] }[]
  builds: {
    id: string
    title: string
    creatorName: string
    visibility: string
    shares: { groupName: string; hidden: boolean }[]
    visibleTo: (string | null)[] // viewer ids; null = guest
  }[]
}

/** Dev-only: who can see which build of a lineup, using the same canView rule as the app. */
export function devVisibilityMatrix(lineupId: string) {
  return respond<VisibilityMatrix>(() => {
    const chars = Object.fromEntries(db.characters.map((c) => [c.id, c]))
    const groupName = (id: string) => db.groups.find((g) => g.id === id)?.name ?? '?'
    const users = db.users.filter((u) => !u.deleted && !u.suspended)
    const viewers: VisibilityMatrix['viewers'] = [
      { id: null, name: 'Guest', role: 'ไม่ได้เข้าสู่ระบบ', groups: [] },
      ...users.map((u) => ({
        id: u.id,
        name: u.displayName,
        role: u.role,
        groups: db.members
          .filter((m) => m.userId === u.id)
          .map((m) => ({ name: groupName(m.groupId), owner: db.groups.find((g) => g.id === m.groupId)?.ownerId === u.id })),
      })),
    ]
    const builds = db.builds
      .filter((b) => b.lineupId === lineupId)
      .map((b) => ({
        id: b.id,
        title: teamTitle(b.placements, chars),
        creatorName: displayName(b.creatorId),
        visibility: b.visibility,
        shares: b.shares.map((s) => ({ groupName: groupName(s.groupId), hidden: s.hidden })),
        visibleTo: [null, ...users.map((u) => u.id)].filter((id) => canView(id ? users.find((u) => u.id === id)! : null, b)),
      }))
    return { viewers, builds }
  })
}
