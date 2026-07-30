/**
 * Turns played hands into a HUD and a leak report.
 *
 * The drill tab names your leaks from scenario answers; this does the same job
 * from hands you actually played, which is the only place habits really show.
 * Every metric carries the sample size it needs before it is allowed to accuse
 * you of anything — a 62% fold-to-c-bet over eight hands is noise.
 */

import { BB } from './cards.js'

export const EMPTY_TOTALS = {
  hands: 0,
  netChips: 0,
  vpip: 0,
  pfr: 0,
  flops: 0,
  showdowns: 0,
  showdownsWon: 0,
  handsWon: 0,
  wonWhenSawFlop: 0,
  best: 0,
  worst: 0,
  // Opportunity/action pairs, so every rate has a denominator.
  cbetChances: 0,
  cbets: 0,
  facedCbet: 0,
  foldedToCbet: 0,
  bbFacedRaise: 0,
  bbFolded: 0,
  riverCalls: 0,
  riverCallsWon: 0,
  threeBetChances: 0,
  threeBets: 0,
  limps: 0,
  aggressiveActions: 0,
  passiveActions: 0,
}

/**
 * Reduces one finished hand to counter deltas for the hero seat.
 * Reads the engine's structured log rather than parsing its prose.
 */
export function summariseHand(hand, heroSeat = 0) {
  const hero = hand.players.find((p) => p.seat === heroSeat)
  const delta = hand.result?.deltas?.[heroSeat] ?? 0
  const won = (hand.result?.payouts?.[heroSeat] ?? 0) > 0

  const actions = hand.log.filter((l) => l.type === 'action')
  const heroActions = actions.filter((l) => l.seat === heroSeat)
  const byStreet = (street) => heroActions.filter((l) => l.street === street)

  const preflop = byStreet('preflop')
  const foldedPreflop = preflop.some((l) => l.action === 'fold')
  const vpip = preflop.some((l) => l.action === 'call' || l.action === 'raise' || l.action === 'bet')
  const pfr = preflop.some((l) => l.action === 'raise')
  const limped = preflop.some((l) => l.action === 'call') && !pfr && hero.position !== 'BB'

  const sawFlop = hand.board.length >= 3 && !foldedPreflop

  // Preflop aggressor = last player to raise before the flop.
  const preflopRaises = actions.filter((l) => l.street === 'preflop' && l.action === 'raise')
  const aggressorSeat = preflopRaises.length ? preflopRaises.at(-1).seat : null

  // C-bet: hero took the betting lead preflop, saw a flop, and got to act.
  const flopActions = actions.filter((l) => l.street === 'flop')
  const heroFlop = flopActions.filter((l) => l.seat === heroSeat)
  const cbetChance = sawFlop && aggressorSeat === heroSeat && heroFlop.length > 0
  const cbet = cbetChance && heroFlop.some((l) => l.action === 'bet' || l.action === 'raise')

  // Facing a c-bet: somebody else was the aggressor and bet the flop first.
  const firstFlopBetIndex = flopActions.findIndex((l) => l.action === 'bet')
  const facedCbet =
    sawFlop &&
    firstFlopBetIndex !== -1 &&
    flopActions[firstFlopBetIndex].seat === aggressorSeat &&
    aggressorSeat !== heroSeat &&
    flopActions.slice(firstFlopBetIndex).some((l) => l.seat === heroSeat)
  const foldedToCbet =
    facedCbet &&
    flopActions
      .slice(firstFlopBetIndex)
      .some((l) => l.seat === heroSeat && l.action === 'fold')

  // Big blind defense.
  const bbFacedRaise = hero.position === 'BB' && preflopRaises.length > 0 && preflop.length > 0
  const bbFolded = bbFacedRaise && foldedPreflop

  // A 3-bet chance is any spot where hero acted preflop facing exactly one raise.
  const threeBetChance =
    preflop.length > 0 && preflopRaises.some((l) => l.seat !== heroSeat)
  const threeBet = threeBetChance && pfr

  // River calls, and whether they were good.
  const riverCalls = byStreet('river').filter((l) => l.action === 'call').length
  const riverCallWon = riverCalls > 0 && won

  const aggressive = heroActions.filter((l) => l.action === 'bet' || l.action === 'raise').length
  const passive = heroActions.filter((l) => l.action === 'call').length

  return {
    hands: 1,
    netChips: delta,
    vpip: vpip ? 1 : 0,
    pfr: pfr ? 1 : 0,
    flops: sawFlop ? 1 : 0,
    showdowns: hand.result?.showdown && !hero.folded ? 1 : 0,
    showdownsWon: hand.result?.showdown && !hero.folded && won ? 1 : 0,
    handsWon: won ? 1 : 0,
    wonWhenSawFlop: sawFlop && won ? 1 : 0,
    best: delta,
    worst: delta,
    cbetChances: cbetChance ? 1 : 0,
    cbets: cbet ? 1 : 0,
    facedCbet: facedCbet ? 1 : 0,
    foldedToCbet: foldedToCbet ? 1 : 0,
    bbFacedRaise: bbFacedRaise ? 1 : 0,
    bbFolded: bbFolded ? 1 : 0,
    riverCalls,
    riverCallsWon: riverCallWon ? 1 : 0,
    threeBetChances: threeBetChance ? 1 : 0,
    threeBets: threeBet ? 1 : 0,
    limps: limped ? 1 : 0,
    aggressiveActions: aggressive,
    passiveActions: passive,
  }
}

