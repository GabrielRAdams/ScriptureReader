import { describe, expect, it } from 'vitest'

import { HAND_RANKING } from '@/lib/handStrength'
import { equityVsRange, expandRange, topPercentRange } from '@/lib/equity'
import { boardProfile, classifyCombo, filterCombosByBoard } from '@/lib/rangeFilter'

function seeded(seed = 1) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

describe('classifyCombo', () => {
  const flop = boardProfile(['Kh', '9d', '4s'])

  it('finds sets and two pair', () => {
    expect(classifyCombo(['9c', '9s'], flop)).toBe('strong') // set of nines
    expect(classifyCombo(['Kc', '9h'], flop)).toBe('strong') // two pair
  })

  it('calls top pair strong and lower pairs just a pair', () => {
    expect(classifyCombo(['Ks', 'Qd'], flop)).toBe('strong') // top pair
    expect(classifyCombo(['Ac', 'Ad'], flop)).toBe('strong') // overpair
    expect(classifyCombo(['9h', '7c'], flop)).toBe('pair') // middle pair
    expect(classifyCombo(['4h', '3c'], flop)).toBe('pair') // bottom pair
  })

  it('finds flush draws that use the hole cards', () => {
    const twoTone = boardProfile(['Kh', '9h', '4s'])
    expect(classifyCombo(['Ah', 'Th'], twoTone)).toBe('draw')
    // Same hand on a rainbow board is not a draw.
    expect(classifyCombo(['Ah', 'Th'], boardProfile(['Kh', '9d', '4s']))).not.toBe('draw')
  })

  it('separates open-enders from gutshots', () => {
    const connected = boardProfile(['9d', '8c', '2h'])
    // 7-6 makes 6-7-8-9: a five or a ten completes it, so it is open-ended.
    expect(classifyCombo(['7s', '6h'], connected)).toBe('draw')
    // J-T makes 8-9-T-J: a seven or a queen completes it.
    expect(classifyCombo(['Js', 'Th'], connected)).toBe('draw')
    // J-7 makes 7-8-9-J: only a ten completes it. That is a gutshot.
    expect(classifyCombo(['Js', '7h'], connected)).toBe('weak')
    // 6-5 makes 5-6-8-9: only a seven completes it.
    expect(classifyCombo(['6s', '5h'], connected)).toBe('weak')
  })

  it('treats two overcards as weak and everything else as air', () => {
    const low = boardProfile(['8d', '5c', '2h'])
    expect(classifyCombo(['Ad', 'Kc'], low)).toBe('weak')
    expect(classifyCombo(['7d', '3c'], low)).toBe('air')
  })

  it('does not report draws once the board is complete', () => {
    const river = boardProfile(['Kh', '9h', '4s', '2c', '7d'])
    // Two hearts in hand cannot be a "draw" on a finished board.
    expect(classifyCombo(['Ah', 'Th'], river)).not.toBe('draw')
  })
})

describe('filterCombosByBoard', () => {
  const board = ['Kh', '9d', '4s']
  const wide = expandRange(topPercentRange(0.45, HAND_RANKING))

  it('narrows a wide range', () => {
    const filtered = filterCombosByBoard(wide, board, 'pair')
    expect(filtered.length).toBeLessThan(wide.length)
    expect(filtered.length).toBeGreaterThan(0)
  })

  it('keeps the hands that connected and drops the ones that missed', () => {
    const filtered = filterCombosByBoard(wide, board, 'pair')
    const has = (a, b) => filtered.some((c) => c.includes(a) && c.includes(b))
    expect(has('Ks', 'Qs'), 'top pair should survive').toBe(true)
    expect(has('9h', '9s'), 'a set should survive').toBe(true)
    // Queen-jack has neither a pair nor a draw here.
    expect(has('Qd', 'Jc'), 'missed broadway should be filtered out').toBe(false)
  })

  it('keeps draws even though they lose at showdown right now', () => {
    const twoTone = ['Kh', '9h', '4s']
    const filtered = filterCombosByBoard(wide, twoTone, 'pair')
    expect(filtered.some((c) => c.includes('Ah') && c.includes('Th'))).toBe(true)
  })

  it('gets tighter as the tier rises', () => {
    const float = filterCombosByBoard(wide, board, 'weak').length
    const call = filterCombosByBoard(wide, board, 'pair').length
    const value = filterCombosByBoard(wide, board, 'strong').length
    expect(call).toBeLessThan(float)
    expect(value).toBeLessThan(call)
  })

  it('returns the range unchanged preflop', () => {
    expect(filterCombosByBoard(wide, [], 'pair')).toBe(wide)
  })

  it('falls back rather than producing an empty range', () => {
    // A tiny range that connects with nothing would otherwise filter to zero.
    const tiny = expandRange(['72o'])
    const filtered = filterCombosByBoard(tiny, ['Ah', 'Kd', 'Qs'], 'strong')
    expect(filtered.length).toBeGreaterThan(0)
  })
})

describe('the point of filtering', () => {
  it('a filtered range is genuinely harder to beat', () => {
    // Second pair against "top 45% of hands" looks fine; against the part of
    // that range which would still be betting, it is not.
    const board = ['Kh', '9d', '4s']
    const wide = expandRange(topPercentRange(0.45, HAND_RANKING))
    const continuing = filterCombosByBoard(wide, board, 'pair')

    const vsWide = equityVsRange(['9c', '8c'], board, wide, 4000, seeded(3)).equity
    const vsContinuing = equityVsRange(['9c', '8c'], board, continuing, 4000, seeded(3)).equity

    expect(vsContinuing).toBeLessThan(vsWide)
    // And the gap is big enough to change a decision, not just noise.
    expect(vsWide - vsContinuing).toBeGreaterThan(0.05)
  })
})
