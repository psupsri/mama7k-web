// Mock seed data. Character/pet/skill names are sample data for UI testing only.
import type {
  BattleResult,
  Character,
  DefenseLineup,
  EquipLevel,
  EquipmentSet,
  Group,
  GroupMember,
  OffenseBuild,
  Pet,
  Ring,
  Skill,
  StatType,
  User,
  Vote,
} from '../types/domain'

export interface MockDB {
  version: number
  users: User[]
  groups: Group[]
  members: GroupMember[]
  characters: Character[]
  skills: Skill[]
  pets: Pet[]
  sets: EquipmentSet[]
  rings: Ring[]
  stats: StatType[]
  lineups: DefenseLineup[]
  builds: OffenseBuild[]
  votes: Vote[]
  auditLog: { id: string; actorId: string; action: string; target: string; at: string }[]
  seq: number
}

export const DB_VERSION = 5

const item = (prefix: string, code: string, name: string, aliases: string[] = []) => ({
  id: `${prefix}_${code}`,
  code: `${prefix}_${code}`,
  name,
  aliases,
  active: true,
})

const CHARACTERS: Character[] = [
  item('char', 'yungon', 'ยุนกอน'),
  item('char', 'skull', 'สกัล'),
  item('char', 'doyoung', 'โดยอง'),
  item('char', 'lubu', 'ลิโป้', ['Lu Bu']),
  item('char', 'hayeon', 'ฮายอน'),
  item('char', 'soran', 'ซอรัน'),
  item('char', 'rudy', 'รูดี้', ['Rudy']),
  item('char', 'evan', 'อีวาน', ['Evan']),
  item('char', 'karma', 'คาร์ม่า', ['Karma']),
  item('char', 'hellenia', 'เฮเลเนีย', ['Hellenia']),
  item('char', 'lucy', 'ลูซี่', ['Lucy']),
  item('char', 'shane', 'เชน', ['Shane']),
  item('char', 'pascal', 'ปาสคาล', ['Pascal']),
  item('char', 'fai', 'ไฟ', ['Fai']),
  item('char', 'bidam', 'บีดัม', ['Bi Dam']),
  item('char', 'kyle', 'ไคล์', ['Kyle']),
  item('char', 'biscuit', 'บิสกิต', ['Biscuit']),
  item('char', 'teo', 'เทโอ', ['Teo']),
]

const SKILLS: Skill[] = CHARACTERS.flatMap((c) =>
  ([1, 2] as const).map((n) => ({
    ...item('skill', `${c.code.replace('char_', '')}_${n}`, n === 1 ? 'สกิลบน' : 'สกิลล่าง'),
    characterId: c.id,
    slot: n,
  })),
)

const PETS: Pet[] = [
  item('pet', 'taeo', 'แทโอ'),
  item('pet', 'yu', 'ยู'),
  item('pet', 'ari', 'อาริ'),
  item('pet', 'pet4', 'Pet 4'),
  item('pet', 'pet5', 'Pet 5'),
  item('pet', 'pet6', 'Pet 6'),
]

const set = (code: string, name: string, game: string, e2: string, e4: string): EquipmentSet => ({
  ...item('set', code, name, [game]),
  effect2: e2,
  effect4: e4,
})

