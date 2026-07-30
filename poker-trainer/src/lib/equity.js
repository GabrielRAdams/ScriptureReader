/**
 * Monte Carlo equity.
 *
 * Exact enumeration is only cheap on the river, so everything here samples:
 * deal the missing board cards (and the opponents' hole cards) at random many
 * times and count how often you win. A few thousand trials is accurate to
 * roughly ±1%, which is far tighter than any decision at the table needs.
 *
 * The bots use this to reason about equity instead of hand-strength buckets,
 * and the sim uses it to tell you what your equity actually was.
 */

import { makeDeck } from './cards.js'
import { compareScores, evaluate } from './handEval.js'
import { ALL_HANDS, combosOf } from './range.js'
import { RANKS as RANK_CHARS } from './cards.js'

const SUITS = ['s', 'h', 'd', 'c']

/** Every concrete two-card combo for a hand code like 'AKs' or '77'. */
export function combosFor(handCode) {
  const [hi, lo] = [handCode[0], handCode[1]]
  const out = []
  if (hi === lo) {
    for (let i = 0; i < SUITS.length; i += 1) {
      for (let j = i + 1; j < SUITS.length; j += 1) out.push([hi + SUITS[i], lo + SUITS[j]])
    }
    return out
  }
  const suited = handCode.endsWith('s')
  for (const a of SUITS) {
    for (const b of SUITS) {
      if (suited && a !== b) continue
      if (!suited && a === b) continue
      out.push([hi + a, lo + b])
    }
  }
  return out
}

/** Expands a Set of hand codes into every concrete combo. */
export function expandRange(handCodes) {
  const combos = []
  for (const code of handCodes) combos.push(...combosFor(code))
  return combos
}

function without(deck, used) {
  const blocked = new Set(used)
  return deck.filter((c) => !blocked.has(c))
}

/**
 * Hero equity against `opponents` random hands.
 *
 * Returns { win, tie, lose, equity } as fractions, where equity counts a split
 * pot as its share (a two-way chop is worth half a win).
 */
export function equityVsRandom(hole, board = [], opponents = 1, trials = 4000, rng = Math.random) {
  const deck = without(makeDeck(), [...hole, ...board])
  let win = 0
  let tie = 0
  const needed = 5 - board.length

  for (let t = 0; t < trials; t += 1) {
    // Partial Fisher-Yates: only shuffle the cards we are about to use.
    const pool = [...deck]
    const drawn = []
    const draws = needed + opponents * 2
    for (let i = 0; i < draws; i += 1) {
      const j = i + Math.floor(rng() * (pool.length - i))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
      drawn.push(pool[i])
    }

    const runout = [...board, ...drawn.slice(0, needed)]
    const heroScore = evaluate([...hole, ...runout]).score

    let best = 0
    let tied = 0
    for (let o = 0; o < opponents; o += 1) {
      const villain = [drawn[needed + o * 2], drawn[needed + o * 2 + 1]]
      const cmp = compareScores(evaluate([...villain, ...runout]).score, heroScore)
      if (cmp > 0) {
        best = 1
        break
      }
      if (cmp === 0) tied += 1
    }

    if (best === 1) continue
    if (tied > 0) tie += 1 / (tied + 1)
    else win += 1
  }

  const equity = (win + tie) / trials
  return { win: win / trials, tie: tie / trials, lose: 1 - equity, equity }
}

/**
 * Hero equity against a single opponent whose hand is drawn from `range`
 * (an iterable of hand codes, or of concrete two-card combos).
 */
export function equityVsRange(hole, board = [], range, trials = 3000, rng = Math.random) {
  const combos = (
    Array.isArray(range) && Array.isArray(range[0]) ? range : expandRange(range)
  ).filter((combo) => !combo.some((c) => hole.includes(c) || board.includes(c)))

  if (combos.length === 0) return { equity: 0.5, win: 0, tie: 0, lose: 0, combos: 0 }

  const needed = 5 - board.length
  let win = 0
  let tie = 0

  for (let t = 0; t < trials; t += 1) {
    const villain = combos[Math.floor(rng() * combos.length)]
    const deck = without(makeDeck(), [...hole, ...board, ...villain])

    const drawn = []
    for (let i = 0; i < needed; i += 1) {
      const j = i + Math.floor(rng() * (deck.length - i))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
      drawn.push(deck[i])
    }

    const runout = [...board, ...drawn]
    const cmp = compareScores(
      evaluate([...hole, ...runout]).score,
      evaluate([...villain, ...runout]).score,
    )
    if (cmp > 0) win += 1
    else if (cmp === 0) tie += 1
  }

  const equity = (win + tie / 2) / trials
  return { win: win / trials, tie: tie / trials, lose: 1 - equity, equity, combos: combos.length }
}

/**
 * The loosest N% of hands by preflop ranking — a quick stand-in for "villain's
 * range" when all we know is how wide somebody is playing.
 */
export function topPercentRange(percent, ranking) {
  const target = 1326 * percent
  const out = []
  let combos = 0
  for (const hand of ranking) {
    if (combos >= target) break
    out.push(hand)
    combos += combosOf(hand)
  }
  return out
}

export { ALL_HANDS, RANK_CHARS }
