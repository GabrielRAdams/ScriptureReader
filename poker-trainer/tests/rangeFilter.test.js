import { describe, expect, it } from 'vitest'

import { HAND_RANKING } from '@/lib/handStrength'
import { equityVsRange, expandRange, topPercentRange } from '@/lib/equity'
import { CONTINUE_WEIGHTS, boardProfile, classifyCombo, filterCombosByBoard, weighCombosByBoard } from '@/lib/rangeFilter'
import { ARCHETYPES } from '@/lib/simBots'

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

/** Weight sitting on a given class, as a share of the range's total. */
function shareOf(range, board, klass) {
  const profile = boardProfile(board)
  let matched = 0
  let previous = 0
  for (let i = 0; i < range.combos.length; i += 1) {
    const weight = range.cum[i] - previous
    previous = range.cum[i]
    if (classifyCombo(range.combos[i], profile) === klass) matched += weight
  }
  return matched / range.total
}

describe('weighted ranges', () => {
  const board = ['Kh', '9d', '4s']
  const combos = expandRange(topPercentRange(0.42, HAND_RANKING))

  it('keeps every combo but scales it by how often that class continues', () => {
    const range = weighCombosByBoard(combos, board, 'calledOnce')
    expect(range.combos.length).toBe(combos.length)
    expect(range.total).toBeLessThan(combos.length)
  })

  it('never removes bluffs entirely, even from a double-barreller', () => {
    // The failure mode of a binary filter: believing bettors never bluff means
    // folding every bluff-catcher you ever hold.
    const range = weighCombosByBoard(combos, board, 'betTwice', 0.04)
    expect(shareOf(range, board, 'air')).toBeGreaterThan(0.01)
  })

  it('makes a second barrel much stronger than a first', () => {
    const value = (tier) => shareOf(weighCombosByBoard(combos, board, tier), board, 'strong')
    expect(value('betTwice')).toBeGreaterThan(value('betOnce'))
    // Calling twice does NOT imply a stronger range than calling once in this
    // pool: hands that improve to value raise rather than call again, so the
    // repeat-caller range stays pair-heavy. That is measured, not assumed.
    expect(value('calledOnce')).toBeGreaterThan(value('calledTwice'))
  })

  it('produces compositions that match observed bot behaviour', () => {
    // Measured over 6,000 hands, the bots hold (value/draw/pair/weak/air):
    //   betOnce  46/20/12/10/12     calledOnce  33/ 9/27/14/17
    //   betTwice 74/ 5/ 3/ 5/13     calledTwice 25/21/28/ 3/22
    // The model is calibrated to those, so it has to stay near them.
    const expected = {
      betOnce: { strong: 0.46, air: 0.12 },
      calledOnce: { strong: 0.33, air: 0.17 },
      betTwice: { strong: 0.74, air: 0.13 },
      calledTwice: { strong: 0.25, air: 0.22 },
    }
    // Averaged across boards, because the targets are pool averages: a single
    // texture shifts the class mix a long way on its own.
    const boards = [
      ['Kh', '9d', '4s'],
      ['Ac', '7h', '2d'],
      ['9s', '8s', '5h'],
      ['Qd', 'Jc', '3h'],
      ['7c', '5d', '2s'],
      ['Th', '6h', '6c'],
    ]
    const average = (tier, klass) =>
      boards.reduce((sum, b) => sum + shareOf(weighCombosByBoard(combos, b, tier), b, klass), 0) /
      boards.length

    for (const [tier, target] of Object.entries(expected)) {
      expect(Math.abs(average(tier, 'strong') - target.strong), `${tier} value`).toBeLessThan(0.08)
      expect(Math.abs(average(tier, 'air') - target.air), `${tier} air`).toBeLessThan(0.08)
    }
  })

  it("leaves more air in a bluffer's range than a nit's", () => {
    const nit = weighCombosByBoard(combos, board, 'betTwice', ARCHETYPES.nit.bluff)
    const maniac = weighCombosByBoard(combos, board, 'betTwice', ARCHETYPES.maniac.bluff)
    expect(shareOf(maniac, board, 'air')).toBeGreaterThan(shareOf(nit, board, 'air') * 1.5)
  })

  it('makes a bluff-catcher worth materially more against a bluffer', () => {
    // Ace-high facing two barrels. The absolute number moves with pool
    // composition, so the assertion is on the gap: who bet has to matter enough
    // to change a marginal decision, not merely differ in the third decimal.
    const vs = (bluff) =>
      equityVsRange(
        ['Ad', 'Jd'],
        board,
        weighCombosByBoard(combos, board, 'betTwice', bluff),
        12000,
        seeded(43),
      ).equity

    const vsNit = vs(ARCHETYPES.nit.bluff)
    const vsManiac = vs(ARCHETYPES.maniac.bluff)
    expect(vsManiac).toBeGreaterThan(vsNit)
    expect(vsManiac - vsNit).toBeGreaterThan(0.05)
  })

  it('has a coherent weight table', () => {
    for (const [tier, weights] of Object.entries(CONTINUE_WEIGHTS)) {
      for (const w of Object.values(weights)) {
        expect(w, tier).toBeGreaterThan(0)
        expect(w, tier).toBeLessThanOrEqual(1)
      }
      // The only orderings the measured data actually supports across every
      // tier: value continues more often than junk. Tidier stories — that
      // draws always continue most, or that betting ranges are polarised and
      // calling ranges condensed — each held for some tiers and not others, so
      // none of them is asserted here.
      expect(weights.strong, tier).toBeGreaterThan(weights.air)
      expect(weights.strong, tier).toBeGreaterThan(weights.weak)
    }
  })
})
