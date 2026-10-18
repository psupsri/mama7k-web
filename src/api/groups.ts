import { db, nextId } from '../mock/db'
import type { Group, GroupDetail, GroupSummary } from '../types/domain'
import { ApiError, dropShare, isMember, randomCode, requireUser, respond, toSummary } from './internal'

function summary(g: Group, userId: string): GroupSummary {
  return {
    group: g,
    memberCount: db.members.filter((m) => m.groupId === g.id).length,
    isOwner: g.ownerId === userId,
  }
}

function findGroupAsMember(userId: string, groupId: string) {
  const g = db.groups.find((x) => x.id === groupId)
  if (!g || !isMember(userId, groupId)) throw new ApiError('NOT_FOUND', 'ไม่พบ Group')
  return g
}

function findGroupAsOwner(userId: string, groupId: string) {
  const g = findGroupAsMember(userId, groupId)
  if (g.ownerId !== userId) throw new ApiError('FORBIDDEN', 'เฉพาะ Group Owner')
  return g
}

/** A member leaving (or being removed) takes their builds' shares with that group along (FR 5.1). */
function removeMember(groupId: string, userId: string) {
  db.members = db.members.filter((m) => !(m.groupId === groupId && m.userId === userId))
  for (const b of db.builds) if (b.creatorId === userId) dropShare(b, groupId)
}

export function deleteGroupInternal(groupId: string) {
  for (const b of db.builds) dropShare(b, groupId)
  db.members = db.members.filter((m) => m.groupId !== groupId)
  db.groups = db.groups.filter((g) => g.id !== groupId)
}

export function listMyGroups() {
  return respond<GroupSummary[]>(() => {
    const u = requireUser()
    return db.groups.filter((g) => isMember(u.id, g.id)).map((g) => summary(g, u.id))
  })
}

export function getGroup(groupId: string) {
  return respond<GroupDetail>(() => {
    const u = requireUser()
    const g = findGroupAsMember(u.id, groupId)
    const isOwner = g.ownerId === u.id
    const members = db.members
      .filter((m) => m.groupId === g.id)
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
      .map((m) => {
        const user = db.users.find((x) => x.id === m.userId)!
        return { user: { id: user.id, displayName: user.displayName }, joinedAt: m.joinedAt, isOwner: m.userId === g.ownerId }
      })
    const builds = db.builds
      .filter((b) => b.visibility === 'GROUP')
      .flatMap((b) => {
        const share = b.shares.find((s) => s.groupId === g.id)
        if (!share) return []
        // Hidden builds: only the owner (to unhide) and the creator still see them here.
        if (share.hidden && !isOwner && b.creatorId !== u.id) return []
        return [{ summary: toSummary(u, b), hidden: share.hidden }]
      })
    return { ...summary(g, u.id), members, builds }
  })
}

export function createGroup(name: string) {
  return respond(() => {
    const u = requireUser()
    if (!name.trim()) throw new ApiError('VALIDATION', 'กรุณาใส่ชื่อ Group')
    const now = new Date().toISOString()
    const g: Group = { id: nextId('g'), name: name.trim(), ownerId: u.id, inviteCode: randomCode(), createdAt: now }
    db.groups.push(g)
    db.members.push({ groupId: g.id, userId: u.id, joinedAt: now })
    return g
  }, true)
}

export function joinGroup(code: string) {
  return respond(() => {
    const u = requireUser()
    const g = db.groups.find((x) => x.inviteCode === code.trim().toUpperCase())
    if (!g) throw new ApiError('NOT_FOUND', 'Invite Code ไม่ถูกต้องหรือหมดอายุ')
    if (!isMember(u.id, g.id)) db.members.push({ groupId: g.id, userId: u.id, joinedAt: new Date().toISOString() })
    return g
  }, true)
}

export function leaveGroup(groupId: string) {
  return respond(() => {
    const u = requireUser()
    const g = findGroupAsMember(u.id, groupId)
    if (g.ownerId === u.id) throw new ApiError('OWNER_MUST_TRANSFER', 'โอนสิทธิ์ Owner ก่อนออกจาก Group หรือลบ Group แทน')
    removeMember(groupId, u.id)
    return true
  }, true)
}

export function kickMember(groupId: string, userId: string) {
  return respond(() => {
    const u = requireUser()
    findGroupAsOwner(u.id, groupId)
    if (userId === u.id) throw new ApiError('VALIDATION', 'kick ตัวเองไม่ได้')
    removeMember(groupId, userId)
    return true
  }, true)
}

export function transferOwner(groupId: string, userId: string) {
  return respond(() => {
    const u = requireUser()
    const g = findGroupAsOwner(u.id, groupId)
    if (!isMember(userId, groupId)) throw new ApiError('VALIDATION', 'ต้องโอนให้สมาชิกใน Group')
    g.ownerId = userId
    return true
  }, true)
}

export function regenerateInvite(groupId: string) {
  return respond(() => {
    const u = requireUser()
    const g = findGroupAsOwner(u.id, groupId)
    g.inviteCode = randomCode()
    return g.inviteCode
  }, true)
}

export function renameGroup(groupId: string, name: string) {
  return respond(() => {
    const u = requireUser()
    const g = findGroupAsOwner(u.id, groupId)
    if (!name.trim()) throw new ApiError('VALIDATION', 'กรุณาใส่ชื่อ Group')
    g.name = name.trim()
    return g
  }, true)
}

export function deleteGroup(groupId: string) {
  return respond(() => {
    const u = requireUser()
    findGroupAsOwner(u.id, groupId)
    deleteGroupInternal(groupId)
    return true
  }, true)
}

export function setBuildHidden(groupId: string, buildId: string, hidden: boolean) {
  return respond(() => {
    const u = requireUser()
    findGroupAsOwner(u.id, groupId)
    const share = db.builds.find((b) => b.id === buildId)?.shares.find((s) => s.groupId === groupId)
    if (!share) throw new ApiError('NOT_FOUND', 'ไม่พบ Build ใน Group นี้')
    share.hidden = hidden
    return true
  }, true)
}
