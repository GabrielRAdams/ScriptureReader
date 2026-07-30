import { describe, expect, it } from 'vitest'

import {
  DEFAULT_STDEV,
  bankrollForRisk,
  normalCdf,
  probabilityLosing,
  riskOfRuin,
  swingStdev,
} from '@/lib/bankroll'

describe('risk of ruin', () => {
  it('is certain at a break-even or losing winrate', () => {
    expect(riskOfRuin(0, 3000)).toBe(1)
    expect(riskOfRuin(-3, 10000)).toBe(1)
  })

  it('falls as the bankroll grows', () => {
    const small = riskOfRuin(5, 1000)
    const large = riskOfRuin(5, 5000)
    expect(large).toBeLessThan(small)
  })

  it('falls as the winrate grows', () => {
    expect(riskOfRuin(8, 3000)).toBeLessThan(riskOfRuin(3, 3000))
  })

  it('rises with variance', () => {
    expect(riskOfRuin(5, 3000, 120)).toBeGreaterThan(riskOfRuin(5, 3000, 70))
  })

  it('matches the textbook 30 buy-in case', () => {
    // 5bb/100 winrate, 30 buy-ins (3000bb), 90 stdev -> a few percent.
    const risk = riskOfRuin(5, 3000, 90)
    expect(risk).toBeGreaterThan(0.005)
    expect(risk).toBeLessThan(0.10)
  })

  it('never returns a probability outside [0, 1]', () => {
    for (const wr of [-5, 0, 0.1, 5, 50]) {
      for (const br of [0, 100, 100000]) {
        const risk = riskOfRuin(wr, br)
        expect(risk).toBeGreaterThanOrEqual(0)
        expect(risk).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('bankrollForRisk', () => {
  it('is the inverse of riskOfRuin', () => {
    for (const target of [0.01, 0.05, 0.2]) {
      const needed = bankrollForRisk(5, target, DEFAULT_STDEV)
      expect(riskOfRuin(5, needed, DEFAULT_STDEV)).toBeCloseTo(target, 6)
    }
  })

  it('demands an infinite roll at a non-positive winrate', () => {
    expect(bankrollForRisk(0)).toBe(Infinity)
  })

  it('demands more for a lower risk tolerance', () => {
    expect(bankrollForRisk(5, 0.01)).toBeGreaterThan(bankrollForRisk(5, 0.05))
  })
})

describe('variance', () => {
  it('scales swings with the square root of hands', () => {
    expect(swingStdev(10000, 90)).toBeCloseTo(900, 6)
    expect(swingStdev(40000, 90)).toBeCloseTo(1800, 6)
  })

  it('gives a winning player a real chance of being down over 10k hands', () => {
    const p = probabilityLosing(5, 10000, 90)
    expect(p).toBeGreaterThan(0.2)
    expect(p).toBeLessThan(0.35)
  })

  it('shrinks that chance as the sample grows', () => {
    expect(probabilityLosing(5, 100000, 90)).toBeLessThan(probabilityLosing(5, 10000, 90))
  })

  it('has a well-behaved normal CDF', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 3)
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 2)
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 2)
  })
})
