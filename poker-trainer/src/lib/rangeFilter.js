/**
 * Board-aware range filtering.
 *
 * A preflop percentile ("top 42% of hands") is a bad model of what somebody
 * still holds on the flop: it includes every hand that missed completely. Real
 * players continue with what connected — pairs, draws, sometimes an overcard —
 * and fold the rest, so a range has to be filtered by the board before it means
 * anything.
 *
 * Everything here works on rank/suit arithmetic rather than full hand
 * evaluation, because it runs over several hundred combos inside every bot
 * decision. Classifying one combo costs a fraction of a microsecond.
 */

import { RANKS } from './cards.js'
import { weightedRange } from './equity.js'

const RANK_INDEX = (() => {
  const table = new Int8Array(128).fill(-1)
  RANKS.forEach((r, i) => {
    table[r.charCodeAt(0)] = i
  })
  return table
})()

/** Does adding one card to this rank set complete a straight? */
function straightOutCount(mask) {
  let outs = 0
  for (let r = 0; r <= 12; r += 1) {
    if (mask & (1 << r)) continue
    const withCard = mask | (1 << r)
    const m = (withCard << 1) | ((withCard >>> 12) & 1)
    if (m & (m >>> 1) & (m >>> 2) & (m >>> 3) & (m >>> 4)) outs += 1
  }
  return outs
}

/** Precomputes everything about a board that the per-combo test needs. */
export function boardProfile(board) {
  let rankMask = 0
  const suitCounts = { s: 0, h: 0, d: 0, c: 0 }
  const rankCounts = new Int8Array(13)
  let topRank = -1

  for (const card of board) {
    const r = RANK_INDEX[card.charCodeAt(0)]
    rankMask |= 1 << r
    rankCounts[r] += 1
    suitCounts[card[1]] += 1
    if (r > topRank) topRank = r
  }

  return { rankMask, rankCounts, suitCounts, topRank, size: board.length }
}

/**
 * How a single two-card combo connects with the board.
 * Returns one of: 'strong', 'pair', 'draw', 'weak', 'air'.
 */
export function classifyCombo(combo, profile) {
  const r1 = RANK_INDEX[combo[0].charCodeAt(0)]
  const r2 = RANK_INDEX[combo[1].charCodeAt(0)]
  const s1 = combo[0][1]
  const s2 = combo[1][1]

  const pocketPair = r1 === r2
  const paired1 = profile.rankCounts[r1] > 0
  const paired2 = profile.rankCounts[r2] > 0

  // Two pair, trips or better — anything that has the board smashed.
  if (pocketPair && profile.rankCounts[r1] > 0) return 'strong' // a set
  if (paired1 && paired2 && r1 !== r2) return 'strong' // two pair
  if (profile.rankCounts[r1] >= 2 || profile.rankCounts[r2] >= 2) return 'strong' // trips on a paired board

  // A pair, and whether it is worth much.
  const madePair = paired1 || paired2 || pocketPair
  const topPair =
    (paired1 && r1 === profile.topRank) ||
    (paired2 && r2 === profile.topRank) ||
    (pocketPair && r1 > profile.topRank)

  // Draws.
  const flushDraw =
    (s1 === s2 && profile.suitCounts[s1] >= 2) ||
    (s1 !== s2 && (profile.suitCounts[s1] >= 3 || profile.suitCounts[s2] >= 3))

  const withHole = profile.rankMask | (1 << r1) | (1 << r2)
  const outs = profile.size < 5 ? straightOutCount(withHole) : 0
  const openEnder = outs >= 2
  const gutshot = outs === 1

  if (topPair) return 'strong'
  if (flushDraw && profile.size < 5) return 'draw'
  if (openEnder) return 'draw'
  if (madePair) return 'pair'
  if (gutshot) return 'weak'

  // Two overcards to the board are the last thing a loose player floats with.
  if (r1 > profile.topRank && r2 > profile.topRank) return 'weak'
  return 'air'
}

