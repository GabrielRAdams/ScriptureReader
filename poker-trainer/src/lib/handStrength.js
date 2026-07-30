/**
 * Preflop hand ranking, used to give bots a consistent notion of "top X% of
 * hands" without shipping a 169-entry table per archetype.
 *
 * Scores come from the Chen formula — crude next to an equity calculator, but
 * it orders starting hands the way a competent player would, which is all the
 * bots need. Percentiles are combo-weighted, so "top 15%" means 15% of the
 * 1326 possible deals, not 15% of the 169 hand codes.
 */

import { ALL_HANDS, RANKS, combosOf } from './range.js'

const BASE = { A: 10, K: 8, Q: 7, J: 6 }

function baseValue(rank) {
  if (BASE[rank]) return BASE[rank]
  return (RANKS.length - RANKS.indexOf(rank) + 1) / 2
}

export function chenScore(handCode) {
  const [hi, lo] = [handCode[0], handCode[1]]
  const suited = handCode.endsWith('s')
  const isPair = hi === lo

  let score = baseValue(hi)
  if (isPair) return Math.max(5, score * 2)

  if (suited) score += 2

  const gap = Math.abs(RANKS.indexOf(hi) - RANKS.indexOf(lo)) - 1
  if (gap === 1) score -= 1
  else if (gap === 2) score -= 2
  else if (gap === 3) score -= 4
  else if (gap >= 4) score -= 5

  // Both cards below a queen and close together can make straights.
  const hiIndex = RANKS.indexOf(hi)
  if (gap <= 1 && hiIndex < RANKS.indexOf('Q')) score += 1

  return Math.ceil(score * 2) / 2
}

/** Every hand code, strongest first. */
export const HAND_RANKING = [...ALL_HANDS].sort((a, b) => {
  const diff = chenScore(b) - chenScore(a)
  if (diff !== 0) return diff
  // Stable tie-break: suited over offsuit, then higher cards.
  const suitedDiff = (b.endsWith('s') ? 1 : 0) - (a.endsWith('s') ? 1 : 0)
  if (suitedDiff !== 0) return suitedDiff
  return RANKS.indexOf(b[0]) - RANKS.indexOf(a[0]) || RANKS.indexOf(b[1]) - RANKS.indexOf(a[1])
})

/**
 * Combo-weighted percentile: 0 for aces, ~1 for 72o. A hand is inside the
 * "top 20%" when its percentile is <= 0.20.
 */
export const HAND_PERCENTILE = (() => {
  const map = new Map()
  let cumulative = 0
  for (const hand of HAND_RANKING) {
    cumulative += combosOf(hand)
    // Use the midpoint of the hand's band so ties behave sensibly.
    map.set(hand, (cumulative - combosOf(hand) / 2) / 1326)
  }
  return map
})()

export function percentileOf(handCode) {
  return HAND_PERCENTILE.get(handCode) ?? 1
}
