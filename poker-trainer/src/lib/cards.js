/**
 * Card primitives. Cards are the same 'Ah' / 'Td' strings the drill uses, so
 * the PlayingCard component renders sim cards without any conversion.
 *
 * All money in the sim is integer "chips" where 1 big blind = 100 chips. Poker
 * halves pots and takes rake, and floats would drift; integers never do.
 */

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
export const SUITS = ['s', 'h', 'd', 'c']

export const BB = 100
export const SB = 50

/** 0-12, where 12 is an ace. */
export function rankValue(card) {
  return RANKS.indexOf(card[0])
}

export function suitOf(card) {
  return card[1]
}

export function makeDeck() {
  const deck = []
  for (const rank of RANKS) {
    for (const suit of SUITS) deck.push(rank + suit)
  }
  return deck
}

/** Fisher-Yates. Takes an rng so tests can run deterministically. */
export function shuffle(deck, rng = Math.random) {
  const copy = [...deck]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Chips -> a short big-blind label: 1250 -> "12.5bb". */
export function toBB(chips, suffix = 'bb') {
  const bb = chips / BB
  const rounded = Math.round(bb * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${suffix}`
}

/** Chips -> a dollar label at the given stake, e.g. NL10 has bb = $0.10. */
export function toMoney(chips, bigBlindUSD) {
  const usd = (chips / BB) * bigBlindUSD
  return `$${usd.toFixed(2)}`
}

/** 'AKs' style shorthand for a two-card hand — used by the coach and log. */
export function handCode(hole) {
  const [a, b] = hole
  const [hi, lo] = rankValue(a) >= rankValue(b) ? [a, b] : [b, a]
  if (hi[0] === lo[0]) return hi[0] + lo[0]
  return hi[0] + lo[0] + (suitOf(hi) === suitOf(lo) ? 's' : 'o')
}
