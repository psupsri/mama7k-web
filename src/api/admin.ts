import { db } from '../mock/db'
import type { MockDB } from '../mock/seed'
import { lineupKey, teamTitle } from '../lib/formation'
import type { FormationType, MasterItem, OffenseBuild, Placement, UserRole } from '../types/domain'
import { ApiError, audit, displayName, requireAdmin, respond, toSummary } from './internal'
import { validatePlacements } from './lineups'

const charIndex = () => Object.fromEntries(db.characters.map((c) => [c.id, c]))
const buildLabel = (b: OffenseBuild) => `${b.id} (${teamTitle(b.placements, charIndex())})`

// ---------- Users ----------

export function adminListUsers(q = '') {
  return respond(() => {
    requireAdmin()
    const s = q.trim().toLowerCase()
    return db.users
      .filter((u) => !u.deleted)
      .filter((u) => !s || u.email.includes(s) || u.displayName.toLowerCase().includes(s))
  })
}

export function adminSetSuspended(userId: string, suspended: boolean) {
  return respond(() => {
    const me = requireAdmin()
    const u = db.users.find((x) => x.id === userId)
    if (!u) throw new ApiError('NOT_FOUND', 'ไม่พบผู้ใช้')
    if (u.id === me.id) throw new ApiError('VALIDATION', 'ระงับบัญชีตัวเองไม่ได้')
    if (u.role !== 'USER' && me.role !== 'SUPER_ADMIN') throw new ApiError('FORBIDDEN', 'Moderator ระงับบัญชีทีมงานไม่ได้')
    u.suspended = suspended
    audit(me.id, suspended ? 'USER_SUSPEND' : 'USER_UNSUSPEND', `${u.displayName} (${u.email})`)
    return u
  }, true)
}

export function adminSetRole(userId: string, role: UserRole) {
  return respond(() => {
    const me = requireAdmin(true)
    const u = db.users.find((x) => x.id === userId)
    if (!u) throw new ApiError('NOT_FOUND', 'ไม่พบผู้ใช้')
    if (u.id === me.id) throw new ApiError('VALIDATION', 'เปลี่ยน role ตัวเองไม่ได้')
    u.role = role
    audit(me.id, 'USER_ROLE', `${u.displayName} → ${role}`)
    return u
  }, true)
}

// ---------- Public builds (admins never see group/private builds) ----------

export function adminListPublicBuilds(q = '') {
  return respond(() => {
    const me = requireAdmin()
    const s = q.trim().toLowerCase()
    return db.builds
      .filter((b) => b.visibility === 'PUBLIC')
      .filter((b) => !s || b.description.toLowerCase().includes(s) || displayName(b.creatorId).toLowerCase().includes(s) || teamTitle(b.placements, charIndex()).toLowerCase().includes(s))
      .map((b) => toSummary(me, b))
      .sort((a, b) => b.build.updatedAt.localeCompare(a.build.updatedAt))
  })
}

function findPublicBuild(id: string) {
  const b = db.builds.find((x) => x.id === id && x.visibility === 'PUBLIC')
  if (!b) throw new ApiError('NOT_FOUND', 'ไม่พบ Public Build')
  return b
}

export function adminSetBuildHidden(id: string, hidden: boolean) {
  return respond(() => {
    const me = requireAdmin()
    const b = findPublicBuild(id)
    b.adminHidden = hidden
    audit(me.id, hidden ? 'BUILD_HIDE' : 'BUILD_UNHIDE', buildLabel(b))
    return b
  }, true)
}

export function adminDeleteBuild(id: string) {
  return respond(() => {
    const me = requireAdmin()
    const b = findPublicBuild(id)
    db.builds = db.builds.filter((x) => x.id !== id)
    db.votes = db.votes.filter((v) => v.buildId !== id)
    audit(me.id, 'BUILD_DELETE', buildLabel(b))
    return true
  }, true)
}

// ---------- Lineups ----------

export function adminListLineups() {
  return respond(() => {
    requireAdmin()
    return db.lineups
      .map((lineup) => {
        const builds = db.builds.filter((b) => b.lineupId === lineup.id)
        return { lineup, buildCount: builds.length, publicCount: builds.filter((b) => b.visibility === 'PUBLIC').length }
      })
      .sort((a, b) => b.lineup.createdAt.localeCompare(a.lineup.createdAt))
  })
}

export function adminUpdateLineup(id: string, formation: FormationType, placements: Placement[]) {
  return respond(() => {
    const me = requireAdmin()
    const l = db.lineups.find((x) => x.id === id)
    if (!l) throw new ApiError('NOT_FOUND', 'ไม่พบบ้านศัตรู')
    validatePlacements(formation, placements)
    const key = lineupKey(formation, placements)
    const dup = db.lineups.find((x) => x.id !== id && lineupKey(x.formation, x.placements) === key)
    if (dup) throw new ApiError('DUPLICATE', `ซ้ำกับบ้าน ${dup.id} ให้ใช้การ merge แทน`)
    l.formation = formation
    l.placements = placements
    audit(me.id, 'LINEUP_UPDATE', l.id)
    return l
  }, true)
}

