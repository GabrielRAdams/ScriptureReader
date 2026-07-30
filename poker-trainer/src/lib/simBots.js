/**
 * Rule-based opponents for the sim.
 *
 * These are not solvers and are not trying to be. Each archetype is a caricature
 * of a player type you actually meet at NL2-NL25, tuned so that the exploits the
 * drills teach are the exploits that work here: the station pays off value bets
 * and never folds, the nit folds to aggression, the maniac barrels air, and the
 * TAG plays a tight-aggressive game that punishes sloppiness.
 *
 * Every archetype's stat line (VPIP/PFR) is roughly what it would show in a HUD,
 * so the profiles in the drill scenarios and the players here describe the same
 * people.
 */

import { BB } from './cards.js'
import { analyzeHand } from './handEval.js'
import { handCode } from './cards.js'
import { percentileOf } from './handStrength.js'
import { legalActions, totalPot } from './pokerSim.js'

export const ARCHETYPES = {
  nit: {
    id: 'nit',
    name: 'Nit',
    hud: '15/12',
    blurb: 'Tight-passive. Folds constantly, never bluffs, only bets when strong.',
    tone: 'border-slate-500/40 bg-slate-500/15 text-slate-200',
    open: { UTG: 0.09, HJ: 0.11, CO: 0.15, BTN: 0.22, SB: 0.16, BB: 0.16 },
    limp: 0.05,
    callOpen: 0.12,
    threeBet: 0.035,
    callThreeBet: 0.05,
    fourBet: 0.015,
    cbet: 0.45,
    barrel: 0.3,
    bluff: 0.04,
    callDown: 'strong',
    raiseValue: 0.55,
    foldToAggression: 0.75,
    adapts: true,
  },
  tag: {
    id: 'tag',
    name: 'TAG Reg',
    hud: '22/18',
    blurb: 'Solid tight-aggressive regular. C-bets a lot, folds when beaten.',
    tone: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
    open: { UTG: 0.14, HJ: 0.18, CO: 0.26, BTN: 0.44, SB: 0.36, BB: 0.3 },
    limp: 0,
    callOpen: 0.16,
    threeBet: 0.07,
    callThreeBet: 0.09,
    fourBet: 0.025,
    cbet: 0.7,
    barrel: 0.5,
    bluff: 0.22,
    callDown: 'medium',
    raiseValue: 0.7,
    foldToAggression: 0.55,
    adapts: true,
  },
  station: {
    id: 'station',
    name: 'Station',
    hud: '55/8',
    blurb: 'Calls everything, folds almost nothing, bets only the nuts.',
    tone: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    open: { UTG: 0.36, HJ: 0.4, CO: 0.46, BTN: 0.58, SB: 0.5, BB: 0.46 },
    limp: 0.86,
    callOpen: 0.55,
    threeBet: 0.02,
    callThreeBet: 0.3,
    fourBet: 0.008,
    cbet: 0.3,
    barrel: 0.2,
    bluff: 0.02,
    callDown: 'any-pair',
    raiseValue: 0.35,
    foldToAggression: 0.12,
  },
  maniac: {
    id: 'maniac',
    name: 'Maniac',
    hud: '45/34',
    blurb: 'Loose-aggressive. Barrels with anything and bluffs far too often.',
    tone: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
    open: { UTG: 0.3, HJ: 0.38, CO: 0.48, BTN: 0.65, SB: 0.55, BB: 0.5 },
    limp: 0.05,
    callOpen: 0.4,
    threeBet: 0.16,
    callThreeBet: 0.25,
    fourBet: 0.05,
    cbet: 0.85,
    barrel: 0.75,
    bluff: 0.55,
    callDown: 'weak',
    raiseValue: 0.8,
    foldToAggression: 0.35,
  },
  whale: {
    id: 'whale',
    name: 'Whale',
    hud: '65/12',
    blurb: 'Plays every hand, limps constantly, chases every draw to the river.',
    tone: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
    open: { UTG: 0.45, HJ: 0.5, CO: 0.56, BTN: 0.7, SB: 0.6, BB: 0.55 },
    limp: 0.84,
    callOpen: 0.65,
    threeBet: 0.03,
    callThreeBet: 0.35,
    fourBet: 0.01,
    cbet: 0.35,
    barrel: 0.25,
    bluff: 0.08,
    callDown: 'any-pair',
    raiseValue: 0.4,
    foldToAggression: 0.15,
  },
}

/** A believable NL10 table: two regs and three recreational players. */
export const DEFAULT_TABLE = ['tag', 'station', 'nit', 'whale', 'maniac']

export const BOT_NAMES = {
  nit: ['RockGarden', 'FoldMaster', 'TightIsRight', 'Granite'],
  tag: ['GrindHouse', 'ValueTown', 'SolverSlave', 'RegLife'],
  station: ['CallMeMaybe', 'NeverFolds', 'SheriffJoe', 'PayItAll'],
  maniac: ['ShipItFish', 'RiverRat', 'AllInAndy', 'TiltCity'],
  whale: ['LuckyLimper', 'ChaseTheDream', 'SplashyPants', 'JustHere4Fun'],
}