const SETS: EquipmentSet[] = [
  set('attack', 'เซ็ตโจม', 'Vanguard', 'เพิ่มพลังโจมตี', 'เพิ่มพลังโจมตีมากขึ้น'),
  set('pierce', 'เซ็ตเจาะเกราะ', 'Bounty Tracker', 'โอกาสโจมตีจุดอ่อน +15%', '[effect 4 ชิ้น]'),
  set('hp', 'เซ็ตเลือด', 'Paladin', 'เพิ่ม HP', 'ฟื้นฟูตาม Max HP'),
  set('hit', 'เซ็ตเข้าเป้า', 'Spellweaver', 'อัตราเข้าเป้า', 'เพิ่มโอกาสติดสถานะ'),
  set('boss', 'เซ็ตบอส', 'Avenger', 'เพิ่มความเสียหาย', 'เพิ่มความเสียหายต่อบอส'),
  set('resist', 'เซ็ตต้าน', 'Orchestrator', 'ต้านทานสถานะ', 'ต้านทานสถานะ + กัน CC 1 เทิร์น'),
  set('block', 'เซ็ตบล็อค', 'Gatekeeper', 'อัตราบล็อค', 'อัตราบล็อค x2'),
  set('crit', 'เซ็ตคริ', 'Assassin', 'คริเรท +15%', 'คริเรท +30% เจาะเกราะ +15%'),
  set('def', 'เซ็ตป้องกัน', 'Guardian', 'เพิ่มพลังป้องกัน', 'ต้านทานสถานะ'),
]

const ring = (code: string, name: string, game: string, rarity: Ring['rarity'], effect: string): Ring => ({
  ...item('ring', code, name, [game]),
  rarity,
  effect,
})

const RINGS: Ring[] = [
  ring('authority', 'อำนาจ', 'Ring of Authority', 'LEGENDARY', 'ได้ Barrier ตาม Attack หลัง Guts ทำงาน'),
  ring('immortality', 'อมตะ', 'Ring of Immortality', 'LEGENDARY', 'เมื่อถูก KO เป็นอมตะ 1–3 เทิร์นตามดาว'),
  ring('resurrection', 'ชุบ', 'Ring of Resurrection', 'LEGENDARY', 'ฟื้นคืนชีพ 1 ครั้ง'),
  ring('subjugation', 'ปราบปราม', 'Ring of Subjugation', 'RARE', 'เพิ่มความเสียหายต่อบอส'),
  ring('siege', 'ล้อมเมือง', 'Ring of Siege', 'RARE', 'เพิ่มความเสียหายสกิลโจมตี 1–3 เป้า'),
  ring('annihilation', 'ทำลายล้าง', 'Ring of Annihilation', 'RARE', 'เพิ่มความเสียหายสกิลโจมตี 4–5 เป้า'),
  ring('roar', 'คำราม', 'Ring of Roar', 'RARE', 'Barrier ตาม Attack'),
  ring('bulwark', 'ปราการ', 'Ring of Bulwark', 'RARE', 'Barrier ตาม Defense'),
  ring('tenacity', 'ทรหด', 'Ring of Tenacity', 'RARE', 'ฟื้นฟูเมื่อ HP ต่ำกว่า 50%'),
  ring('fortune', 'คริ', 'Ring of Fortune', 'COMMON', 'เพิ่มคริเรท'),
  ring('concentration', 'จุดอ่อน', 'Ring of Concentration', 'COMMON', 'เพิ่มโอกาสโจมตีจุดอ่อน'),
  ring('accuracy', 'เข้าเป้า', 'Ring of Accuracy', 'COMMON', 'เพิ่มอัตราเข้าเป้า'),
  ring('resistance', 'ต้านทาน', 'Ring of Resistance', 'COMMON', 'เพิ่มต้านทานสถานะ'),
]

const stat = (code: string, name: string, aliases: string[], unit: StatType['unit'] = 'PERCENT'): StatType => ({
  ...item('stat', code, name, aliases),
  unit,
})

const STATS: StatType[] = [
  stat('crit', 'คริ', ['คริเรท', 'Crit Rate']),
  stat('weakness', 'อ่อน', ['จุดอ่อน', 'Weakness Hit']),
  stat('critdmg', 'คริดาเมจ', ['Crit Damage']),
  stat('hit', 'เข้าเป้า', ['Effect Hit']),
  stat('resist', 'ต้าน', ['ต้านทาน', 'Effect Resistance']),
  stat('speed', 'สปีด', ['Speed'], 'NUMBER'),
  stat('block', 'บล็อค', ['Block Rate']),
  stat('dmgreduce', 'ลดดาเมจ', ['ลดความเสียหาย', 'Damage Taken Reduction']),
  stat('atk', 'โจม %', ['All Attack %']),
  stat('hpp', 'เลือด %', ['HP %']),
  stat('defp', 'ป้องกัน %', ['Defense %']),
]