export function addTotals(totals, delta) {
  const next = { ...totals }
  for (const key of Object.keys(EMPTY_TOTALS)) {
    if (key === 'best') next.best = Math.max(totals.best, delta.best)
    else if (key === 'worst') next.worst = Math.min(totals.worst, delta.worst)
    else next[key] = (totals[key] ?? 0) + (delta[key] ?? 0)
  }
  return next
}

const rate = (num, den) => (den > 0 ? (num / den) * 100 : null)

/** Every derived percentage, plus the sample size behind it. */
export function deriveStats(t) {
  return {
    hands: t.hands,
    bb: t.netChips / BB,
    bbPer100: t.hands ? (t.netChips / BB / t.hands) * 100 : 0,
    vpip: rate(t.vpip, t.hands),
    pfr: rate(t.pfr, t.hands),
    wtsd: rate(t.showdowns, t.flops),
    wsd: rate(t.showdownsWon, t.showdowns),
    wwsf: rate(t.wonWhenSawFlop, t.flops),
    cbet: rate(t.cbets, t.cbetChances),
    foldToCbet: rate(t.foldedToCbet, t.facedCbet),
    bbFold: rate(t.bbFolded, t.bbFacedRaise),
    threeBet: rate(t.threeBets, t.threeBetChances),
    limp: rate(t.limps, t.hands),
    riverCallWinRate: rate(t.riverCallsWon, t.riverCalls),
    aggressionFactor: t.passiveActions > 0 ? t.aggressiveActions / t.passiveActions : null,
    samples: {
      hands: t.hands,
      flops: t.flops,
      cbetChances: t.cbetChances,
      facedCbet: t.facedCbet,
      bbFacedRaise: t.bbFacedRaise,
      riverCalls: t.riverCalls,
      threeBetChances: t.threeBetChances,
      showdowns: t.showdowns,
    },
  }
}

/**
 * Leak rules. Each needs a minimum sample before it can fire, so an early
 * session stays quiet rather than accusing you on four hands.
 */
