/**
 * Hand-grid helpers and a parser for standard range notation.
 *
 * Supported tokens (comma separated):
 *   AA            exact pair
 *   77+           77 through AA
 *   77-JJ         77 through JJ
 *   AKs / AKo     exact suited / offsuit combo
 *   A2s+          A2s through AKs (fixed high card, kicker climbs)
 *   KTo+          KTo through KQo
 *   K9s-K5s       explicit kicker span
 */

export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

const RANK_INDEX = Object.fromEntries(RANKS.map((r, i) => [r, i]))

/** Combos per hand type — used to weight range percentages correctly. */
export function combosOf(hand) {
  if (hand.length === 2) return 6 // pair
  return hand.endsWith('s') ? 4 : 12
}

/** The 13x13 grid, row-major: pairs on the diagonal, suited above, offsuit below. */
export const HAND_GRID = RANKS.map((rowRank, row) =>
  RANKS.map((colRank, col) => {
    if (row === col) return `${rowRank}${colRank}`
    return row < col ? `${rowRank}${colRank}s` : `${colRank}${rowRank}o`
  }),
)

export const ALL_HANDS = HAND_GRID.flat()

function pairsBetween(lowRank, highRank) {
  const from = RANK_INDEX[highRank]
  const to = RANK_INDEX[lowRank]
  const hands = []
  for (let i = from; i <= to; i += 1) hands.push(`${RANKS[i]}${RANKS[i]}`)
  return hands
}

function kickersBetween(highRank, fromKicker, toKicker, suffix) {
  const start = RANK_INDEX[fromKicker]
  const end = RANK_INDEX[toKicker]
  const hands = []
  for (let i = Math.min(start, end); i <= Math.max(start, end); i += 1) {
    if (RANKS[i] === highRank) continue
    hands.push(`${highRank}${RANKS[i]}${suffix}`)
  }
  return hands
}

function parseToken(token) {
  const t = token.trim()
  if (!t) return []

  // Pair span: 77-JJ
  const pairSpan = /^([AKQJT2-9])\1-([AKQJT2-9])\2$/.exec(t)
  if (pairSpan) {
    const [a, b] = [pairSpan[1], pairSpan[2]]
    const [low, high] = RANK_INDEX[a] > RANK_INDEX[b] ? [a, b] : [b, a]
    return pairsBetween(low, high)
  }

  // Pair and up: 77+
  const pairPlus = /^([AKQJT2-9])\1\+$/.exec(t)
  if (pairPlus) return pairsBetween(pairPlus[1], 'A')

  // Exact pair: 77
  const pair = /^([AKQJT2-9])\1$/.exec(t)
  if (pair) return [t]

  // Kicker span: K9s-K5s
  const span = /^([AKQJT2-9])([AKQJT2-9])([so])-([AKQJT2-9])([AKQJT2-9])\3$/.exec(t)
  if (span && span[1] === span[4]) {
    return kickersBetween(span[1], span[2], span[5], span[3])
  }

  // Kicker and up: A2s+
  const plus = /^([AKQJT2-9])([AKQJT2-9])([so])\+$/.exec(t)
  if (plus) {
    const [, high, kicker, suffix] = plus
    const oneBelowHigh = RANKS[RANK_INDEX[high] + 1]
    return kickersBetween(high, kicker, oneBelowHigh, suffix)
  }

  // Exact combo: AKs
  const exact = /^([AKQJT2-9])([AKQJT2-9])([so])$/.exec(t)
  if (exact) {
    const [, a, b, suffix] = exact
    const [high, low] = RANK_INDEX[a] < RANK_INDEX[b] ? [a, b] : [b, a]
    return [`${high}${low}${suffix}`]
  }

  throw new Error(`Unparsed range token: "${t}"`)
}

export function parseRange(notation) {
  const set = new Set()
  for (const token of notation.split(',')) {
    for (const hand of parseToken(token)) set.add(hand)
  }
  return set
}

/**
 * Resolves a chart's notation strings into a hand -> action map. Earlier keys
 * win, so list the strongest action first (3bet before call).
 */
export function buildChart(actions) {
  const map = new Map()
  for (const [action, notation] of Object.entries(actions)) {
    for (const hand of parseRange(notation)) {
      if (!map.has(hand)) map.set(hand, action)
    }
  }
  return map
}

/** Percentage of all 1326 starting combos covered by a hand->action map. */
export function rangePercent(chart, actions = null) {
  let combos = 0
  for (const [hand, action] of chart.entries()) {
    if (actions && !actions.includes(action)) continue
    combos += combosOf(hand)
  }
  return Math.round((combos / 1326) * 1000) / 10
}