const BUCKET_ORDER = ['air', 'weak', 'draw', 'medium', 'strong', 'monster']

/**
 * Regulars adjust to how you have been playing; recreational players never do.
 * That asymmetry is the point — a station will pay you off forever, but keep
 * running the same bluff at a reg and he starts calling.
 *
 * `reads` comes from the hero's own tracked stats, so the bots are exploiting
 * exactly the numbers the leak report shows you.
 */
export function adjustProfile(profile, reads, heroIsOpponent) {
  if (!profile.adapts || !reads || !heroIsOpponent || reads.hands < 25) return profile
  const adjusted = { ...profile }

  // You fold to c-bets too much: he bets more, and more often as a bluff.
  if (reads.foldToCbet != null && reads.foldToCbet > 60) {
    adjusted.cbet = Math.min(0.95, profile.cbet + 0.15)
    adjusted.bluff = Math.min(0.8, profile.bluff + 0.15)
  }

  // You barely bluff: he folds his marginal hands to your aggression.
  if (reads.aggressionFactor != null && reads.aggressionFactor < 0.8) {
    adjusted.foldToAggression = Math.min(0.9, profile.foldToAggression + 0.18)
  }

  // You bluff constantly: he starts calling you down lighter.
  if (reads.aggressionFactor != null && reads.aggressionFactor > 2.5) {
    adjusted.foldToAggression = Math.max(0.15, profile.foldToAggression - 0.22)
    adjusted.callDown = 'weak'
  }

  // You play far too many hands: he 3-bets you wider.
  if (reads.vpip != null && reads.vpip > 34) {
    adjusted.threeBet = Math.min(0.25, profile.threeBet * 1.8)
  }

  return adjusted
}

function bucketAtLeast(bucket, floor) {
  return BUCKET_ORDER.indexOf(bucket) >= BUCKET_ORDER.indexOf(floor)
}

/** Did anybody put in more than a big blind before the current actor? */
function preflopContext(state, actor) {
  const raises = state.players.filter((p) => p.committed > BB && p.seat !== actor.seat)
  const limpers = state.players.filter(
    (p) => p.committed === BB && !p.folded && p.position !== 'BB' && p.seat !== actor.seat,
  )
  // A 3-bet has happened when there are at least two raise-sized commitments.
  const raiseCount = state.players.filter((p) => p.committed > BB).length
  return {
    facingRaise: state.currentBet > BB,
    raiseCount,
    limperCount: limpers.length,
    biggestRaise: raises.length ? Math.max(...raises.map((p) => p.committed)) : BB,
  }
}

function preflopDecision(state, legal, actor, profile, rng) {
  const code = handCode(actor.hole)
  const pct = percentileOf(code)
  const ctx = preflopContext(state, actor)
  const pos = actor.position === 'BTN/SB' ? 'SB' : actor.position

  if (!ctx.facingRaise) {
    const openPct = profile.open[pos] ?? 0.2
    // Limpers make hands more playable and iso-raises more valuable.
    const widened = openPct * (1 + ctx.limperCount * 0.15)

    if (pct <= widened) {
      // Recreational players limp a lot of what they play.
      if (rng() < profile.limp && pct > openPct * 0.35 && legal.canCheck) {
        return { type: 'check' }
      }
      if (rng() < profile.limp && pct > openPct * 0.35 && legal.canCall) {
        return { type: 'call' }
      }
      if (legal.canRaise) {
        const size = BB * (2.5 + ctx.limperCount)
        return { type: 'raise', amount: Math.max(legal.minRaiseTo, Math.round(size)) }
      }
    }
    if (legal.canCheck) return { type: 'check' }
    // Limping along with a weak hand, or folding.
    if (legal.canCall && rng() < profile.limp && pct <= widened * 1.35) return { type: 'call' }
    return { type: 'fold' }
  }

  // Facing a raise (or a 3-bet).
  const isThreeBetOrMore = ctx.raiseCount >= 2
  const raiseThreshold = isThreeBetOrMore ? profile.fourBet : profile.threeBet
  const callThreshold = isThreeBetOrMore ? profile.callThreeBet : profile.callOpen
  // The big blind is already invested, so it defends wider.
  const priceBonus = pos === 'BB' ? 1.5 : 1

  if (pct <= raiseThreshold && legal.canRaise) {
    const target = Math.round(state.currentBet * (isThreeBetOrMore ? 2.2 : 3))
    return { type: 'raise', amount: Math.max(legal.minRaiseTo, Math.min(target, legal.maxRaiseTo)) }
  }
  if (pct <= callThreshold * priceBonus && legal.canCall) return { type: 'call' }
  if (legal.canCheck) return { type: 'check' }
  return { type: 'fold' }
}