/** Moves every build (and so its votes) from source to target, then deletes source (FR 8.2). */
export function adminMergeLineup(sourceId: string, targetId: string) {
  return respond(() => {
    const me = requireAdmin()
    if (sourceId === targetId) throw new ApiError('VALIDATION', 'เลือกบ้านปลายทางคนละบ้าน')
    if (!db.lineups.some((l) => l.id === targetId)) throw new ApiError('NOT_FOUND', 'ไม่พบบ้านปลายทาง')
    let moved = 0
    for (const b of db.builds) {
      if (b.lineupId === sourceId) {
        b.lineupId = targetId
        moved++
      }
    }
    db.lineups = db.lineups.filter((l) => l.id !== sourceId)
    audit(me.id, 'LINEUP_MERGE', `${sourceId} → ${targetId} (${moved} Build)`)
    return moved
  }, true)
}

export function adminDeleteLineup(id: string) {
  return respond(() => {
    const me = requireAdmin()
    if (db.builds.some((b) => b.lineupId === id)) throw new ApiError('HAS_BUILDS', 'ลบได้เฉพาะบ้านที่ไม่มี Build')
    db.lineups = db.lineups.filter((l) => l.id !== id)
    audit(me.id, 'LINEUP_DELETE', id)
    return true
  }, true)
}

// ---------- Master data ----------

export type MasterEntity = 'characters' | 'skills' | 'pets' | 'sets' | 'rings' | 'stats'

export const ENTITY_PREFIX: Record<MasterEntity, string> = {
  characters: 'char_',
  skills: 'skill_',
  pets: 'pet_',
  sets: 'set_',
  rings: 'ring_',
  stats: 'stat_',
}

type AnyMaster = MasterItem & Record<string, unknown>

function table(entity: MasterEntity) {
  return db[entity] as unknown as AnyMaster[]
}

function validateItem(entity: MasterEntity, item: AnyMaster) {
  if (!/^[a-z0-9_]+$/.test(item.code)) throw new ApiError('VALIDATION', `code "${item.code}" ใช้ได้เฉพาะ a-z 0-9 และ _`)
  if (!item.code.startsWith(ENTITY_PREFIX[entity])) throw new ApiError('VALIDATION', `code ต้องขึ้นต้นด้วย ${ENTITY_PREFIX[entity]}`)
  if (!item.name?.trim()) throw new ApiError('VALIDATION', `${item.code}: ต้องมีชื่อ`)
  if (entity === 'skills' && !db.characters.some((c) => c.id === item.characterId))
    throw new ApiError('VALIDATION', `${item.code}: ไม่พบตัวละครเจ้าของสกิล`)
  if (entity === 'skills' && item.slot !== 1 && item.slot !== 2)
    throw new ApiError('VALIDATION', `${item.code}: slot ต้องเป็น 1 (บน) หรือ 2 (ล่าง)`)
  if (entity === 'rings' && !['LEGENDARY', 'RARE', 'UNCOMMON', 'COMMON'].includes(String(item.rarity)))
    throw new ApiError('VALIDATION', `${item.code}: rarity ไม่ถูกต้อง`)
  if (entity === 'stats' && !['PERCENT', 'NUMBER'].includes(String(item.unit)))
    throw new ApiError('VALIDATION', `${item.code}: unit ไม่ถูกต้อง`)
}

/** Create or update by code. Code is immutable and doubles as the id (FR 9.2). */
function upsert(entity: MasterEntity, item: AnyMaster) {
  validateItem(entity, item)
  const rows = table(entity)
  const existing = rows.find((r) => r.code === item.code)
  if (existing) Object.assign(existing, item, { id: existing.id, code: existing.code })
  else rows.push({ ...item, id: item.code })
  return existing ? 'UPDATED' : 'CREATED'
}

export function adminSaveMaster(entity: MasterEntity, item: AnyMaster) {
  return respond(() => {
    const me = requireAdmin()
    const result = upsert(entity, item)
    audit(me.id, `MASTER_${result}`, `${entity}/${item.code}`)
    return result
  }, true)
}

export function adminSetMasterActive(entity: MasterEntity, code: string, active: boolean) {
  return respond(() => {
    const me = requireAdmin()
    const row = table(entity).find((r) => r.code === code)
    if (!row) throw new ApiError('NOT_FOUND', 'ไม่พบรายการ')
    row.active = active
    audit(me.id, active ? 'MASTER_ACTIVATE' : 'MASTER_DEACTIVATE', `${entity}/${code}`)
    return row
  }, true)
}

// ---------- Import (CSV) ----------

