import { describe, expect, it } from 'vitest'
import { fitPlacements, lineupKey, rowSize, teamTitle } from './formation'
import type { Placement } from '../types/domain'

const p = (characterId: string, row: Placement['row'], slot: number): Placement => ({ characterId, row, slot })

describe('lineupKey (FR 3.2)', () => {
  it('ignores order within a row', () => {
    expect(lineupKey('F4B1', [p('a', 'FRONT', 0), p('b', 'FRONT', 3), p('c', 'BACK', 0)])).toBe(
      lineupKey('F4B1', [p('b', 'FRONT', 1), p('a', 'FRONT', 2), p('c', 'BACK', 0)]),
    )
  })
  it('treats another row or formation as a different lineup', () => {
    const base = lineupKey('F3B2', [p('a', 'FRONT', 0), p('b', 'FRONT', 1), p('c', 'BACK', 0)])
    expect(lineupKey('F3B2', [p('a', 'FRONT', 0), p('c', 'FRONT', 1), p('b', 'BACK', 0)])).not.toBe(base)
    expect(lineupKey('F2B3', [p('a', 'FRONT', 0), p('b', 'FRONT', 1), p('c', 'BACK', 0)])).not.toBe(base)
  })
})

describe('formation helpers', () => {
  it('drops placements that no longer fit', () => {
    expect(rowSize('F1B4', 'FRONT')).toBe(1)
    expect(fitPlacements('F1B4', [p('a', 'FRONT', 0), p('b', 'FRONT', 2), p('c', 'BACK', 3)])).toEqual([p('a', 'FRONT', 0), p('c', 'BACK', 3)])
  })
  it('titles a build by its team, back row first', () => {
    const names = { a: { nameTh: 'A' }, b: { nameTh: 'B' }, c: { nameTh: 'C' } }
    expect(teamTitle([p('a', 'FRONT', 1), p('b', 'FRONT', 0), p('c', 'BACK', 0)], names)).toBe('C · B · A')
  })
})
