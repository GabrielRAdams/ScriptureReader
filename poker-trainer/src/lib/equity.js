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
import { scoreOf } from './handEval.js'
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
    const heroScore = scoreOf([...hole, ...runout])

    let beaten = false
    let tied = 0
    for (let o = 0; o < opponents; o += 1) {
      const villain = [drawn[needed + o * 2], drawn[needed + o * 2 + 1]]
      const villainScore = scoreOf([...villain, ...runout])
      if (villainScore > heroScore) {
        beaten = true
        break
      }
      if (villainScore === heroScore) tied += 1
    }

    if (beaten) continue
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

  // Build the deck once. The villain's two cards change every trial, so they
  // are skipped during the draw rather than filtered out of a fresh deck —
  // rebuilding a 52-card array per trial dominated the cost otherwise.
  const base = without(makeDeck(), [...hole, ...board])
  const pool = [...base]
  const runout = [...board, ...new Array(needed).fill(null)]

  for (let t = 0; t < trials; t += 1) {
    const villain = combos[Math.floor(rng() * combos.length)]
    const blockA = villain[0]
    const blockB = villain[1]

    for (let k = 0; k < pool.length; k += 1) pool[k] = base[k]

    let filled = 0
    let i = 0
    while (filled < needed) {
      const j = i + Math.floor(rng() * (pool.length - i))
      const card = pool[j]
      pool[j] = pool[i]
      pool[i] = card
      i += 1
      if (card === blockA || card === blockB) continue
      runout[board.length + filled] = card
      filled += 1
    }
    const heroScore = scoreOf([...hole, ...runout])
    const villainScore = scoreOf([...villain, ...runout])
    if (heroScore > villainScore) win += 1
    else if (heroScore === villainScore) tie += 1
  }

  const equity = (win + tie / 2) / trials
  return { win: win / trials, tie: tie / trials, lose: 1 - equity, equity, combos: combos.length }
}

/**
 * Hero equity against several opponents, each drawn from their own range.
 *
 * Dealing every villain in the same trial keeps the card removal honest — two
 * opponents can never hold the same card, and raising equity to a power (the
 * usual shortcut for multiway) quietly ignores that.
 */
export function equityVsRanges(hole, board = [], ranges, trials = 2000, rng = Math.random) {
  if (!ranges || ranges.length === 0) return { equity: 1, win: 1, tie: 0, lose: 0 }
  if (ranges.length === 1) return equityVsRange(hole, board, ranges[0], trials, rng)

  const comboSets = ranges.map((range) =>
    (Array.isArray(range) && Array.isArray(range[0]) ? range : expandRange(range)).filter(
      (combo) => !combo.some((c) => hole.includes(c) || board.includes(c)),
    ),
  )
  if (comboSets.some((set) => set.length === 0)) {
    return equityVsRandom(hole, board, ranges.length, trials, rng)
  }

  const needed = 5 - board.length
  const base = without(makeDeck(), [...hole, ...board])
  const pool = [...base]
  const runout = [...board, ...new Array(needed).fill(null)]
  let win = 0
  let tie = 0

  for (let t = 0; t < trials; t += 1) {
    // Draw one hand per villain, retrying the whole trial on a card clash
    // rather than biasing the sample by patching it up.
    const villains = []
    const used = new Set()
    let clash = false
    for (const set of comboSets) {
      const combo = set[Math.floor(rng() * set.length)]
      if (used.has(combo[0]) || used.has(combo[1])) {
        clash = true
        break
      }
      used.add(combo[0])
      used.add(combo[1])
      villains.push(combo)
    }
    if (clash) continue

    for (let k = 0; k < pool.length; k += 1) pool[k] = base[k]
    let filled = 0
    let i = 0
    while (filled < needed && i < pool.length) {
      const j = i + Math.floor(rng() * (pool.length - i))
      const card = pool[j]
      pool[j] = pool[i]
      pool[i] = card
      i += 1
      if (used.has(card)) continue
      runout[board.length + filled] = card
      filled += 1
    }

    const heroScore = scoreOf([...hole, ...runout])
    let beaten = false
    let tied = 0
    for (const villain of villains) {
      const score = scoreOf([...villain, ...runout])
      if (score > heroScore) {
        beaten = true
        break
      }
      if (score === heroScore) tied += 1
    }
    if (beaten) continue
    if (tied > 0) tie += 1 / (tied + 1)
    else win += 1
  }

  const equity = (win + tie) / trials
  return { win: win / trials, tie: tie / trials, lose: 1 - equity, equity }
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