const RULES = [
  {
    id: 'foldToCbetHigh',
    sample: (s) => s.samples.facedCbet >= 15,
    test: (s) => s.foldToCbet > 62,
    label: 'Folding to c-bets too often',
    message: (s) =>
      `You fold to ${Math.round(s.foldToCbet)}% of flop c-bets. Anything over ~60% means opponents can bet any two cards profitably — float more in position and defend your pairs and draws.`,
  },
  {
    id: 'cbetTooWide',
    sample: (s) => s.samples.cbetChances >= 15,
    test: (s) => s.cbet > 82,
    label: 'C-betting indiscriminately',
    message: (s) =>
      `You c-bet ${Math.round(s.cbet)}% of flops. Boards that hit the caller's range — low and connected — want a check, not an automatic bet.`,
  },
  {
    id: 'cbetTooLittle',
    sample: (s) => s.samples.cbetChances >= 20,
    test: (s) => s.cbet < 40,
    label: 'Giving up the betting lead',
    message: (s) =>
      `You only c-bet ${Math.round(s.cbet)}% of flops. Against a pool that folds this much, taking the initiative on dry boards is close to free money.`,
  },
  {
    id: 'bbOverFold',
    sample: (s) => s.samples.bbFacedRaise >= 20,
    test: (s) => s.bbFold > 72,
    label: 'Over-folding the big blind',
    message: (s) =>
      `You fold the big blind ${Math.round(s.bbFold)}% of the time. At 3.7:1 you only need ~21% equity — most broadway and suited hands clear that.`,
  },
  {
    id: 'tooLoose',
    sample: (s) => s.samples.hands >= 60,
    test: (s) => s.vpip > 34,
    label: 'Playing too many hands',
    message: (s) =>
      `Your VPIP is ${Math.round(s.vpip)}%. A winning 6-max reg runs near 22-25% — the extra hands are played out of position with dominated holdings.`,
  },
  {
    id: 'tooTight',
    sample: (s) => s.samples.hands >= 60,
    test: (s) => s.vpip < 15,
    label: 'Too tight to win',
    message: (s) =>
      `Your VPIP is ${Math.round(s.vpip)}%. That is tight enough that the blinds alone outpace your edge — open more from the cutoff and button.`,
  },
  {
    id: 'passive',
    sample: (s) => s.samples.hands >= 60,
    test: (s) => s.vpip > 0 && s.pfr / s.vpip < 0.55,
    label: 'Too passive preflop',
    message: (s) =>
      `You raise only ${Math.round((s.pfr / s.vpip) * 100)}% of the hands you play (${Math.round(s.pfr)}/${Math.round(s.vpip)}). Limping and cold-calling give up the initiative and the dead money.`,
  },
  {
    id: 'limping',
    sample: (s) => s.samples.hands >= 40,
    test: (s) => s.limp > 8,
    label: 'Limping',
    message: (s) =>
      `You limp in ${Math.round(s.limp)}% of hands. There is almost no spot in 6-max where limping beats raising or folding.`,
  },
  {
    id: 'stationy',
    sample: (s) => s.samples.flops >= 30,
    test: (s) => s.wtsd > 34,
    label: 'Going to showdown too often',
    message: (s) =>
      `You reach showdown in ${Math.round(s.wtsd)}% of the flops you see. Above ~32% usually means calling down with hands that beat nothing but a bluff.`,
  },
  {
    id: 'payingOffRivers',
    sample: (s) => s.samples.riverCalls >= 12,
    test: (s) => s.riverCallWinRate < 32,
    label: 'Paying off rivers',
    message: (s) =>
      `Your river calls win only ${Math.round(s.riverCallWinRate)}% of the time. At micro stakes big river bets are value far more often than bluffs — tighten the bottom of your calling range.`,
  },
  {
    id: 'noThreeBet',
    sample: (s) => s.samples.threeBetChances >= 40,
    test: (s) => s.threeBet < 4,
    label: 'Never 3-betting',
    message: (s) =>
      `You 3-bet ${s.threeBet.toFixed(1)}% of the time you face a raise. Flatting instead of 3-betting keeps you in raked multiway pots with a capped range.`,
  },
]

export function detectLeaks(stats) {
  return RULES.filter((rule) => rule.sample(stats) && rule.test(stats)).map((rule) => ({
    id: rule.id,
    label: rule.label,
    message: rule.message(stats),
  }))
}

/** What is still too small a sample to judge — shown so the report is honest. */
export function pendingChecks(stats) {
  return RULES.filter((rule) => !rule.sample(stats)).map((rule) => rule.label)
}
