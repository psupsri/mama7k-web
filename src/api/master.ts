import { db } from '../mock/db'
import type { MasterData } from '../types/domain'
import { respond } from './internal'

/** Returns every master item, including inactive ones (needed to render old builds). */
export function getMasterData() {
  return respond<MasterData>(() => ({
    characters: db.characters,
    skills: db.skills,
    pets: db.pets,
    sets: db.sets,
    rings: db.rings,
    stats: db.stats,
  }))
}
