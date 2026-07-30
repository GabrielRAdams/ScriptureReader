/**
 * Five-to-seven card hand evaluation.
 *
 * `evaluate` scores any 5+ card set directly (no combination search) and
 * returns a comparable array: [category, ...tiebreakers]. Lexicographic
 * comparison of that array is the full poker ordering, so `compareHands` is
 * just an element-wise compare.
 */

import { RANKS, rankValue, suitOf } from './cards.js'

export const CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
}

export const CATEGORY_NAMES = [
  'High Card',
  'Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
]

const RANK_LABEL = {
  12: 'Aces', 11: 'Kings', 10: 'Queens', 9: 'Jacks', 8: 'Tens', 7: 'Nines',
  6: 'Eights', 5: 'Sevens', 4: 'Sixes', 3: 'Fives', 2: 'Fours', 1: 'Threes', 0: 'Twos',
}

const RANK_SINGULAR = {
  12: 'Ace', 11: 'King', 10: 'Queen', 9: 'Jack', 8: 'Ten', 7: 'Nine',
  6: 'Eight', 5: 'Seven', 4: 'Six', 3: 'Five', 2: 'Four', 1: 'Three', 0: 'Two',
}

/**
 * Highest card of the best 5-card straight inside `values`, or -1.
 * Returns 3 (the five) for the A-5 wheel.
 */
function bestStraightTop(values) {
  const set = new Set(values)
  for (let top = 12; top >= 4; top -= 1) {
    let run = true
    for (let i = 0; i < 5; i += 1) {
      if (!set.has(top - i)) {
        run = false
        break
      }
    }
    if (run) return top
  }
  // Wheel: A-5-4-3-2 plays as a five-high straight.
  if (set.has(12) && set.has(3) && set.has(2) && set.has(1) && set.has(0)) return 3
  return -1
}

/**
 * Scores a set of 5, 6 or 7 cards. Returns:
 *   { score: number[], category: number, name: string }
 */
export function evaluate(cards) {
  const values = cards.map(rankValue)
  const suits = cards.map(suitOf)

  // Rank multiplicities, highest rank first.
  const counts = new Map()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  const byCount = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])

  const suitCounts = new Map()
  for (const s of suits) suitCounts.set(s, (suitCounts.get(s) ?? 0) + 1)
  const flushSuit = [...suitCounts.entries()].find(([, n]) => n >= 5)?.[0]

  // Straight flush beats everything below it, so check the flush suit first.
  if (flushSuit) {
    const flushValues = cards.filter((c) => suitOf(c) === flushSuit).map(rankValue)
    const sfTop = bestStraightTop(flushValues)
    if (sfTop >= 0) {
      return {
        score: [CATEGORY.STRAIGHT_FLUSH, sfTop],
        category: CATEGORY.STRAIGHT_FLUSH,
        name:
          sfTop === 12
            ? 'Royal Flush'
            : `Straight Flush, ${RANK_SINGULAR[sfTop]} high`,
      }
    }
  }

  const quad = byCount.find(([, n]) => n === 4)
  if (quad) {
    const kicker = Math.max(...values.filter((v) => v !== quad[0]))
    return {
      score: [CATEGORY.QUADS, quad[0], kicker],
      category: CATEGORY.QUADS,
      name: `Four of a Kind, ${RANK_LABEL[quad[0]]}`,
    }
  }

  const trips = byCount.filter(([, n]) => n === 3).map(([v]) => v)
  const pairs = byCount.filter(([, n]) => n === 2).map(([v]) => v)

  // With two sets, the lower one plays as the pair.
  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const topTrips = trips[0]
    const pairRank = Math.max(...[...pairs, ...trips.slice(1)])
    return {
      score: [CATEGORY.FULL_HOUSE, topTrips, pairRank],
      category: CATEGORY.FULL_HOUSE,
      name: `Full House, ${RANK_LABEL[topTrips]} full of ${RANK_LABEL[pairRank]}`,
    }
  }

  if (flushSuit) {
    const flushValues = cards
      .filter((c) => suitOf(c) === flushSuit)
      .map(rankValue)
      .sort((a, b) => b - a)
      .slice(0, 5)
    return {
      score: [CATEGORY.FLUSH, ...flushValues],
      category: CATEGORY.FLUSH,
      name: `Flush, ${RANK_SINGULAR[flushValues[0]]} high`,
    }
  }

  const straightTop = bestStraightTop(values)
  if (straightTop >= 0) {
    return {
      score: [CATEGORY.STRAIGHT, straightTop],
      category: CATEGORY.STRAIGHT,
      name: `Straight, ${RANK_SINGULAR[straightTop]} high`,
    }
  }

  if (trips.length > 0) {
    const kickers = values
      .filter((v) => v !== trips[0])
      .sort((a, b) => b - a)
      .slice(0, 2)
    return {
      score: [CATEGORY.TRIPS, trips[0], ...kickers],
      category: CATEGORY.TRIPS,
      name: `Three of a Kind, ${RANK_LABEL[trips[0]]}`,
    }
  }

  if (pairs.length >= 2) {
    const [high, low] = pairs.slice(0, 2)
    const kicker = Math.max(...values.filter((v) => v !== high && v !== low))
    return {
      score: [CATEGORY.TWO_PAIR, high, low, kicker],
      category: CATEGORY.TWO_PAIR,
      name: `Two Pair, ${RANK_LABEL[high]} and ${RANK_LABEL[low]}`,
    }
  }

  if (pairs.length === 1) {
    const kickers = values
      .filter((v) => v !== pairs[0])
      .sort((a, b) => b - a)
      .slice(0, 3)
    return {
      score: [CATEGORY.PAIR, pairs[0], ...kickers],
      category: CATEGORY.PAIR,
      name: `Pair of ${RANK_LABEL[pairs[0]]}`,
    }
  }

  const high = [...values].sort((a, b) => b - a).slice(0, 5)
  return {
    score: [CATEGORY.HIGH_CARD, ...high],
    category: CATEGORY.HIGH_CARD,
    name: `${RANK_SINGULAR[high[0]]} High`,
  }
}

