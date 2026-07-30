/**
 * How long an opponent takes to act.
 *
 * A fixed delay reads as robotic and, worse, teaches the wrong rhythm: at a real
 * table five players folding preflop is nearly instant, while one river decision
 * can take ten seconds. Timing is also information — a long tank followed by a
 * raise means something — so the delays here vary with the same things a real
 * player's do: how trivial the decision is, how much money is at stake, which
 * street it is, and who is deciding.
 *
 * Nothing here leaks hand strength. A tank is random, not triggered by a strong
 * hand, because a sim that let you time-tell the bots would train a habit that
 * gets punished against real players.
 */

/** Per-archetype tempo. Regulars multi-table and act fast and consistently. */
const TEMPO = {
  shark: { base: 0.75, variance: 0.5, tank: 0.05 },
  tag: { base: 0.8, variance: 0.55, tank: 0.04 },
  nit: { base: 0.9, variance: 0.6, tank: 0.03 },
  maniac: { base: 0.6, variance: 0.9, tank: 0.06 },
  station: { base: 1.15, variance: 1, tank: 0.05 },
  whale: { base: 1.25, variance: 1.15, tank: 0.06 },
}

const DEFAULT_TEMPO = { base: 1, variance: 0.8, tank: 0.05 }

const STREET_WEIGHT = { preflop: 0.75, flop: 1, turn: 1.15, river: 1.35 }

export const MIN_DELAY = 260
export const MAX_DELAY = 6500

/**
 * Speed settings. Realistic is the default and is the point of this module —
 * getting used to the rhythm of a real table. The faster settings exist because
 * building a meaningful sample at 12 seconds a hand takes all evening, and
 * volume is its own kind of practice.
 */
export const SPEEDS = {
  realistic: { id: 'realistic', name: 'Realistic', scale: 1, blurb: 'Real table rhythm' },
  brisk: { id: 'brisk', name: 'Brisk', scale: 0.45, blurb: 'Same shape, twice as fast' },
  instant: { id: 'instant', name: 'Instant', scale: 0.08, blurb: 'For grinding volume' },
}

export const SPEED_IDS = Object.keys(SPEEDS)

/**
 * Milliseconds before `action` is played.
 *
 * `rng` is injectable so the timing curve can be tested without waiting for it.
 */
export function decisionDelay({ street, action, toCall, potChips, stack, archetype, rng = Math.random }) {
  const tempo = TEMPO[archetype] ?? DEFAULT_TEMPO
  const facingBet = toCall > 0

  // A decision that is not really a decision resolves almost instantly. This is
  // the common case — most preflop action is somebody folding junk — and it is
  // what makes the table feel alive rather than sluggish.
  let ms
  const trivial = !facingBet && (action.type === 'fold' || action.type === 'check')
  if (action.type === 'fold' && !facingBet) ms = 400
  else if (action.type === 'check') ms = 520
  else if (action.type === 'fold') ms = street === 'preflop' ? 560 : 820
  else if (action.type === 'call') ms = 900
  else ms = 1250 // betting or raising also means choosing a size

  ms *= tempo.base
  ms *= STREET_WEIGHT[street] ?? 1

  // Bigger decisions take longer. Measured against the stack rather than the
  // pot, because what makes a spot slow is how much of your money is at risk.
  const commitment = stack > 0 ? Math.min(1, (toCall + potChips * 0.25) / stack) : 0
  ms *= 1 + commitment * 1.8

  // Log-normal-ish jitter: mostly clustered, occasionally slow, never negative.
  const jitter = Math.exp((rng() + rng() - 1) * tempo.variance)
  ms *= jitter

  // The tank. Random by design — see the note above about time tells. Trivial
  // decisions tank far less: staring at 7-2 offsuit for four seconds is not
  // human, and preflop folds are most of the actions at the table.
  const tankChance = trivial ? tempo.tank * 0.15 : tempo.tank
  if (rng() < tankChance) ms += 1400 + rng() * 3200

  return Math.round(Math.min(MAX_DELAY, Math.max(MIN_DELAY, ms)))
}

/** Convenience wrapper that reads what it needs out of engine state. */
export function delayForAction(state, legal, action, speed = 'realistic', rng = Math.random) {
  const scale = SPEEDS[speed]?.scale ?? 1
  return Math.max(60, Math.round(scale * decisionDelay({
    street: state.street,
    action,
    toCall: legal.callAmount,
    potChips: state.pot + state.players.reduce((sum, p) => sum + p.committed, 0),
    stack: legal.player.stack,
    archetype: legal.player.archetype,
    rng,
  })))
}