function postflopDecision(state, legal, actor, profile, rng) {
  const analysis = analyzeHand(actor.hole, state.board)
  const pot = totalPot(state)
  const { bucket, outs } = analysis
  const facingBet = legal.canCall && legal.callAmount > 0
  const isPreflopAggressor = state.log.some(
    (l) => l.type === 'action' && l.seat === actor.seat && l.text.startsWith('raises'),
  )

  if (!facingBet) {
    // Value betting.
    if (bucketAtLeast(bucket, 'strong') && rng() < profile.raiseValue && legal.canRaise) {
      const fraction = bucket === 'monster' ? 0.7 : 0.5
      return { type: 'raise', amount: sizeBet(legal, actor, pot, fraction) }
    }
    // Continuation betting and semi-bluffing.
    const cbetChance = state.street === 'flop' && isPreflopAggressor ? profile.cbet : profile.barrel
    const bluffChance = bucket === 'draw' ? Math.max(cbetChance, profile.bluff) : profile.bluff
    if (legal.canRaise && rng() < bluffChance * (state.street === 'river' ? 0.6 : 1)) {
      return { type: 'raise', amount: sizeBet(legal, actor, pot, bucket === 'draw' ? 0.6 : 0.45) }
    }
    if (legal.canCheck) return { type: 'check' }
  }

  if (facingBet) {
    const price = legal.callAmount / (pot + legal.callAmount)

    // Raise for value with big hands.
    if (bucket === 'monster' && legal.canRaise && rng() < profile.raiseValue) {
      return { type: 'raise', amount: sizeBet(legal, actor, pot, 0.8) }
    }

    // Draws continue on price; loose players chase past it.
    if (bucket === 'draw' || outs >= 8) {
      const equity = state.street === 'river' ? 0 : outs * (state.street === 'flop' ? 0.04 : 0.02)
      if (equity > price) return { type: 'call' }
      if (rng() < (1 - profile.foldToAggression) * 0.6) return { type: 'call' }
      return { type: 'fold' }
    }

    // Top pair and better call normal bets, but even a strong one-pair hand
    // folds to enough pressure — without this, every pot runs to stacks.
    if (bucketAtLeast(bucket, 'strong')) {
      if (price <= 0.45) return { type: 'call' }
      return rng() < profile.foldToAggression * 0.6 ? { type: 'fold' } : { type: 'call' }
    }

    if (bucket === 'medium') {
      // Stations are defined by this line: any pair, almost any price. They
      // still let go of bottom pair facing a big river bet.
      if (profile.callDown === 'any-pair') {
        const ceiling = state.street === 'river' ? 0.5 : 0.62
        if (price <= ceiling || rng() < 0.5) return { type: 'call' }
        return { type: 'fold' }
      }
      if (price <= 0.33) return { type: 'call' }
      return rng() < profile.foldToAggression ? { type: 'fold' } : { type: 'call' }
    }

    // Weak hands and air. Floating is rare and mostly a cheap, in-position
    // move — without this the pool would fold to every single bet.
    const floatChance = (1 - profile.foldToAggression) * (price < 0.3 ? 0.3 : 0.1)
    if (bucket === 'weak' && (price < 0.25 || rng() < floatChance)) return { type: 'call' }
    if (legal.canRaise && state.street !== 'river' && rng() < profile.bluff * 0.12) {
      return { type: 'raise', amount: sizeBet(legal, actor, pot, 0.7) }
    }
    if (rng() < floatChance * 0.5) return { type: 'call' }
    return { type: 'fold' }
  }

  if (legal.canCheck) return { type: 'check' }
  return { type: 'fold' }
}

function sizeBet(legal, actor, pot, fraction) {
  const target = actor.committed + legal.callAmount + Math.round((pot + legal.callAmount) * fraction)
  return Math.max(legal.minRaiseTo, Math.min(target, legal.maxRaiseTo))
}

/**
 * Picks an action for the bot currently on turn.
 *
 * `reads` is optional: pass the hero's tracked stats and any adapting regulars
 * at the table will use them when the hero is still in the pot.
 */
export function botAction(state, rng = Math.random, reads = null) {
  const legal = legalActions(state)
  if (!legal) return null
  const actor = legal.player
  const base = ARCHETYPES[actor.archetype] ?? ARCHETYPES.tag
  const heroLive = state.players.some((p) => p.isHero && !p.folded)
  const profile = adjustProfile(base, reads, heroLive)

  const decision =
    state.street === 'preflop'
      ? preflopDecision(state, legal, actor, profile, rng)
      : postflopDecision(state, legal, actor, profile, rng)

  // Final safety net: never return an action the engine would reject.
  if (decision.type === 'check' && !legal.canCheck) {
    return legal.canCall ? { type: 'call' } : { type: 'fold' }
  }
  if (decision.type === 'call' && !legal.canCall) {
    return legal.canCheck ? { type: 'check' } : { type: 'fold' }
  }
  if (decision.type === 'raise' && !legal.canRaise) {
    if (legal.canCall) return { type: 'call' }
    return legal.canCheck ? { type: 'check' } : { type: 'fold' }
  }
  return decision
}