export const IMPORT_COLUMNS: Record<MasterEntity, string[]> = {
  characters: ['code', 'name', 'aliases', 'active'],
  skills: ['code', 'character_code', 'slot', 'name', 'aliases', 'active'],
  pets: ['code', 'name', 'aliases', 'active'],
  sets: ['code', 'name', 'aliases', 'effect_2', 'effect_4', 'active'],
  rings: ['code', 'name', 'aliases', 'rarity', 'effect', 'active'],
  stats: ['code', 'name', 'aliases', 'unit', 'active'],
}

export interface ImportRow {
  line: number
  code: string
  status: 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'ERROR'
  changes: string[]
  error?: string
  item?: AnyMaster
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim()))
}

function rowToItem(entity: MasterEntity, rec: Record<string, string>, current?: AnyMaster): AnyMaster {
  const item: AnyMaster = {
    ...(current ?? {}),
    id: rec.code,
    code: rec.code,
    name: rec.name?.trim(),
    aliases: (rec.aliases ?? '').split('|').map((a) => a.trim()).filter(Boolean),
    active: rec.active === undefined || rec.active === '' ? (current?.active ?? true) : rec.active.trim().toLowerCase() === 'true',
  }
  if (entity === 'skills') Object.assign(item, { characterId: rec.character_code, slot: Number(rec.slot) })
  if (entity === 'sets') Object.assign(item, { effect2: rec.effect_2 ?? '', effect4: rec.effect_4 ?? '' })
  if (entity === 'rings') Object.assign(item, { rarity: rec.rarity?.trim().toUpperCase(), effect: rec.effect ?? '' })
  if (entity === 'stats') item.unit = rec.unit?.trim().toUpperCase()
  return item
}

/** Step 1: parse and diff without saving anything. */
export function adminPreviewImport(entity: MasterEntity, csv: string) {
  return respond<ImportRow[]>(() => {
    requireAdmin()
    const [header, ...lines] = parseCsv(csv)
    if (!header) throw new ApiError('VALIDATION', 'ไฟล์ว่าง')
    const cols = header.map((h) => h.trim().toLowerCase())
    const missing = IMPORT_COLUMNS[entity].filter((c) => c !== 'active' && c !== 'aliases' && !cols.includes(c))
    if (missing.length) throw new ApiError('VALIDATION', `ขาดคอลัมน์: ${missing.join(', ')}`)
    const seen = new Set<string>()
    return lines.map((cells, i) => {
      const rec = Object.fromEntries(cols.map((c, j) => [c, (cells[j] ?? '').trim()]))
      const line = i + 2
      const current = table(entity).find((r) => r.code === rec.code)
      try {
        if (seen.has(rec.code)) throw new ApiError('VALIDATION', 'code ซ้ำในไฟล์')
        seen.add(rec.code)
        const item = rowToItem(entity, rec, current)
        validateItem(entity, item)
        if (!current) return { line, code: rec.code, status: 'CREATE', changes: [], item }
        const changes = Object.keys(item).filter(
          (k) => k !== 'image' && JSON.stringify(item[k]) !== JSON.stringify((current as Record<string, unknown>)[k]),
        )
        return { line, code: rec.code, status: changes.length ? 'UPDATE' : 'UNCHANGED', changes, item }
      } catch (e) {
        return { line, code: rec.code || '(ว่าง)', status: 'ERROR', changes: [], error: e instanceof Error ? e.message : String(e) }
      }
    })
  })
}

/** Step 2: all-or-nothing commit (FR 9.3). */
export function adminCommitImport(entity: MasterEntity, rows: ImportRow[]) {
  return respond(() => {
    const me = requireAdmin()
    if (rows.some((r) => r.status === 'ERROR')) throw new ApiError('VALIDATION', 'แก้ error ในไฟล์ก่อนนำเข้า')
    const snapshot = structuredClone(db[entity])
    try {
      for (const r of rows) if (r.item && r.status !== 'UNCHANGED') upsert(entity, r.item)
    } catch (e) {
      ;(db as unknown as Record<keyof MockDB, unknown>)[entity] = snapshot
      throw e
    }
    const created = rows.filter((r) => r.status === 'CREATE').length
    const updated = rows.filter((r) => r.status === 'UPDATE').length
    audit(me.id, 'MASTER_IMPORT', `${entity}: เพิ่ม ${created}, แก้ ${updated}`)
    return { created, updated }
  }, true)
}

export function templateCsv(entity: MasterEntity) {
  const rows = (db[entity] as unknown as AnyMaster[]).slice(0, 3).map((r) =>
    IMPORT_COLUMNS[entity].map((c) => {
      const v =
        c === 'aliases' ? r.aliases.join('|')
        : c === 'character_code' ? r.characterId
        : c === 'effect_2' ? r.effect2
        : c === 'effect_4' ? r.effect4
        : r[c]
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }),
  )
  return [IMPORT_COLUMNS[entity].join(','), ...rows.map((r) => r.join(','))].join('\n')
}

// ---------- Audit ----------

export function adminAuditLog() {
  return respond(() => {
    requireAdmin(true)
    return db.auditLog.map((a) => ({ ...a, actorName: displayName(a.actorId) }))
  })
}
