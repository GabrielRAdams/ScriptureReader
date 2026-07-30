import { describe, expect, it } from 'vitest'

import { makeDeck, shuffle } from '@/lib/cards'
import { CATEGORY, CATEGORY_NAMES, analyzeHand, compareScores, evaluate } from '@/lib/handEval'

/** Deterministic rng so a failure always reproduces. */
function seeded(seed = 1) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function allFiveCardSubsets(cards) {
  const out = []
  for (let a = 0; a < cards.length; a += 1)
    for (let b = a + 1; b < cards.length; b += 1)
      for (let c = b + 1; c < cards.length; c += 1)
        for (let d = c + 1; d < cards.length; d += 1)
          for (let e = d + 1; e < cards.length; e += 1)
            out.push([cards[a], cards[b], cards[c], cards[d], cards[e]])
  return out
}

describe('evaluate — named hands', () => {
  const cases = [
    [['Ah', 'Kh', 'Qh', 'Jh', 'Th', '2c', '3d'], 'Royal Flush'],
    [['5h', '4h', '3h', '2h', 'Ah', 'Kc', 'Qd'], 'Straight Flush, Five high'],
    [['7c', '7d', '7h', '7s', 'Kd', 'Kc', '2h'], 'Four of a Kind, Sevens'],
    // Two sets: the lower one has to play as the pair.
    [['Ac', 'Ad', 'As', 'Kh', 'Kd', 'Kc', '2h'], 'Full House, Aces full of Kings'],
    // Trips plus two pairs: the better pair fills the boat.
    [['9c', '9d', '9s', '5h', '5d', '2c', '2h'], 'Full House, Nines full of Fives'],
    // Six cards of a suit, no straight flush: take the best five.
    [['Ah', '2h', '3h', '4h', '6h', '7h', 'Kd'], 'Flush, Ace high'],
    [['Ac', '2d', '3h', '4s', '5c', 'Kh', 'Qd'], 'Straight, Five high'],
    [['Ac', 'Kd', 'Qh', 'Js', 'Tc', '9h', '8d'], 'Straight, Ace high'],
    // Three pairs: only the top two count.
    [['Ac', 'Ad', 'Kh', 'Kd', 'Qc', 'Qd', '2h'], 'Two Pair, Aces and Kings'],
    [['2c', '3d', '5h', '8s', 'Tc', 'Jd', 'Kh'], 'King High'],
  ]

  it.each(cases)('%s -> %s', (cards, expected) => {
    expect(evaluate(cards).name).toBe(expected)
  })
})

describe('evaluate — ordering', () => {
  it('ranks categories in the right order', () => {
    const board = ['2c', '7d', '9h', 'Jc', '4s']
    const highCard = evaluate([...board, 'Ad', 'Kh'])
    const pair = evaluate([...board, '9d', 'Kh'])
    const twoPair = evaluate([...board, '9d', '7h'])
    const trips = evaluate([...board, '9d', '9s'])
    expect(compareScores(pair.score, highCard.score)).toBeGreaterThan(0)
    expect(compareScores(twoPair.score, pair.score)).toBeGreaterThan(0)
    expect(compareScores(trips.score, twoPair.score)).toBeGreaterThan(0)
  })

  it('breaks ties on kickers', () => {
    const board = ['Ac', '7d', '3h', '9s', '2c']
    const ak = evaluate([...board, 'Ah', 'Kd'])
    const aq = evaluate([...board, 'As', 'Qd'])
    expect(compareScores(ak.score, aq.score)).toBeGreaterThan(0)
  })

  it('chops identical hands', () => {
    const board = ['Ac', '7d', '3h', '9s', '2c']
    expect(compareScores(evaluate([...board, 'Kh', 'Kc']).score, evaluate([...board, 'Kd', 'Ks']).score)).toBe(0)
  })

  it('chops when the board plays', () => {
    const board = ['Ac', 'Ad', 'As', 'Kh', 'Kd']
    expect(compareScores(evaluate([...board, '2c', '3d']).score, evaluate([...board, '4h', '5s']).score)).toBe(0)
  })

  it('does not let a fourth flush card on the board beat a real flush', () => {
    const board = ['2s', '7s', '9s', 'Js', '4d']
    const withSpade = evaluate([...board, 'As', '3d'])
    const withoutSpade = evaluate([...board, 'Ad', 'Ah'])
    expect(withSpade.category).toBe(CATEGORY.FLUSH)
    expect(compareScores(withSpade.score, withoutSpade.score)).toBeGreaterThan(0)
  })
})