/**
 * How often each class of hand takes each action, as a weight in [0, 1].
 *
 * This is the difference between a binary filter and a range. Binary filtering
 * says a player who barrelled twice has only strong hands — which means the bots
 * believe he never bluffs, and they fold far too much to aggression.
 *
 * These numbers are not guesses. Each tier was calibrated against what the bots
 * actually hold when they take that action, measured over 6,000 hands, and the
 * tier names match the action taken rather than a vague strength scale. Note
 * that this is a feedback loop — behaviour drives the weights and the weights
 * drive behaviour — so it is one calibration pass toward observed reality, not
 * a converged fixed point.
 */
export const CONTINUE_WEIGHTS = {
  // Called one bet: 33% value, 27% weak pair, 17% air. Condensed — the value
  // is partly missing because those hands raised instead.
  calledOnce: { strong: 0.94, draw: 0.84, pair: 1, weak: 0.61, air: 0.44 },
  // Called twice: pair-heavy and value-light, because a hand that improved to
  // value on a later street tends to raise rather than call again.
  calledTwice: { strong: 0.37, draw: 1, pair: 0.53, weak: 0.07, air: 0.29 },
  // Bet once: 46% value, 20% draw, 12% air — a c-betting range.
  betOnce: { strong: 0.71, draw: 1, pair: 0.24, weak: 0.24, air: 0.17 },
  // Bet twice: 74% value. Value-heavy, as a real second barrel is, but the 13%
  // air is why a bluff-catcher can still profitably call one.
  betTwice: { strong: 1, draw: 0.22, pair: 0.05, weak: 0.1, air: 0.16 },
}

const TIER_ORDER = ['air', 'weak', 'pair', 'draw', 'strong']

/**
 * Continuation tiers, loosest first. `float` keeps almost everything that has
 * any excuse to continue; `value` keeps only hands that want money in.
 */
export const CONTINUE_TIERS = {
  float: 'weak',
  call: 'pair',
  value: 'strong',
}

/**
 * Narrows a set of combos to those that would still be in the hand.
 *
 * `keep` is the weakest class retained. Draws always survive a call tier even
 * though they are "worse" than a pair in showdown terms — that is the whole
 * point of a draw.
 */
export function filterCombosByBoard(combos, board, keep = 'pair') {
  if (board.length === 0) return combos
  const profile = boardProfile(board)
  const floor = TIER_ORDER.indexOf(keep)

  const out = []
  for (const combo of combos) {
    const klass = classifyCombo(combo, profile)
    if (klass === 'draw' && floor <= TIER_ORDER.indexOf('draw')) {
      out.push(combo)
      continue
    }
    if (TIER_ORDER.indexOf(klass) >= floor) out.push(combo)
  }

  // A filter that removes everything is worse than no filter: fall back rather
  // than hand the Monte Carlo an empty range.
  return out.length >= 6 ? out : combos
}

/**
 * Weights every combo by how often that class of hand would have taken the
 * action the villain took, returning a weighted range ready for sampling.
 *
 * Unlike the binary filter this never drops a combo entirely — a two-barrel
 * bettor still holds air some of the time, and pretending otherwise is what
 * makes a bot fold every bluff-catcher.
 */
export function weighCombosByBoard(combos, board, tier = 'calledOnce', bluffiness = 0.2) {
  const table = CONTINUE_WEIGHTS[tier] ?? CONTINUE_WEIGHTS.calledOnce
  if (board.length === 0) return weightedRange(combos)

  // Who is betting matters as much as what the board is. A nit's second barrel
  // is nearly all value; a maniac's is mostly air. Scaling the weak and air
  // weights by how much this player bluffs is the difference between "someone
  // bet twice" and "*he* bet twice".
  const bluffScale = 0.45 + bluffiness * 2.4

  const profile = boardProfile(board)
  const weights = new Array(combos.length)
  let total = 0
  for (let i = 0; i < combos.length; i += 1) {
    const klass = classifyCombo(combos[i], profile)
    const base = table[klass] ?? 0.05
    const weight = klass === 'air' || klass === 'weak' ? base * bluffScale : base
    weights[i] = weight
    total += weight
  }

  // A range with no weight left is not a range; fall back to uniform.
  if (total <= 0) return weightedRange(combos)
  return weightedRange(combos, weights)
}
