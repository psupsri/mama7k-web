import { useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as buildsApi from '../api/builds'
import type { BuildInput } from '../api/builds'
import type {
  CharacterRecommendation,
  MasterItem,
  Placement,
  RingOption,
  Row,
  SkillRef,
  Star,
  Visibility,
} from '../types/domain'
import { useBuild, useLineup, useMaster, useMyGroups, type MasterLookup } from '../hooks/queries'
import { FORMATIONS, fitPlacements, SKILL_LABEL } from '../lib/formation'
import { VISIBILITY_HINT, VISIBILITY_LABEL } from '../lib/labels'
import { EnemyLineupCard } from '../components/EnemyLineupCard'
import { FormationEditor } from '../components/FormationEditor'
import { Icon } from '../components/Icon'
import { ImageSlot } from '../components/ImageSlot'
import { Picker } from '../components/Picker'
import { ErrorState, Loading } from '../components/States'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/errors'
import { RequireAuth } from './RequireAuth'

const STARS: Star[] = [6, 5, 4]

const emptyRec = (characterId: string): CharacterRecommendation => ({
  characterId,
  sets: [],
  stats: [],
  rings: [],
  ringStackRequired: false,
  note: '',
})

export function BuildEditorPage() {
  return (
    <RequireAuth verified>
      <BuildEditorLoader />
    </RequireAuth>
  )
}

function BuildEditorLoader() {
  const { buildId } = useParams()
  const [params] = useSearchParams()
  const existing = useBuild(buildId)
  const lineupId = buildId ? existing.data?.build.lineupId : (params.get('lineup') ?? undefined)
  const lineup = useLineup(lineupId)
  const m = useMaster()

  if (!buildId && !params.get('lineup')) return <div className="page"><ErrorState error={new Error('ต้องเลือกบ้านศัตรูก่อนสร้าง Build')} /></div>
  if (existing.isLoading || lineup.isLoading || !m) return <div className="page"><Loading /></div>
  if (existing.error) return <div className="page"><ErrorState error={existing.error} /></div>
  if (lineup.error || !lineup.data) return <div className="page"><ErrorState error={lineup.error} /></div>
  if (existing.data && !existing.data.canEdit) return <div className="page"><ErrorState error={new Error('แก้ไขได้เฉพาะผู้สร้าง Build')} /></div>

  const b = existing.data?.build
  const initial: BuildInput = b
    ? {
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
      }
    : {
        lineupId: lineup.data.id,
        description: '',
        visibility: 'PUBLIC',
        groupIds: [],
        counterPets: [],
        formation: 'F3B2',
        placements: [],
        ownPets: [],
        skillOrder: [],
        speed: null,
        recommendations: [],
      }

  return <BuildEditor m={m} lineup={lineup.data} initial={initial} buildId={buildId} />
}

type PickerState =
  | { kind: 'slot'; row: Row; slot: number }
  | { kind: 'counterPets' }
  | { kind: 'ownPets' }
  | { kind: 'sets'; characterId: string }
  | null

function BuildEditor({
  m,
  lineup,
  initial,
  buildId,
}: {
  m: MasterLookup
  lineup: NonNullable<ReturnType<typeof useLineup>['data']>
  initial: BuildInput
  buildId?: string
}) {
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const groups = useMyGroups()
  const [f, setF] = useState<BuildInput>(initial)
  const [picker, setPicker] = useState<PickerState>(null)
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof BuildInput>(k: K, v: BuildInput[K]) => setF((x) => ({ ...x, [k]: v }))

  const save = useMutation({
    mutationFn: () => (buildId ? buildsApi.updateBuild(buildId, f) : buildsApi.createBuild(f)),
    onSuccess: (b) => {
      qc.invalidateQueries()
      toast(buildId ? 'บันทึกการแก้ไขแล้ว' : 'สร้าง Build แล้ว')
      nav(`/lineups/${b.lineupId}/b/${b.id}`)
    },
    onError: (e) => toast(errorMessage(e), true),
  })

  // ---- team helpers: keep skills & recommendations in sync with placed characters ----
  const applyPlacements = (placements: Placement[]) => {
    const ids = placements.map((p) => p.characterId)
    setF((x) => ({
      ...x,
      placements,
      skillOrder: x.skillOrder.filter((s) => ids.includes(s.characterId)),
      recommendations: ids.map((id) => x.recommendations.find((r) => r.characterId === id) ?? emptyRec(id)),
    }))
  }

  // Tapping an upper/lower skill box reserves it as the next order, or releases it.
  const toggleSkill = (skill: SkillRef) => {
    const same = (x: SkillRef) => x.characterId === skill.characterId && x.slot === skill.slot
    if (f.skillOrder.some(same)) set('skillOrder', f.skillOrder.filter((x) => !same(x)))
    else if (f.skillOrder.length >= 3) toast('จองสกิลได้สูงสุด 3 ลำดับ', true)
    else set('skillOrder', [...f.skillOrder, skill])
  }

  const updateRec = (characterId: string, patch: Partial<CharacterRecommendation>) =>
    setF((x) => ({
      ...x,
      recommendations: x.recommendations.map((r) => (r.characterId === characterId ? { ...r, ...patch } : r)),
    }))

  const slotPick = picker?.kind === 'slot' ? picker : null
  const slotChar = slotPick ? f.placements.find((p) => p.row === slotPick.row && p.slot === slotPick.slot) : undefined


  // ---- client-side checks (the API validates again) ----
  const problems: string[] = []
  if (f.placements.length !== 3) problems.push('จัดตัวละครให้ครบ 3 ตัว')
  if (f.visibility === 'GROUP' && f.groupIds.length === 0) problems.push('เลือกอย่างน้อย 1 Group')
  for (const r of f.recommendations) {
    if (r.ringStackRequired && r.rings.some((o) => !o.stack))
      problems.push(`${m.character[r.characterId]?.nameTh}: ทุกตัวเลือกแหวนต้องมีแหวนซ้อน`)
  }

  const submit = () => {
    setSubmitted(true)
    if (problems.length === 0) save.mutate()
  }

  const orderedRecs = [...f.placements]
    .sort((a, b) => (a.row === 'BACK' ? 0 : 1) - (b.row === 'BACK' ? 0 : 1) || a.slot - b.slot)
    .map((p) => f.recommendations.find((r) => r.characterId === p.characterId)!)
    .filter(Boolean)

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <h1>{buildId ? 'แก้ไข Build' : 'สร้าง Build'}</h1>

      <EditorSection title="1. บ้านศัตรู" hint="บ้านศัตรูเปลี่ยนภายหลังไม่ได้">
        <EnemyLineupCard lineup={lineup} />
        <div className="stack" style={{ gap: 6 }}>
          <span className="sublabel">Pet ศัตรูที่ Build นี้รับมือได้ (ไม่เลือก = รับมือได้ทุกตัว)</span>
          <OrderedChips m={m} kind="pet" ids={f.counterPets} primary={false} onChange={(v) => set('counterPets', v)} onAdd={() => setPicker({ kind: 'counterPets' })} addLabel="เลือก Pet ศัตรู" />
        </div>
      </EditorSection>

      <EditorSection title="2. ทีมบุก">
        <div className="row wrap">
          {FORMATIONS.map((fm) => (
            <button
              key={fm.type}
              type="button"
              className="chip"
              aria-pressed={f.formation === fm.type}
              onClick={() => {
                set('formation', fm.type)
                applyPlacements(fitPlacements(fm.type, f.placements))
              }}
            >
              {fm.label}
            </button>
          ))}
        </div>
        <FormationEditor
          formation={f.formation}
          placements={f.placements}
          onChange={applyPlacements}
          onPickSlot={(row, slot) => setPicker({ kind: 'slot', row, slot })}
          skillOrder={f.skillOrder}
          onSkillToggle={toggleSkill}
        />
        <span className="small muted">
          ตัวละคร {f.placements.length}/3 · ช่องเล็กข้างตัวละครคือสกิลบน/ล่าง แตะเพื่อจองตามลำดับ (แตะซ้ำเพื่อยกเลิก)
        </span>
      </EditorSection>

      <EditorSection title="3. ลำดับสกิลจอง" hint="แตะช่องสกิลบน/ล่างข้างตัวละครในข้อ 2 · สูงสุด 3 ลำดับ">
        {f.skillOrder.length > 0 && (
          <ol className="stack" style={{ gap: 6, margin: 0, padding: 0, listStyle: 'none' }}>
            {f.skillOrder.map((s, i) => (
              <li key={`${s.characterId}-${s.slot}`} className="row" style={{ padding: '6px 10px', borderRadius: 10, background: 'var(--surface-2)' }}>
                <span className="num" style={{ color: 'var(--gold-text)', width: 16 }}>
                  {i + 1}
                </span>
                <ImageSlot item={m.character[s.characterId]} size={28} />
                <span className="grow">
                  {m.character[s.characterId]?.nameTh} <span className="small muted">{SKILL_LABEL[s.slot]}</span>
                </span>
                <MoveButtons index={i} length={f.skillOrder.length} onMove={(to) => set('skillOrder', move(f.skillOrder, i, to))} />
                <button type="button" className="icon-btn" aria-label="ลบ" onClick={() => set('skillOrder', f.skillOrder.filter((_, j) => j !== i))}>
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ol>
        )}
        {f.skillOrder.length === 0 && <div className="dashed-box">ยังไม่ได้จองสกิล</div>}
      </EditorSection>

      <EditorSection title="4. Pet และ Speed">
        <div className="stack" style={{ gap: 6 }}>
          <span className="sublabel">Pet ที่แนะนำ (ตัวแรกคือตัวหลัก ไม่เลือก = อะไรก็ได้)</span>
          <OrderedChips m={m} kind="pet" ids={f.ownPets} primary onChange={(v) => set('ownPets', v)} onAdd={() => setPicker({ kind: 'ownPets' })} addLabel="เพิ่ม Pet" />
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="sublabel">เงื่อนไข Speed</span>
          <div className="row wrap">
            <button type="button" className="chip" aria-pressed={!f.speed} onClick={() => set('speed', null)}>
              ไม่ระบุ
            </button>
            <button type="button" className="chip" aria-pressed={f.speed?.kind === 'FASTER'} onClick={() => set('speed', { kind: 'FASTER' })}>
              เร็วกว่าฝั่งตรงข้าม
            </button>
            <button type="button" className="chip" aria-pressed={f.speed?.kind === 'MIN'} onClick={() => set('speed', { kind: 'MIN', value: f.speed?.kind === 'MIN' ? f.speed.value : 100 })}>
              อย่างน้อย…
            </button>
            {f.speed?.kind === 'MIN' && (
              <input
                className="input input-sm"
                style={{ width: 110 }}
                type="number"
                min={1}
                aria-label="Speed ขั้นต่ำ"
                value={f.speed.value}
                onChange={(e) => set('speed', { kind: 'MIN', value: Number(e.target.value) })}
              />
            )}
          </div>
        </div>
      </EditorSection>

      <EditorSection title="5. คำแนะนำต่อตัวละคร" hint="เซ็ต, สเตตัสรวม และแหวน">
        {orderedRecs.length === 0 ? (
          <div className="empty">จัดตัวละครในทีมก่อน</div>
        ) : (
          <div className="grid-auto">
            {orderedRecs.map((r) => (
              <RecEditor key={r.characterId} m={m} rec={r} onChange={(p) => updateRec(r.characterId, p)} onAddSets={() => setPicker({ kind: 'sets', characterId: r.characterId })} />
            ))}
          </div>
        )}
      </EditorSection>

      <EditorSection title="6. คำอธิบายและการแชร์">
        <label className="field">
          <span>คำอธิบาย</span>
          <textarea className="textarea" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="วิธีเล่น ลำดับการกด ข้อควรระวัง" />
        </label>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
          <legend className="sublabel" style={{ marginBottom: 8 }}>
            ใครดูได้
          </legend>
          <div className="grid-auto" style={{ gap: 8 }}>
            {(['PUBLIC', 'GROUP', 'PRIVATE'] as Visibility[]).map((v) => (
              <label key={v} className="radio-card">
                <input type="radio" name="visibility" checked={f.visibility === v} onChange={() => set('visibility', v)} />
                <span className="stack" style={{ gap: 2 }}>
                  <strong style={{ fontWeight: 600 }}>{VISIBILITY_LABEL[v]}</strong>
                  <span className="small muted">{VISIBILITY_HINT[v]}</span>
                </span>
              </label>
            ))}
          </div>
          {buildId && initial.visibility !== f.visibility && (
            <div className="banner">การเปลี่ยนประเภทการแชร์จะยกเลิกการแชร์กับ Group เดิมทั้งหมด (โหวตเดิมยังอยู่)</div>
          )}
          {f.visibility === 'GROUP' && (
            <div className="stack" style={{ gap: 6 }}>
              <span className="sublabel">แชร์ให้ Group</span>
              {groups.data?.length === 0 && <span className="muted small">คุณยังไม่ได้อยู่ใน Group ใด</span>}
              {groups.data?.map((g) => (
                <label key={g.group.id} className="checkbox">
                  <input
                    type="checkbox"
                    checked={f.groupIds.includes(g.group.id)}
                    onChange={(e) =>
                      set('groupIds', e.target.checked ? [...f.groupIds, g.group.id] : f.groupIds.filter((x) => x !== g.group.id))
                    }
                  />
                  {g.group.name} <span className="faint small">({g.memberCount} คน)</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </EditorSection>

      <div className="action-bar">
        {submitted && problems.length > 0 && (
          <ul className="error-text" style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={() => nav(-1)}>
            ยกเลิก
          </button>
          <button type="button" className="btn btn-primary btn-lg" disabled={save.isPending} onClick={submit}>
            {buildId ? 'บันทึกการแก้ไข' : 'สร้าง Build'}
          </button>
        </div>
      </div>

      {/* ---- pickers ---- */}
      {slotPick && (
        <Picker
          title={slotChar ? `เปลี่ยน ${m.character[slotChar.characterId]?.nameTh}` : 'เลือกตัวละคร'}
          items={m.characters}
          selected={slotChar ? [slotChar.characterId] : []}
          disabledIds={f.placements.length >= 3 && !slotChar ? m.characters.map((c) => c.id) : f.placements.map((p) => p.characterId)}
          onChange={([id]) => {
            const rest = f.placements.filter((p) => !(p.row === slotPick.row && p.slot === slotPick.slot) && p.characterId !== id)
            applyPlacements([...rest, { characterId: id, row: slotPick.row, slot: slotPick.slot }])
          }}
          onClear={slotChar ? () => applyPlacements(f.placements.filter((p) => p !== slotChar)) : undefined}
          onClose={() => setPicker(null)}
        />
      )}
      {picker?.kind === 'counterPets' && (
        <Picker title="Pet ศัตรูที่รับมือได้" items={m.pets} selected={f.counterPets} multiple onChange={(v) => set('counterPets', v)} onClose={() => setPicker(null)} />
      )}
      {picker?.kind === 'ownPets' && (
        <Picker title="Pet ที่แนะนำ" items={m.pets} selected={f.ownPets} multiple onChange={(v) => set('ownPets', v)} onClose={() => setPicker(null)} />
      )}
      {picker?.kind === 'sets' && (
        <Picker
          title={`เซ็ตสำหรับ ${m.character[picker.characterId]?.nameTh}`}
          items={m.sets}
          round
          multiple
          selected={f.recommendations.find((r) => r.characterId === picker.characterId)?.sets ?? []}
          onChange={(v) => updateRec(picker.characterId, { sets: v })}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}

// ---------- pieces ----------

function EditorSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card stack" style={{ gap: 14 }}>
      <div className="row between wrap">
        <h2 style={{ fontSize: 17 }}>{title}</h2>
        {hint && <span className="small muted">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

function move<T>(arr: T[], from: number, to: number) {
  const next = [...arr]
  const [x] = next.splice(from, 1)
  next.splice(to, 0, x)
  return next
}

function MoveButtons({ index, length, onMove }: { index: number; length: number; onMove: (to: number) => void }) {
  return (
    <>
      <button type="button" className="icon-btn" aria-label="เลื่อนขึ้น" disabled={index === 0} onClick={() => onMove(index - 1)}>
        <Icon name="arrowUp" size={16} />
      </button>
      <button type="button" className="icon-btn" aria-label="เลื่อนลง" disabled={index === length - 1} onClick={() => onMove(index + 1)}>
        <Icon name="arrowDown" size={16} />
      </button>
    </>
  )
}

/** Chips for an ordered id list. With `primary`, the first item is the main pick. */
function OrderedChips({
  m,
  kind,
  ids,
  primary,
  onChange,
  onAdd,
  addLabel,
}: {
  m: MasterLookup
  kind: 'pet' | 'set'
  ids: string[]
  primary: boolean
  onChange: (ids: string[]) => void
  onAdd: () => void
  addLabel: string
}) {
  const lookup: Record<string, MasterItem> = kind === 'pet' ? m.pet : m.set
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {ids.map((id, i) => {
        const isPrimary = primary && i === 0
        return (
          <span key={id} className={`chip chip-img${isPrimary ? ' chip-primary' : ''}`} style={{ paddingRight: 4 }}>
            <ImageSlot item={lookup[id]} size={26} round={kind === 'set'} />
            {lookup[id]?.nameTh}
            {primary && !isPrimary && (
              <button type="button" className="btn btn-sm btn-ghost" style={{ minHeight: 26, padding: '0 6px' }} onClick={() => onChange([id, ...ids.filter((x) => x !== id)])}>
                ตั้งเป็นหลัก
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              style={{ width: 26, height: 26, color: 'inherit' }}
              aria-label={`เอา ${lookup[id]?.nameTh} ออก`}
              onClick={() => onChange(ids.filter((x) => x !== id))}
            >
              <Icon name="close" size={14} />
            </button>
          </span>
        )
      })}
      <button type="button" className="btn btn-sm" onClick={onAdd}>
        <Icon name="plus" size={14} /> {addLabel}
      </button>
    </div>
  )
}

function RecEditor({
  m,
  rec,
  onChange,
  onAddSets,
}: {
  m: MasterLookup
  rec: CharacterRecommendation
  onChange: (p: Partial<CharacterRecommendation>) => void
  onAddSets: () => void
}) {
  const c = m.character[rec.characterId]
  const activeRings = m.rings.filter((r) => r.active)
  const activeStats = m.stats.filter((s) => s.active)
  const updateRing = (i: number, patch: Partial<RingOption>) => onChange({ rings: rec.rings.map((r, j) => (j === i ? { ...r, ...patch } : r)) })

  return (
    <article className="card stack" style={{ gap: 14, background: 'var(--bg)' }}>
      <div className="row">
        <ImageSlot item={c} size={44} />
        <h3>{c?.nameTh}</h3>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <span className="sublabel">เซ็ต (ตัวแรกคือเซ็ตหลัก ใส่เซ็ตใดเซ็ตหนึ่ง)</span>
        <OrderedChips m={m} kind="set" ids={rec.sets} primary onChange={(sets) => onChange({ sets })} onAdd={onAddSets} addLabel="เพิ่มเซ็ต" />
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <span className="sublabel">สเตตัสรวม (สูงสุด 4 · เว้นค่าว่าง = เน้น)</span>
        {rec.stats.map((s, i) => (
          <div key={i} className="row">
            <select
              className="select input-sm grow"
              aria-label="สเตตัส"
              value={s.statId}
              onChange={(e) => onChange({ stats: rec.stats.map((x, j) => (j === i ? { ...x, statId: e.target.value } : x)) })}
            >
              {activeStats.map((st) => (
                <option key={st.id} value={st.id} disabled={st.id !== s.statId && rec.stats.some((x) => x.statId === st.id)}>
                  {st.nameTh}
                </option>
              ))}
            </select>
            <input
              className="input input-sm"
              style={{ width: 90 }}
              type="number"
              min={0}
              placeholder="เน้น"
              aria-label="ค่าเป้าหมาย"
              value={s.value ?? ''}
              onChange={(e) =>
                onChange({
                  stats: rec.stats.map((x, j) => (j === i ? { ...x, value: e.target.value === '' ? undefined : Number(e.target.value) } : x)),
                })
              }
            />
            <button type="button" className="icon-btn" aria-label="ลบสเตตัส" onClick={() => onChange({ stats: rec.stats.filter((_, j) => j !== i) })}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
        {rec.stats.length < 4 && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              const free = activeStats.find((st) => !rec.stats.some((x) => x.statId === st.id))
              if (free) onChange({ stats: [...rec.stats, { statId: free.id }] })
            }}
          >
            <Icon name="plus" size={14} /> เพิ่มสเตตัส
          </button>
        )}
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <span className="sublabel">แหวน (ตัวเลือกแรกคือตัวหลัก · ไม่เพิ่ม = อะไรก็ได้)</span>
        {rec.rings.map((r, i) => {
          const missingStack = rec.ringStackRequired && !r.stack
          return (
            <div key={i} className={`stack ring-row${i === 0 ? ' primary' : ''}`} style={{ gap: 8, alignItems: 'stretch', outline: missingStack ? '1px solid var(--danger)' : undefined }}>
              <div className="row wrap">
                <span className={`badge ${i === 0 ? 'badge-gold' : 'badge-soft'}`}>{i === 0 ? 'หลัก' : 'ใช้แทนได้'}</span>
                <span className="grow" />
                <MoveButtons index={i} length={rec.rings.length} onMove={(to) => onChange({ rings: move(rec.rings, i, to) })} />
                <button type="button" className="icon-btn" aria-label="ลบตัวเลือกแหวน" onClick={() => onChange({ rings: rec.rings.filter((_, j) => j !== i) })}>
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className="row">
                <ImageSlot item={m.ring[r.ringId]} size={32} round />
                <select className="select input-sm grow" aria-label="แหวนหลัก" value={r.ringId} onChange={(e) => updateRing(i, { ringId: e.target.value })}>
                  {activeRings.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nameTh}
                    </option>
                  ))}
                </select>
                <select className="select input-sm" style={{ width: 76 }} aria-label="ดาวแหวนหลัก" value={r.star} onChange={(e) => updateRing(i, { star: Number(e.target.value) as Star })}>
                  {STARS.map((s) => (
                    <option key={s} value={s}>
                      ★{s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row">
                <span className="small muted" style={{ width: 32, textAlign: 'center' }}>
                  ซ้อน
                </span>
                <select
                  className="select input-sm grow"
                  aria-label="แหวนซ้อน"
                  value={r.stack?.ringId ?? ''}
                  onChange={(e) => updateRing(i, { stack: e.target.value ? { ringId: e.target.value, star: r.stack?.star } : undefined })}
                >
                  <option value="">ไม่ซ้อน</option>
                  {activeRings
                    .filter((x) => x.id !== r.ringId)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nameTh}
                      </option>
                    ))}
                </select>
                <select
                  className="select input-sm"
                  style={{ width: 76 }}
                  aria-label="ดาวแหวนซ้อน"
                  disabled={!r.stack}
                  value={r.stack?.star ?? ''}
                  onChange={(e) => r.stack && updateRing(i, { stack: { ...r.stack, star: e.target.value ? (Number(e.target.value) as Star) : undefined } })}
                >
                  <option value="">-</option>
                  {STARS.map((s) => (
                    <option key={s} value={s}>
                      ★{s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
        <div className="row wrap between">
          <button
            type="button"
            className="btn btn-sm"
            disabled={activeRings.length === 0}
            title={activeRings.length === 0 ? 'ยังไม่มีแหวนใน Master Data' : undefined}
            onClick={() => onChange({ rings: [...rec.rings, { ringId: activeRings[0].id, star: 6 }] })}
          >
            <Icon name="plus" size={14} /> เพิ่มตัวเลือกแหวน
          </button>
          <label className="checkbox small">
            <input type="checkbox" checked={rec.ringStackRequired} onChange={(e) => onChange({ ringStackRequired: e.target.checked })} />
            ต้องซ้อนแหวนเท่านั้น
          </label>
        </div>
      </div>

      <label className="field">
        <span className="sublabel">หมายเหตุ</span>
        <input className="input input-sm" value={rec.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="เช่น ถึก ๆ, สปีดเยอะ ๆ" />
      </label>
    </article>
  )
}