/** >0 if a beats b, <0 if b beats a, 0 on an exact tie (chopped pot). */
export function compareScores(a, b) {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i += 1) {
    const diff = (a[i] ?? -1) - (b[i] ?? -1)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Board texture and hero hand analysis used by the bots and the coach.
 * Buckets are deliberately coarse — enough to drive believable decisions.
 */
export function analyzeHand(hole, board) {
  const cards = [...hole, ...board]
  const result = evaluate(cards.length >= 5 ? cards : [...cards, ...cards].slice(0, 5))
  const boardValues = board.map(rankValue).sort((a, b) => b - a)
  const holeValues = hole.map(rankValue).sort((a, b) => b - a)

  // Draws only matter before the river.
  const draw = { flush: false, oesd: false, gutshot: false }
  let outs = 0
  if (board.length >= 3 && board.length <= 4) {
    const suitCounts = new Map()
    for (const c of cards) suitCounts.set(suitOf(c), (suitCounts.get(suitOf(c)) ?? 0) + 1)
    const flushCount = Math.max(...suitCounts.values())
    const heroSuits = new Set(hole.map(suitOf))
    const flushSuitEntry = [...suitCounts.entries()].find(([, n]) => n === flushCount)
    if (flushCount === 4 && heroSuits.has(flushSuitEntry[0])) {
      draw.flush = true
      outs += 9
    }

    const values = new Set(cards.map(rankValue))
    if (result.category < CATEGORY.STRAIGHT) {
      let straightOuts = 0
      for (let v = 0; v <= 12; v += 1) {
        if (values.has(v)) continue
        const next = new Set(values)
        next.add(v)
        if (bestStraightTop([...next]) >= 0) straightOuts += 1
      }
      if (straightOuts >= 2) {
        draw.oesd = true
        outs += 8
      } else if (straightOuts === 1) {
        draw.gutshot = true
        outs += 4
      }
    }
  }

  // Pair classification relative to the board.
  let pairLabel = null
  if (result.category === CATEGORY.PAIR) {
    const pairRank = result.score[1]
    const isPocketPair = holeValues[0] === holeValues[1]
    if (isPocketPair && pairRank > (boardValues[0] ?? -1)) pairLabel = 'overpair'
    else if (pairRank === boardValues[0]) pairLabel = 'top pair'
    else if (pairRank === boardValues[1]) pairLabel = 'second pair'
    else pairLabel = 'weak pair'
  }

  let bucket
  if (result.category >= CATEGORY.TRIPS) bucket = 'monster'
  else if (result.category === CATEGORY.TWO_PAIR) bucket = 'strong'
  else if (pairLabel === 'overpair' || pairLabel === 'top pair') bucket = 'strong'
  else if (pairLabel) bucket = 'medium'
  else if (draw.flush || draw.oesd) bucket = 'draw'
  else if (draw.gutshot) bucket = 'weak'
  else bucket = 'air'

  return { ...result, bucket, pairLabel, draw, outs }
}

export { RANKS }