const USERS: User[] = [
  { id: 'u1', email: 'pisit@example.com', displayName: 'Pisit', role: 'SUPER_ADMIN', suspended: false, deleted: false, emailVerified: true },
  { id: 'u2', email: 'mee@example.com', displayName: 'หมีน้อย', role: 'USER', suspended: false, deleted: false, emailVerified: true },
  { id: 'u3', email: 'shadow@example.com', displayName: 'ShadowBlade', role: 'MODERATOR', suspended: false, deleted: false, emailVerified: true },
  { id: 'u4', email: 'fah@example.com', displayName: 'สายฟ้า', role: 'USER', suspended: false, deleted: false, emailVerified: true },
  { id: 'u5', email: 'banned@example.com', displayName: 'โดนแบน', role: 'USER', suspended: true, deleted: false, emailVerified: true },
]

const DAY = 24 * 60 * 60 * 1000

export function createSeed(now = Date.now()): MockDB {
  const iso = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString()

  const groups: Group[] = [
    { id: 'g1', name: 'กิลด์มาม่า', ownerId: 'u1', inviteCode: 'MAMA7K', createdAt: iso(60) },
    { id: 'g2', name: 'Night Raid', ownerId: 'u3', inviteCode: 'NIGHT01', createdAt: iso(50) },
    { id: 'g3', name: 'ห้องลับสายฟ้า', ownerId: 'u4', inviteCode: 'FAHFAH', createdAt: iso(40) },
  ]
  const members: GroupMember[] = [
    { groupId: 'g1', userId: 'u1', joinedAt: iso(60) },
    { groupId: 'g1', userId: 'u2', joinedAt: iso(55) },
    { groupId: 'g1', userId: 'u5', joinedAt: iso(30) },
    { groupId: 'g2', userId: 'u3', joinedAt: iso(50) },
    { groupId: 'g2', userId: 'u1', joinedAt: iso(45) },
    { groupId: 'g3', userId: 'u4', joinedAt: iso(40) },
  ]

  const lineups: DefenseLineup[] = [
    {
      id: 'l1',
      formation: 'F4B1',
      placements: [
        { characterId: 'char_lubu', row: 'FRONT', slot: 1 },
        { characterId: 'char_hayeon', row: 'FRONT', slot: 2 },
        { characterId: 'char_soran', row: 'BACK', slot: 0 },
      ],
      createdBy: 'u1',
      createdAt: iso(40),
    },
    {
      id: 'l2',
      formation: 'F3B2',
      placements: [
        { characterId: 'char_rudy', row: 'FRONT', slot: 0 },
        { characterId: 'char_karma', row: 'FRONT', slot: 2 },
        { characterId: 'char_hellenia', row: 'BACK', slot: 1 },
      ],
      createdBy: 'u2',
      createdAt: iso(35),
    },
    {
      id: 'l3',
      formation: 'F2B3',
      placements: [
        { characterId: 'char_evan', row: 'FRONT', slot: 0 },
        { characterId: 'char_kyle', row: 'BACK', slot: 0 },
        { characterId: 'char_lucy', row: 'BACK', slot: 2 },
      ],
      createdBy: 'u3',
      createdAt: iso(20),
    },
    {
      id: 'l4',
      formation: 'F1B4',
      placements: [
        { characterId: 'char_biscuit', row: 'FRONT', slot: 0 },
        { characterId: 'char_fai', row: 'BACK', slot: 1 },
        { characterId: 'char_bidam', row: 'BACK', slot: 2 },
      ],
      createdBy: 'u4',
      createdAt: iso(5),
    },
  ]

  const base = {
    description: '',
    creatorDeleted: false,
    adminHidden: false,
    speed: null,
    createdAt: iso(30),
    updatedAt: iso(3),
  }

  const builds: OffenseBuild[] = [
    {
      ...base,
      id: 'b1',
      lineupId: 'l1',
      description: 'ต้องเร็วกว่าฝั่งตรงข้าม ยุนกอนเปิดก่อนแล้วสกัลตามด้วยสถานะ โดยองต้องซ้อนแหวนเท่านั้น',
      creatorId: 'u1',
      visibility: 'PUBLIC',
      shares: [],
      counterPets: ['pet_yu'],
      formation: 'F4B1',
      placements: [
        { characterId: 'char_skull', row: 'FRONT', slot: 1 },
        { characterId: 'char_doyoung', row: 'FRONT', slot: 2 },
        { characterId: 'char_yungon', row: 'BACK', slot: 0 },
      ],
      ownPets: ['pet_taeo', 'pet_yu', 'pet_ari'],
      skillOrder: ['skill_yungon_1', 'skill_skull_2', 'skill_yungon_2'],
      speed: { kind: 'FASTER' },
      recommendations: [
        {
          characterId: 'char_yungon',
          sets: ['set_crit', 'set_pierce'],
          stats: [
            { statId: 'stat_crit', value: 100 },
            { statId: 'stat_weakness', value: 100 },
          ],
          rings: [
            { ringId: 'ring_authority', star: 6, stack: { ringId: 'ring_immortality', star: 6 } },
            { ringId: 'ring_authority', star: 6 },
          ],
          ringStackRequired: false,
          note: '',
        },
        {
          characterId: 'char_skull',
          sets: ['set_hit'],
          stats: [{ statId: 'stat_hit', value: 100 }, { statId: 'stat_speed' }],
          rings: [],
          ringStackRequired: false,
          note: 'เน้นสปีดเร็ว ๆ',
        },
        {
          characterId: 'char_doyoung',
          sets: ['set_crit'],
          stats: [
            { statId: 'stat_crit', value: 100 },
            { statId: 'stat_resist', value: 100 },
          ],
          rings: [
            { ringId: 'ring_authority', star: 6, stack: { ringId: 'ring_resurrection' } },
            { ringId: 'ring_authority', star: 6, stack: { ringId: 'ring_immortality', star: 6 } },
          ],
          ringStackRequired: true,
          note: '',
        },
      ],
    },
    {
      ...base,
      id: 'b2',
      lineupId: 'l1',
      description: 'สายถึก ให้รูดี้แบกดาเมจ ใส่ลดดาเมจกับบล็อคให้ถึง แล้วให้เทโอกับปาสคาลเก็บ',
      creatorId: 'u2',
      visibility: 'GROUP',
      shares: [{ groupId: 'g1', hidden: false }],
      counterPets: [],
      formation: 'F3B2',
      placements: [
        { characterId: 'char_rudy', row: 'FRONT', slot: 1 },
        { characterId: 'char_teo', row: 'BACK', slot: 0 },
        { characterId: 'char_pascal', row: 'BACK', slot: 1 },
      ],
      ownPets: ['pet_ari'],
      skillOrder: ['skill_rudy_1', 'skill_pascal_2'],
      recommendations: [
        {
          characterId: 'char_rudy',
          sets: ['set_def', 'set_block'],
          stats: [{ statId: 'stat_dmgreduce', value: 42 }, { statId: 'stat_block', value: 100 }],
          rings: [{ ringId: 'ring_bulwark', star: 6 }],
          ringStackRequired: false,
          note: 'ถึก ๆ',
        },
        { characterId: 'char_teo', sets: ['set_attack'], stats: [{ statId: 'stat_crit', value: 100 }, { statId: 'stat_weakness', value: 100 }], rings: [], ringStackRequired: false, note: '' },
        { characterId: 'char_pascal', sets: ['set_crit'], stats: [{ statId: 'stat_crit', value: 100 }], rings: [{ ringId: 'ring_siege', star: 5 }], ringStackRequired: false, note: '' },
      ],
    },
    {
      ...base,
      id: 'b3',
      lineupId: 'l1',
      description: 'สูตรของ Night Raid ใช้ได้ดีเมื่อศัตรูใช้แทโอ',
      creatorId: 'u3',
      visibility: 'GROUP',
      shares: [{ groupId: 'g2', hidden: false }],
      counterPets: ['pet_taeo', 'pet_pet4'],
      formation: 'F2B3',
      placements: [
        { characterId: 'char_evan', row: 'FRONT', slot: 0 },
        { characterId: 'char_kyle', row: 'BACK', slot: 1 },
        { characterId: 'char_lucy', row: 'BACK', slot: 2 },
      ],
      ownPets: ['pet_pet5'],
      skillOrder: ['skill_kyle_1'],
      recommendations: [
        { characterId: 'char_evan', sets: ['set_block'], stats: [], rings: [], ringStackRequired: false, note: '' },
        { characterId: 'char_kyle', sets: ['set_attack', 'set_crit'], stats: [{ statId: 'stat_crit', value: 100 }, { statId: 'stat_weakness', value: 100 }, { statId: 'stat_speed' }], rings: [{ ringId: 'ring_fortune', star: 6 }], ringStackRequired: false, note: '' },
        { characterId: 'char_lucy', sets: ['set_hp'], stats: [{ statId: 'stat_hpp' }], rings: [], ringStackRequired: false, note: '' },
      ],
    },
    {
      ...base,
      id: 'b4',
      lineupId: 'l1',
      description: 'ยังไม่ได้ทดสอบ เก็บไว้ลองเอง',
      creatorId: 'u1',
      visibility: 'PRIVATE',
      shares: [],
      counterPets: [],
      formation: 'F3B2',
      placements: [
        { characterId: 'char_shane', row: 'FRONT', slot: 0 },
        { characterId: 'char_fai', row: 'FRONT', slot: 1 },
        { characterId: 'char_bidam', row: 'BACK', slot: 0 },
      ],
      ownPets: [],
      skillOrder: [],
      recommendations: [
        { characterId: 'char_shane', sets: [], stats: [], rings: [], ringStackRequired: false, note: '' },
        { characterId: 'char_fai', sets: [], stats: [], rings: [], ringStackRequired: false, note: '' },
        { characterId: 'char_bidam', sets: [], stats: [], rings: [], ringStackRequired: false, note: '' },
      ],
    },
    {
      ...base,
      id: 'b5',
      lineupId: 'l2',
      description: 'ไฟกับบีดัมเปิดสถานะต่อเนื่อง ฮายอนอยู่หลังคอยต้าน',
      creatorId: 'u4',
      visibility: 'PUBLIC',
      shares: [],
      counterPets: [],
      formation: 'F3B2',
      placements: [
        { characterId: 'char_fai', row: 'FRONT', slot: 0 },
        { characterId: 'char_bidam', row: 'FRONT', slot: 2 },
        { characterId: 'char_hayeon', row: 'BACK', slot: 0 },
      ],
      ownPets: ['pet_yu', 'pet_pet6'],
      skillOrder: ['skill_fai_1', 'skill_bidam_1', 'skill_fai_2'],
      recommendations: [
        { characterId: 'char_fai', sets: ['set_attack'], stats: [{ statId: 'stat_hit', value: 100 }, { statId: 'stat_atk' }], rings: [{ ringId: 'ring_accuracy', star: 5 }], ringStackRequired: false, note: '' },
        { characterId: 'char_bidam', sets: ['set_attack', 'set_hit'], stats: [{ statId: 'stat_hit', value: 80 }], rings: [], ringStackRequired: false, note: '' },
        { characterId: 'char_hayeon', sets: ['set_resist'], stats: [{ statId: 'stat_resist', value: 70 }], rings: [], ringStackRequired: false, note: '' },
      ],
    },
    {
      ...base,
      id: 'b6',
      lineupId: 'l2',
      description: 'ใช้ในกิลด์มาม่า (Owner ของ Night Raid ซ่อน Build นี้ไว้)',
      creatorId: 'u1',
      visibility: 'GROUP',
      shares: [
        { groupId: 'g1', hidden: false },
        { groupId: 'g2', hidden: true },
      ],
      counterPets: ['pet_ari'],
      formation: 'F4B1',
      placements: [
        { characterId: 'char_lucy', row: 'FRONT', slot: 0 },
        { characterId: 'char_karma', row: 'FRONT', slot: 3 },
        { characterId: 'char_shane', row: 'BACK', slot: 0 },
      ],
      ownPets: ['pet_taeo'],
      skillOrder: ['skill_shane_1', 'skill_shane_2'],
      recommendations: [
        { characterId: 'char_lucy', sets: ['set_hp'], stats: [], rings: [], ringStackRequired: false, note: '' },
        { characterId: 'char_karma', sets: ['set_def'], stats: [], rings: [], ringStackRequired: false, note: '' },
        { characterId: 'char_shane', sets: ['set_boss', 'set_crit'], stats: [{ statId: 'stat_crit', value: 100 }, { statId: 'stat_weakness', value: 80 }, { statId: 'stat_atk' }], rings: [{ ringId: 'ring_annihilation', star: 6 }], ringStackRequired: false, note: '' },
      ],
    },
    {
      ...base,
      id: 'b7',
      lineupId: 'l1',
      description: 'แชร์ให้ทั้งกิลด์มาม่าและ Night Raid ใช้ได้เมื่อศัตรูใช้อาริ',
      creatorId: 'u1',
      visibility: 'GROUP',
      shares: [
        { groupId: 'g1', hidden: false },
        { groupId: 'g2', hidden: false },
      ],
      counterPets: ['pet_ari'],
      formation: 'F3B2',
      placements: [
        { characterId: 'char_shane', row: 'FRONT', slot: 0 },
        { characterId: 'char_pascal', row: 'FRONT', slot: 1 },
        { characterId: 'char_lucy', row: 'BACK', slot: 0 },
      ],
      ownPets: ['pet_yu'],
      skillOrder: ['skill_shane_1', 'skill_pascal_1'],
      recommendations: [
        { characterId: 'char_shane', sets: ['set_crit'], stats: [{ statId: 'stat_crit', value: 100 }, { statId: 'stat_weakness', value: 100 }], rings: [], ringStackRequired: false, note: '' },
        { characterId: 'char_pascal', sets: ['set_crit', 'set_attack'], stats: [{ statId: 'stat_crit', value: 100 }], rings: [{ ringId: 'ring_siege', star: 6 }], ringStackRequired: false, note: '' },
        { characterId: 'char_lucy', sets: ['set_hp'], stats: [{ statId: 'stat_hpp' }], rings: [], ringStackRequired: false, note: '' },
      ],
    },
    {
      ...base,
      id: 'b8',
      lineupId: 'l1',
      description: 'Owner กิลด์มาม่าซ่อนไว้เพราะใช้ไม่ได้แล้ว แต่ผู้สร้างยังเห็นและแก้ไขได้',
      creatorId: 'u2',
      visibility: 'GROUP',
      shares: [{ groupId: 'g1', hidden: true }],
      counterPets: [],
      formation: 'F2B3',
      placements: [
        { characterId: 'char_kyle', row: 'FRONT', slot: 0 },
        { characterId: 'char_evan', row: 'FRONT', slot: 1 },
        { characterId: 'char_karma', row: 'BACK', slot: 1 },
      ],
      ownPets: ['pet_taeo'],
      skillOrder: ['skill_kyle_2'],
      recommendations: [
        { characterId: 'char_kyle', sets: ['set_attack'], stats: [{ statId: 'stat_crit', value: 90 }], rings: [], ringStackRequired: false, note: '' },
        { characterId: 'char_evan', sets: ['set_block'], stats: [], rings: [], ringStackRequired: false, note: '' },
        { characterId: 'char_karma', sets: ['set_def'], stats: [], rings: [], ringStackRequired: false, note: '' },
      ],
    },
  ]

  // Many public builds on l3 so the list has several pages to browse.
  const pool = ['yungon', 'skull', 'doyoung', 'rudy', 'karma', 'hellenia', 'shane', 'pascal', 'fai', 'bidam', 'biscuit', 'teo', 'hayeon', 'soran']
  const setPool = ['set_crit', 'set_attack', 'set_hit', 'set_def', 'set_boss', 'set_resist']
  for (let n = 0; n < 26; n++) {
    const team = [0, 1, 2].map((k) => `char_${pool[(n * 3 + k * 5) % pool.length]}`)
    builds.push({
      ...base,
      id: `bx${n + 1}`,
      lineupId: 'l3',
      description: `ตัวอย่าง Build ที่ ${n + 1} สำหรับทดลองแบ่งหน้า`,
      creatorId: ['u2', 'u3', 'u4'][n % 3],
      visibility: 'PUBLIC',
      shares: [],
      counterPets: n % 4 === 0 ? ['pet_taeo'] : [],
      formation: 'F3B2',
      placements: [
        { characterId: team[0], row: 'FRONT', slot: 0 },
        { characterId: team[1], row: 'FRONT', slot: 2 },
        { characterId: team[2], row: 'BACK', slot: 1 },
      ],
      ownPets: [['pet_taeo', 'pet_yu', 'pet_ari'][n % 3]],
      skillOrder: [],
      createdAt: iso(29 - n),
      recommendations: team.map((characterId, k) => ({
        characterId,
        sets: [setPool[(n + k) % setPool.length]],
        stats: [{ statId: 'stat_crit', value: 100 }],
        rings: [],
        ringStackRequired: false,
        note: '',
      })),
    })
  }

  // Deterministic pseudo-random votes so stats look realistic.
  let s = 7
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const voters = ['u1', 'u2', 'u3', 'u4', null, null, null, null, null, null, null, null]
  const levels: EquipLevel[] = ['EXACT_EQUIPMENT', 'SAME_SET_DIFFERENT_SUBSTATS', 'CHARACTERS_ONLY']
  const winRate: Record<string, number> = { b1: 0.78, b2: 0.55, b3: 0.66, b5: 0.6, b6: 0.4, b7: 0.7, b8: 0.3 }
  const counts: Record<string, number> = { b1: 34, b2: 12, b3: 9, b5: 18, b6: 6, b7: 10, b8: 5 }
  for (let n = 1; n <= 26; n++) {
    counts[`bx${n}`] = (n * 7) % 13
    winRate[`bx${n}`] = 0.3 + ((n * 37) % 60) / 100
  }
  const votes: Vote[] = []
  for (const buildId of Object.keys(counts)) {
    for (let i = 0; i < counts[buildId]; i++) {
      // Named users vote at most once per build; the rest are anonymised historical votes.
      const userId = i < voters.length ? voters[i] : null
      if (userId === 'u1' && buildId !== 'b2') continue // leave room for the demo user to vote
      const level = levels[Math.floor(rand() * 2.2) % 3]
      const result: BattleResult = rand() < winRate[buildId] - (level === 'CHARACTERS_ONLY' ? 0.2 : 0) ? 'WIN' : 'LOSS'
      votes.push({
        id: `v_${buildId}_${i}`,
        buildId,
        userId,
        result,
        equipLevel: level,
        votedAt: new Date(now - rand() * 30 * DAY).toISOString(),
      })
    }
  }

  // Clone so mutations never leak into the module-level constants (reset must restore them).
  return structuredClone({
    version: DB_VERSION,
    users: USERS,
    groups,
    members,
    characters: CHARACTERS,
    skills: SKILLS,
    pets: PETS,
    sets: SETS,
    rings: RINGS,
    stats: STATS,
    lineups,
    builds,
    votes,
    auditLog: [],
    seq: 1000,
  })
}
