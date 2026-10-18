// Business-rule tests for the mock API. Each case maps to a section of the FR document,
// so the same cases can be ported to the Go API later.
import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetDb } from '../mock/db'
import * as admin from './admin'
import * as auth from './auth'
import * as builds from './builds'
import * as groups from './groups'
import * as lineups from './lineups'
import * as votes from './votes'
import type { BuildInput } from './builds'

const as = (userId: string | null) => auth.devSwitchUser(userId)
const ids = (list: { build: { id: string } }[]) => list.map((s) => s.build.id).sort()

function inputFrom(id: string, patch: Partial<BuildInput> = {}): BuildInput {
  const b = db.builds.find((x) => x.id === id)!
  return {
    lineupId: b.lineupId,
    description: b.description,
    visibility: b.visibility,
    groupIds: b.shares.map((s) => s.groupId),
    counterPets: b.counterPets,
    formation: b.formation,
    placements: b.placements,
    ownPets: b.ownPets,
    skillOrder: b.skillOrder,
    speed: b.speed,
    recommendations: b.recommendations,
    ...patch,
  }
}

beforeEach(async () => {
  resetDb()
  await as(null)
})

describe('FR 4.6 build access', () => {
  it('guest sees public builds only', async () => {
    expect(ids(await builds.listBuildsForLineup('l1'))).toEqual(['b1'])
  })

  it('members see their groups; creators see their own private builds', async () => {
    await as('u2') // member of g1; also creator of b8, which the g1 owner hid
    expect(ids(await builds.listBuildsForLineup('l1'))).toEqual(['b1', 'b2', 'b7', 'b8'])
    await as('u1') // member of g1 + g2, owns b4; b8 is hidden in g1
    expect(ids(await builds.listBuildsForLineup('l1'))).toEqual(['b1', 'b2', 'b3', 'b4', 'b7'])
    await as('u4') // outside every group
    expect(ids(await builds.listBuildsForLineup('l1'))).toEqual(['b1'])
  })

  it('a build hidden in one group stays visible through another group and to its creator', async () => {
    await as('u3') // only in g2, where b6 is hidden
    expect(ids(await builds.listBuildsForLineup('l2'))).toEqual(['b5'])
    await as('u2') // in g1, where b6 is shown
    expect(ids(await builds.listBuildsForLineup('l2'))).toContain('b6')
  })

  it('inaccessible builds look exactly like missing ones', async () => {
    await as('u4')
    await expect(builds.getBuild('b4')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(builds.getBuild('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('lineup build counts only include builds the viewer can see', async () => {
    const list = await lineups.listLineups()
    expect(list.find((l) => l.lineup.id === 'l1')!.visibleBuildCount).toBe(1)
  })
})

describe('FR 3.2 duplicate lineups', () => {
  it('ignores order within a row', async () => {
    await as('u2')
    const r = await lineups.createLineup('F4B1', [
      { characterId: 'char_hayeon', row: 'FRONT', slot: 0 },
      { characterId: 'char_lubu', row: 'FRONT', slot: 3 },
      { characterId: 'char_soran', row: 'BACK', slot: 0 },
    ])
    expect(r).toMatchObject({ existed: true, lineup: { id: 'l1' } })
  })

  it('treats a character in another row as a different lineup', async () => {
    await as('u2')
    const r = await lineups.createLineup('F3B2', [
      { characterId: 'char_lubu', row: 'FRONT', slot: 0 },
      { characterId: 'char_soran', row: 'FRONT', slot: 1 },
      { characterId: 'char_hayeon', row: 'BACK', slot: 0 },
    ])
    expect(r.existed).toBe(false)
  })
})

describe('FR 4.2 enemy pet filter', () => {
  it('includes builds that counter the pet and builds that counter any pet', async () => {
    await as('u1')
    expect(ids(await builds.listBuildsForLineup('l1', { enemyPetId: 'pet_yu' }))).toEqual(['b1', 'b2', 'b4'])
  })
})

describe('FR 6 votes', () => {
  it('keeps one vote per user, replaces on change, deletes on cancel', async () => {
    await as('u1')
    const before = db.votes.filter((v) => v.buildId === 'b1').length
    await votes.castVote('b1', 'WIN', 'EXACT_EQUIPMENT')
    await votes.castVote('b1', 'LOSS', 'CHARACTERS_ONLY')
    const mine = db.votes.filter((v) => v.buildId === 'b1' && v.userId === 'u1')
    expect(mine).toHaveLength(1)
    expect(mine[0]).toMatchObject({ result: 'LOSS', equipLevel: 'CHARACTERS_ONLY' })
    await votes.cancelVote('b1')
    expect(db.votes.filter((v) => v.buildId === 'b1')).toHaveLength(before)
  })

  it('cannot vote on a build the user cannot see', async () => {
    await as('u4')
    await expect(votes.castVote('b2', 'WIN', 'EXACT_EQUIPMENT')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('deleting a build deletes its votes', async () => {
    await as('u1')
    await builds.deleteBuild('b1')
    expect(db.votes.some((v) => v.buildId === 'b1')).toBe(false)
  })
})

describe('FR 4.5 visibility changes', () => {
  it('changing type ends all shares', async () => {
    await as('u1')
    await builds.updateBuild('b6', inputFrom('b6', { visibility: 'PUBLIC', groupIds: [] }))
    expect(db.builds.find((b) => b.id === 'b6')!.shares).toEqual([])
  })

  it('removing one group keeps the other groups and their hidden flag', async () => {
    await as('u1')
    await builds.updateBuild('b6', inputFrom('b6', { groupIds: ['g2'] }))
    expect(db.builds.find((b) => b.id === 'b6')!.shares).toEqual([{ groupId: 'g2', hidden: true }])
  })

  it('cannot move a build to another lineup', async () => {
    await as('u1')
    await expect(builds.updateBuild('b1', inputFrom('b1', { lineupId: 'l2' }))).rejects.toMatchObject({ code: 'VALIDATION' })
  })
})

describe('FR 5 groups', () => {
  it('leaving a group drops that share; a build with no groups left becomes private', async () => {
    await as('u2')
    await groups.leaveGroup('g1')
    expect(db.builds.find((b) => b.id === 'b2')).toMatchObject({ visibility: 'PRIVATE', shares: [] })
  })

  it('owner must transfer before leaving', async () => {
    await as('u1')
    await expect(groups.leaveGroup('g1')).rejects.toMatchObject({ code: 'OWNER_MUST_TRANSFER' })
  })

  it('deleting a group leaves other shares untouched', async () => {
    await as('u1')
    await groups.deleteGroup('g1')
    expect(db.builds.find((b) => b.id === 'b2')!.visibility).toBe('PRIVATE')
    expect(db.builds.find((b) => b.id === 'b6')!.shares).toEqual([{ groupId: 'g2', hidden: true }])
  })

  it('only the owner can hide builds', async () => {
    await as('u2')
    await expect(groups.setBuildHidden('g1', 'b2', true)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('FR 2.1 account deletion', () => {
  it('keeps public builds, orphans the rest, anonymises votes, hands groups over', async () => {
    await as('u1')
    await votes.castVote('b5', 'WIN', 'EXACT_EQUIPMENT')
    await auth.deleteAccount()

    const b1 = db.builds.find((b) => b.id === 'b1')!
    expect(b1).toMatchObject({ visibility: 'PUBLIC', creatorDeleted: true, creatorId: null })
    expect(db.builds.find((b) => b.id === 'b6')).toMatchObject({ visibility: 'PRIVATE', shares: [] })
    expect(db.votes.some((v) => v.userId === 'u1')).toBe(false)
    expect(db.groups.find((g) => g.id === 'g1')!.ownerId).toBe('u2')

    await as('u2')
    expect(ids(await builds.listBuildsForLineup('l1'))).toEqual(['b1', 'b2', 'b8']) // b7 is orphaned
    expect(ids(await builds.listBuildsForLineup('l2'))).toEqual(['b5']) // b6 is orphaned
  })
})

describe('FR 2 auth', () => {
  it('suspended users cannot log in', async () => {
    await expect(auth.login('banned@example.com', 'x')).rejects.toMatchObject({ code: 'SUSPENDED' })
  })
})

describe('FR 8–9 admin', () => {
  it('requires a staff role', async () => {
    await as('u2')
    await expect(admin.adminListUsers()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('merges lineups and only deletes empty ones', async () => {
    await as('u3')
    await expect(admin.adminDeleteLineup('l1')).rejects.toMatchObject({ code: 'HAS_BUILDS' })
    await admin.adminMergeLineup('l2', 'l1')
    expect(db.lineups.some((l) => l.id === 'l2')).toBe(false)
    expect(db.builds.filter((b) => b.lineupId === 'l1')).toHaveLength(8)
  })

  it('previews an import and commits all-or-nothing', async () => {
    await as('u1')
    const csv = 'code,name,aliases,active\npet_yu,ยูใหม่,Yu,true\npet_new,ใหม่,,\nbad code,x,,'
    const rows = await admin.adminPreviewImport('pets', csv)
    expect(rows.map((r) => r.status)).toEqual(['UPDATE', 'CREATE', 'ERROR'])
    await expect(admin.adminCommitImport('pets', rows)).rejects.toMatchObject({ code: 'VALIDATION' })

    const ok = await admin.adminPreviewImport('pets', csv.split('\n').slice(0, 3).join('\n'))
    expect(await admin.adminCommitImport('pets', ok)).toEqual({ created: 1, updated: 1 })
    expect(db.pets.find((p) => p.id === 'pet_yu')!.name).toBe('ยูใหม่')
  })
})
