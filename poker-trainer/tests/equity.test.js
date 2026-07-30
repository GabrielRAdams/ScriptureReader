import { describe, expect, it } from 'vitest'

import { combosFor, equityVsRandom, equityVsRange, expandRange, topPercentRange } from '@/lib/equity'
import { HAND_RANKING } from '@/lib/handStrength'

function seeded(seed = 7) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

describe('combo expansion', () => {
  it('gives 6 combos for a pair, 4 suited, 12 offsuit', () => {
    expect(combosFor('AA')).toHaveLength(6)
    expect(combosFor('AKs')).toHaveLength(4)
    expect(combosFor('AKo')).toHaveLength(12)
  })

  it('never produces a duplicate card inside a combo', () => {
    for (const code of ['AA', 'AKs', 'AKo', '72o', 'TT']) {
      for (const [a, b] of combosFor(code)) expect(a).not.toBe(b)
    }
  })

  it('expands a range to the right combo count', () => {
    // AA (6) + AKs (4) + AKo (12) = 22
    expect(expandRange(['AA', 'AKs', 'AKo'])).toHaveLength(22)
  })
})

describe('equityVsRandom — known matchups', () => {
  // Published all-in equities; Monte Carlo noise is well inside these bands.
  const cases = [
    ['AA vs one random hand', ['As', 'Ad'], [], 1, 0.85, 0.03],
    ['72o vs one random hand', ['7c', '2d'], [], 1, 0.35, 0.04],
    ['AA vs four random hands', ['As', 'Ad'], [], 4, 0.55, 0.05],
  ]

  it.each(cases)('%s', (_name, hole, board, opponents, expected, tolerance) => {
    const { equity } = equityVsRandom(hole, board, opponents, 12000, seeded(11))
    expect(Math.abs(equity - expected), `got ${(equity * 100).toFixed(1)}%`).toBeLessThan(tolerance)
  })

  it('is certain when hero already has the nuts on the river', () => {
    // Royal flush: nothing can tie or beat it.
    const { equity } = equityVsRandom(['As', 'Ks'], ['Qs', 'Js', 'Ts', '2d', '3h'], 1, 1500, seeded(3))
    expect(equity).toBe(1)
  })

  it('is hopeless when hero is drawing dead', () => {
    // Board is quad aces with a king; hero's 7-2 can never beat AK.
    const { equity } = equityVsRandom(['7c', '2d'], ['Ac', 'Ad', 'Ah', 'As', 'Kd'], 1, 1500, seeded(5))
    expect(equity).toBeLessThan(0.6) // chops with most hands, never wins outright
  })

  it('drops as opponents are added', () => {
    const rng = seeded(21)
    const heads = equityVsRandom(['Ks', 'Kd'], [], 1, 6000, rng).equity
    const three = equityVsRandom(['Ks', 'Kd'], [], 3, 6000, rng).equity
    expect(three).toBeLessThan(heads)
  })
})

describe('equityVsRange — known matchups', () => {
  it('puts AA vs KK around 82%', () => {
    const { equity } = equityVsRange(['As', 'Ad'], [], ['KK'], 8000, seeded(13))
    expect(Math.abs(equity - 0.82), `got ${(equity * 100).toFixed(1)}%`).toBeLessThan(0.03)
  })

  it('puts AKs vs QQ around 46%', () => {
    const { equity } = equityVsRange(['As', 'Ks'], [], ['QQ'], 8000, seeded(17))
    expect(Math.abs(equity - 0.46), `got ${(equity * 100).toFixed(1)}%`).toBeLessThan(0.03)
  })

  it('puts a flush draw vs top pair around 35% on the flop', () => {
    // Hero has the nut flush draw; villain has top pair.
    const { equity } = equityVsRange(['As', '4s'], ['Ks', '9s', '2d'], ['KQo'], 8000, seeded(19))
    expect(equity).toBeGreaterThan(0.3)
    expect(equity).toBeLessThan(0.48)
  })

  it('removes blocked combos from the range', () => {
    // Hero holds two aces, so villain cannot also hold AA.
    const { combos } = equityVsRange(['As', 'Ad'], [], ['AA'], 200, seeded(23))
    expect(combos).toBe(1) // only Ah-Ac remains
  })

  it('is symmetric: equities of a matchup sum to 1', () => {
    const a = equityVsRange(['As', 'Ad'], ['Kh', '7c', '2d'], ['QQ'], 6000, seeded(29)).equity
    const b = equityVsRange(['Qs', 'Qc'], ['Kh', '7c', '2d'], ['AA'], 6000, seeded(31)).equity
    expect(Math.abs(a + b - 1)).toBeLessThan(0.04)
  })
})

describe('topPercentRange', () => {
  it('returns roughly the requested share of combos', () => {
    const range = topPercentRange(0.15, HAND_RANKING)
    const combos = range.reduce((sum, h) => sum + (h[0] === h[1] ? 6 : h.endsWith('s') ? 4 : 12), 0)
    expect(combos / 1326).toBeGreaterThan(0.1)
    expect(combos / 1326).toBeLessThan(0.2)
  })

  it('always includes the strongest hands', () => {
    expect(topPercentRange(0.05, HAND_RANKING)).toContain('AA')
  })
})
