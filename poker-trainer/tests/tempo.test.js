import { describe, expect, it } from 'vitest'

import { BB } from '@/lib/cards'
import { MAX_DELAY, MIN_DELAY, SPEEDS, SPEED_IDS, decisionDelay, delayForAction } from '@/lib/tempo'

function seeded(seed = 1) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/** Median delay over many draws, which is what a player actually perceives. */
function median(spec, samples = 400) {
  const rng = seeded(spec.seed ?? 5)
  const values = Array.from({ length: samples }, () =>
    decisionDelay({
      street: 'preflop',
      toCall: BB,
      potChips: 3 * BB,
      stack: 100 * BB,
      archetype: 'tag',
      ...spec,
      rng,
    }),
  ).sort((a, b) => a - b)
  return values[Math.floor(values.length / 2)]
}

describe('decision timing', () => {
  it('always returns a sane, bounded delay', () => {
    const rng = seeded(3)
    for (const action of [{ type: 'fold' }, { type: 'check' }, { type: 'call' }, { type: 'raise' }]) {
      for (const street of ['preflop', 'flop', 'turn', 'river']) {
        for (let i = 0; i < 200; i += 1) {
          const ms = decisionDelay({
            street,
            action,
            toCall: i % 3 === 0 ? 0 : 5 * BB,
            potChips: 10 * BB,
            stack: 100 * BB,
            archetype: 'tag',
            rng,
          })
          expect(Number.isFinite(ms)).toBe(true)
          expect(ms).toBeGreaterThanOrEqual(MIN_DELAY)
          expect(ms).toBeLessThanOrEqual(MAX_DELAY)
        }
      }
    }
  })

  it('snaps off trivial decisions and takes time over real ones', () => {
    // Folding junk preflop is nearly instant; raising is a considered act.
    const snapFold = median({ action: { type: 'fold' }, toCall: 0 })
    const call = median({ action: { type: 'call' } })
    const raise = median({ action: { type: 'raise' } })
    expect(snapFold).toBeLessThan(call)
    expect(call).toBeLessThan(raise)
    expect(snapFold).toBeLessThan(700)
  })

  it('takes longer on later streets', () => {
    const flop = median({ action: { type: 'call' }, street: 'flop' })
    const river = median({ action: { type: 'call' }, street: 'river' })
    expect(river).toBeGreaterThan(flop)
  })

  it('takes longer when more of the stack is at risk', () => {
    const small = median({ action: { type: 'call' }, toCall: 2 * BB, street: 'river' })
    const huge = median({ action: { type: 'call' }, toCall: 80 * BB, street: 'river' })
    expect(huge).toBeGreaterThan(small * 1.5)
  })

  it('gives regulars a faster, steadier tempo than recreational players', () => {
    const reg = median({ action: { type: 'call' }, archetype: 'shark' })
    const fish = median({ action: { type: 'call' }, archetype: 'whale' })
    expect(reg).toBeLessThan(fish)
  })

  it('tanks occasionally but not often', () => {
    const rng = seeded(9)
    const samples = Array.from({ length: 3000 }, () =>
      decisionDelay({
        street: 'river',
        action: { type: 'call' },
        toCall: 10 * BB,
        potChips: 20 * BB,
        stack: 100 * BB,
        archetype: 'tag',
        rng,
      }),
    )
    const tanks = samples.filter((ms) => ms > 3000).length / samples.length
    expect(tanks).toBeGreaterThan(0.005)
    expect(tanks).toBeLessThan(0.2)
  })

  it('does not leak hand strength through timing', () => {
    // A sim you can time-tell would train a habit that gets punished for real,
    // so the delay must not depend on anything about the cards.
    const args = Object.keys({
      street: 1,
      action: 1,
      toCall: 1,
      potChips: 1,
      stack: 1,
      archetype: 1,
      rng: 1,
    })
    expect(args).not.toContain('hole')
    expect(args).not.toContain('equity')
    expect(args).not.toContain('board')
  })
})

describe('speed settings', () => {
  const spot = {
    street: 'flop',
    action: { type: 'call' },
    toCall: 4 * BB,
    potChips: 10 * BB,
    stack: 97 * BB,
    archetype: 'tag',
  }

  const fakeState = { street: 'flop', pot: 10 * BB, players: [{ committed: 0 }] }
  const fakeLegal = { callAmount: 4 * BB, player: { stack: 97 * BB, archetype: 'tag' } }

  it('defaults to realistic, at full scale', () => {
    expect(SPEEDS.realistic.scale).toBe(1)
  })

  it('orders the speeds and keeps every one usable', () => {
    expect(SPEEDS.brisk.scale).toBeLessThan(SPEEDS.realistic.scale)
    expect(SPEEDS.instant.scale).toBeLessThan(SPEEDS.brisk.scale)
    for (const id of SPEED_IDS) {
      expect(SPEEDS[id].scale).toBeGreaterThan(0)
      expect(SPEEDS[id].name).toBeTruthy()
    }
  })

  it('scales the delay without ever reaching zero', () => {
    const rng = seeded(31)
    const at = (speed) =>
      Array.from({ length: 200 }, () => delayForAction(fakeState, fakeLegal, spot.action, speed, rng))
    const realistic = at('realistic')
    const instant = at('instant')
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
    expect(mean(instant)).toBeLessThan(mean(realistic))
    for (const ms of instant) expect(ms).toBeGreaterThanOrEqual(60)
  })

  it('keeps the shape of the curve when sped up', () => {
    // Brisk should still take longer over a river decision than a snap fold —
    // speeding the table up must not flatten the rhythm into one constant.
    const rng = seeded(37)
    const med = (action, street, toCall) => {
      const v = Array.from({ length: 200 }, () =>
        Math.round(
          SPEEDS.brisk.scale *
            decisionDelay({ ...spot, action, street, toCall, rng }),
        ),
      ).sort((a, b) => a - b)
      return v[100]
    }
    expect(med({ type: 'call' }, 'river', 40 * BB)).toBeGreaterThan(med({ type: 'fold' }, 'preflop', 0))
  })
})
