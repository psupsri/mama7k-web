import type { BattleResult, EquipLevel, Visibility } from '../types/domain'

export const EQUIP_LEVELS: EquipLevel[] = ['EXACT_EQUIPMENT', 'SAME_SET_DIFFERENT_SUBSTATS', 'CHARACTERS_ONLY']

export const EQUIP_LEVEL_LABEL: Record<EquipLevel, string> = {
  EXACT_EQUIPMENT: 'อุปกรณ์ตรงตามแนะนำ',
  SAME_SET_DIFFERENT_SUBSTATS: 'เซ็ตเดียวกัน สเตตัสต่าง',
  CHARACTERS_ONLY: 'ตัวละครตรง อุปกรณ์อะไรก็ได้',
}

export const EQUIP_LEVEL_HINT: Record<EquipLevel, string> = {
  EXACT_EQUIPMENT: 'ใช้เซ็ตที่แนะนำ และสเตตัสรวมถึงค่าเป้าหมาย',
  SAME_SET_DIFFERENT_SUBSTATS: 'ใช้เซ็ตที่แนะนำ แต่สเตตัสไม่ถึงเป้า',
  CHARACTERS_ONLY: 'ใช้ตัวละครตามที่แนะนำ อุปกรณ์ต่างออกไป',
}

export const RESULT_LABEL: Record<BattleResult, string> = { WIN: 'ชนะ', LOSS: 'แพ้' }

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  PUBLIC: 'Public',
  GROUP: 'Group',
  PRIVATE: 'Private',
}

export const VISIBILITY_HINT: Record<Visibility, string> = {
  PUBLIC: 'ทุกคนดูได้ รวมถึงผู้ที่ไม่ได้เข้าสู่ระบบ',
  GROUP: 'เฉพาะสมาชิกของ Group ที่เลือก',
  PRIVATE: 'เห็นได้คนเดียว',
}

export function formatPct(v: number | null) {
  return v === null ? 'N/A' : `${Math.round(v)}%`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
