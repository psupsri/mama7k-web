import type { BuildSummary, DefenseLineup, FormationType, MasterData, MasterItem, Placement, User, UserRole } from '../types/domain'
import { http } from './client'

// ---------- users ----------

export const adminListUsers = (q = '') => http.get<User[]>('/admin/users', { q })
export const adminSetSuspended = (userId: string, suspended: boolean) => http.patch<User>(`/admin/users/${userId}`, { suspended })
export const adminSetRole = (userId: string, role: UserRole) => http.patch<User>(`/admin/users/${userId}`, { role })
/** Super Admin only. Returns a temporary password to hand to the user; their sessions end. */
export const adminResetPassword = (userId: string) =>
  http.post<{ temporaryPassword: string }>(`/admin/users/${userId}/reset-password`)

// ---------- public builds (staff never see group or private builds) ----------

export const adminListPublicBuilds = (q = '') => http.get<BuildSummary[]>('/admin/builds', { q })
export const adminSetBuildHidden = (id: string, hidden: boolean) => http.patch<void>(`/admin/builds/${id}`, { hidden })
export const adminDeleteBuild = (id: string) => http.del(`/admin/builds/${id}`)

// ---------- lineups ----------

export const adminListLineups = () => http.get<{ lineup: DefenseLineup; buildCount: number; publicCount: number }[]>('/admin/lineups')
export const adminUpdateLineup = (id: string, formation: FormationType, placements: Placement[]) =>
  http.put<DefenseLineup>(`/admin/lineups/${id}`, { formation, placements })
/** Moves every build (and so its votes) to the target, then deletes the source (FR 8.2). */
export const adminMergeLineup = (sourceId: string, targetId: string) =>
  http.post<{ moved: number }>(`/admin/lineups/${sourceId}/merge`, { targetId })
export const adminDeleteLineup = (id: string) => http.del(`/admin/lineups/${id}`)

// ---------- master data ----------

export type MasterEntity = 'characters' | 'pets' | 'sets' | 'rings' | 'stats'

type AnyMaster = MasterItem & Record<string, unknown>

/** Only the fields the API accepts for each entity (it rejects unknown fields). */
function toRecord(item: AnyMaster) {
  const base = { nameTh: item.nameTh, nameEn: item.nameEn, active: item.active }
  return base
}

/** Creates an item; the server assigns the next running number as its id. */
export const adminCreateMaster = (entity: MasterEntity, item: AnyMaster) =>
  http.post<{ id: string }>(`/admin/master/${entity}`, toRecord(item))

/** Updates an item by id. The id never changes (FR 9.2). */
export const adminSaveMaster = (entity: MasterEntity, item: AnyMaster) =>
  http.put<{ created: boolean }>(`/admin/master/${entity}/${item.id}`, toRecord(item))

export const adminSetMasterActive = (entity: MasterEntity, id: string, active: boolean) =>
  http.patch<void>(`/admin/master/${entity}/${id}`, { active })

/** PNG, WebP or JPEG up to 2 MB. The item must already exist. */
export function adminUploadImage(entity: MasterEntity, id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return http.post<{ image: string }>(`/admin/master/${entity}/${id}/image`, form)
}

// ---------- CSV import (FR 9.3) ----------

/** `image` = path relative to MEDIA_PUBLIC_URL, e.g. master/characters/001_ludi.webp (optional). */
export const IMPORT_COLUMNS: Record<MasterEntity, string[]> = {
  characters: ['id', 'name_th', 'name_en', 'image', 'active'],
  pets: ['id', 'name_th', 'name_en', 'image', 'active'],
  sets: ['id', 'name_th', 'name_en', 'image', 'active'],
  rings: ['id', 'name_th', 'name_en', 'image', 'active'],
  stats: ['id', 'name_th', 'name_en', 'image', 'active'],
}

export interface ImportRow {
  line: number
  id: string
  status: 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'ERROR'
  changes: string[]
  error?: string
  item?: { nameTh: string }
}

/** Step 1: parse and diff on the server without saving anything. */
export const adminPreviewImport = (entity: MasterEntity, csv: string) =>
  http.post<ImportRow[]>(`/admin/master/${entity}/import/preview`, { csv })

/** Step 2: the server re-validates the same file and writes all rows or none. */
export const adminCommitImport = (entity: MasterEntity, csv: string) =>
  http.post<{ created: number; updated: number }>(`/admin/master/${entity}/import/commit`, { csv })

/** A template CSV with the entity's columns and its first three rows as examples. */
export function templateCsv(entity: MasterEntity, master: MasterData) {
  const rows = (master[entity] as unknown as AnyMaster[]).slice(0, 3).map((r) =>
    IMPORT_COLUMNS[entity].map((c) => {
      const v =
        c === 'name_th' ? r.nameTh
        : c === 'name_en' ? r.nameEn
        : c === 'image' ? '' // the API returns resolved URLs, not the stored path
        : r[c]
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }),
  )
  return [IMPORT_COLUMNS[entity].join(','), ...rows.map((r) => r.join(','))].join('\n')
}

// ---------- audit ----------

export const adminAuditLog = () =>
  http.get<{ id: string; actorId: string; actorName: string; action: string; target: string; at: string }[]>('/admin/audit')