describe('evaluate — brute force cross-check', () => {
  it('matches the best of all 21 five-card subsets', () => {
    const rng = seeded(4242)
    for (let i = 0; i < 4000; i += 1) {
      const seven = shuffle(makeDeck(), rng).slice(0, 7)
      const direct = evaluate(seven)
      let best = null
      for (const subset of allFiveCardSubsets(seven)) {
        const score = evaluate(subset)
        if (!best || compareScores(score.score, best.score) > 0) best = score
      }
      expect(compareScores(direct.score, best.score), `mismatch on ${seven.join(' ')}`).toBe(0)
    }
  })

  it('produces the known 7-card category distribution', () => {
    const rng = seeded(99)
    const counts = Array(9).fill(0)
    const trials = 60000
    for (let i = 0; i < trials; i += 1) {
      counts[evaluate(shuffle(makeDeck(), rng).slice(0, 7)).category] += 1
    }
    const pct = counts.map((c) => (c / trials) * 100)
    // Published 7-card frequencies, with room for sampling noise.
    const expected = {
      [CATEGORY.HIGH_CARD]: 17.4,
      [CATEGORY.PAIR]: 43.8,
      [CATEGORY.TWO_PAIR]: 23.5,
      [CATEGORY.TRIPS]: 4.83,
      [CATEGORY.STRAIGHT]: 4.62,
      [CATEGORY.FLUSH]: 3.03,
      [CATEGORY.FULL_HOUSE]: 2.6,
    }
    for (const [category, target] of Object.entries(expected)) {
      expect(pct[category], `${CATEGORY_NAMES[category]} at ${pct[category].toFixed(2)}%`).toBeGreaterThan(target - 1)
      expect(pct[category], `${CATEGORY_NAMES[category]} at ${pct[category].toFixed(2)}%`).toBeLessThan(target + 1)
    }
  })
})

describe('analyzeHand', () => {
  it('labels an overpair', () => {
    const a = analyzeHand(['Qs', 'Qd'], ['9h', '7c', '2d'])
    expect(a.pairLabel).toBe('overpair')
    expect(a.bucket).toBe('strong')
  })

  it('labels top pair and second pair', () => {
    expect(analyzeHand(['Kd', '9c'], ['Kh', '7c', '4s']).pairLabel).toBe('top pair')
    expect(analyzeHand(['7d', '6c'], ['Kh', '7c', '4s']).pairLabel).toBe('second pair')
  })

  it('finds a flush draw only when hero holds the suit', () => {
    expect(analyzeHand(['As', 'Ts'], ['Ks', '7s', '4d']).draw.flush).toBe(true)
    // Three to a flush on the board, none in hand: not hero's draw.
    expect(analyzeHand(['Ad', 'Tc'], ['Ks', '7s', '4s']).draw.flush).toBe(false)
  })

  it('separates open-enders from gutshots', () => {
    expect(analyzeHand(['9d', '8c'], ['7h', '6s', '2d']).draw.oesd).toBe(true)
    expect(analyzeHand(['9d', '8c'], ['5h', '6s', '2d']).draw.gutshot).toBe(true)
  })

  it('does not report draws on the river', () => {
    const a = analyzeHand(['As', 'Ts'], ['Ks', '7s', '4d', '2c', '3h'])
    expect(a.draw.flush).toBe(false)
    expect(a.outs).toBe(0)
  })

  it('buckets a made hand above a draw', () => {
    expect(analyzeHand(['9h', '9d'], ['9c', '7s', '2d']).bucket).toBe('monster')
    expect(analyzeHand(['Ad', '5c'], ['Kh', '7s', '2d']).bucket).toBe('air')
  })
})
