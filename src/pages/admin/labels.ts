import type { MasterEntity } from '../../api/admin'

export const ENTITY_LABEL: Record<MasterEntity, string> = {
  characters: 'ตัวละคร',
  pets: 'Pet',
  sets: 'เซ็ตอุปกรณ์',
  rings: 'แหวน',
  stats: 'สเตตัส',
}
export const ENTITIES = Object.keys(ENTITY_LABEL) as MasterEntity[]
