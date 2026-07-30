/**
 * 6-max No-Limit Hold'em cash game engine.
 *
 * A pure state machine: `startHand` deals, `applyAction` advances, and nothing
 * here touches React or randomness beyond the injected rng. That means the whole
 * thing can be run headlessly for thousands of hands to check invariants —
 * chips conserved, pots fully awarded, no negative stacks.
 *
 * Money is integer chips at 100 chips per big blind.
 */

import { BB, SB, makeDeck, shuffle } from './cards.js'
import { compareScores, evaluate } from './handEval.js'

/** Seat offset from the button -> position name, for a full 6-max table. */
const POSITIONS_6MAX = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO']

export function positionFor(seat, buttonSeat, playerCount) {
  const offset = (seat - buttonSeat + playerCount) % playerCount
  if (playerCount === 6) return POSITIONS_6MAX[offset]
  // Short-handed fallbacks keep the blinds correct if a seat ever opens up.
  if (playerCount === 2) return offset === 0 ? 'BTN/SB' : 'BB'
  return ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'][offset] ?? `P${offset}`
}

const clone = (state) => ({
  ...state,
  players: state.players.map((p) => ({ ...p, hole: [...p.hole] })),
  board: [...state.board],
  deck: [...state.deck],
  log: [...state.log],
  pots: state.pots ? state.pots.map((p) => ({ ...p })) : [],
})

/** Chips in the middle: collected pots plus everything bet on this street. */
export function totalPot(state) {
  return state.pot + state.players.reduce((sum, p) => sum + p.committed, 0)
}

function livePlayers(state) {
  return state.players.filter((p) => !p.folded)
}

/**
 * Starts a new hand. `seats` carries persistent player identity and stacks;
 * the button advances one seat per hand.
 */
export function startHand({ seats, buttonSeat, handNumber, rng = Math.random }) {
  const deck = shuffle(makeDeck(), rng)
  const playerCount = seats.length

  const players = seats.map((seat, i) => ({
    ...seat,
    seat: i,
    position: positionFor(i, buttonSeat, playerCount),
    hole: [deck.pop(), deck.pop()],
    folded: false,
    allIn: false,
    committed: 0,
    totalCommitted: 0,
    hasActed: false,
    lastAction: null,
    startingStack: seat.stack,
  }))

  const state = {
    handNumber,
    buttonSeat,
    players,
    board: [],
    deck,
    street: 'preflop',
    pot: 0,
    currentBet: 0,
    minRaise: BB,
    actorIndex: -1,
    log: [],
    pots: [],
    result: null,
  }

  // Post blinds. An all-in blind is legal and must not go negative.
  const sbIndex = (buttonSeat + 1) % playerCount
  const bbIndex = (buttonSeat + 2) % playerCount
  postBlind(state, sbIndex, SB)
  postBlind(state, bbIndex, BB)
  state.currentBet = BB
  state.minRaise = BB

  // Preflop action opens under the gun (left of the big blind).
  state.actorIndex = nextActor(state, bbIndex)
  state.log.push({ type: 'street', text: 'Preflop', street: 'preflop' })
  return state
}

function postBlind(state, index, amount) {
  const p = state.players[index]
  const posted = Math.min(amount, p.stack)
  p.stack -= posted
  p.committed = posted
  p.totalCommitted = posted
  if (p.stack === 0) p.allIn = true
}

/** Next seat (clockwise) that can still act, or -1 if nobody can. */
function nextActor(state, fromIndex) {
  const n = state.players.length
  for (let step = 1; step <= n; step += 1) {
    const idx = (fromIndex + step) % n
    const p = state.players[idx]
    if (!p.folded && !p.allIn) return idx
  }
  return -1
}

function bettingRoundComplete(state) {
  const live = livePlayers(state)
  if (live.length <= 1) return true
  const actionable = live.filter((p) => !p.allIn)
  if (actionable.length === 0) return true
  // One player left with a decision and everyone else all-in: they still owe a
  // call if they are behind, otherwise the street is done.
  return actionable.every((p) => p.hasActed && p.committed === state.currentBet)
}

/** What the current actor is allowed to do. */
export function legalActions(state) {
  if (state.actorIndex < 0 || state.street === 'complete') return null
  const p = state.players[state.actorIndex]
  const toCall = Math.min(state.currentBet - p.committed, p.stack)
  const maxRaiseTo = p.committed + p.stack

  // A raise must reach currentBet + minRaise, unless the player is going all in
  // for less (always allowed).
  const wantedMin = state.currentBet + state.minRaise
  const minRaiseTo = Math.min(wantedMin, maxRaiseTo)

  return {
    player: p,
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0,
    callAmount: toCall,
    // No raise available when calling already puts the player all in.
    canRaise: maxRaiseTo > state.currentBet,
    minRaiseTo,
    maxRaiseTo,
    isAllInCall: toCall === p.stack && toCall > 0,
    potIfCalled: totalPot(state) + toCall,
  }
}

/** Bet/raise sizes as chips, snapped into the legal band. */
export function sizingOptions(state) {
  const legal = legalActions(state)
  if (!legal || !legal.canRaise) return []
  const pot = totalPot(state)
  const { minRaiseTo, maxRaiseTo, callAmount } = legal
  const p = legal.player

  // Pot-sized raise = call + (pot after the call).
  const potRaise = p.committed + callAmount + (pot + callAmount)
  const raw = [
    { id: 'third', label: '⅓ pot', to: p.committed + callAmount + Math.round((pot + callAmount) / 3) },
    { id: 'half', label: '½ pot', to: p.committed + callAmount + Math.round((pot + callAmount) / 2) },
    { id: 'threeq', label: '¾ pot', to: p.committed + callAmount + Math.round(((pot + callAmount) * 3) / 4) },
    { id: 'pot', label: 'Pot', to: potRaise },
  ]

  const seen = new Set()
  const options = []
  for (const option of raw) {
    const to = Math.max(minRaiseTo, Math.min(option.to, maxRaiseTo))
    if (to >= maxRaiseTo) continue // all-in gets its own button
    if (seen.has(to)) continue
    seen.add(to)
    options.push({ ...option, to })
  }
  options.push({ id: 'allin', label: 'All in', to: maxRaiseTo })
  return options
}

/**
 * Applies an action for the current actor and advances the hand as far as it
 * can go without another decision (dealing streets, running out all-ins).
 */
export function applyAction(state, action) {
  if (state.actorIndex < 0 || state.street === 'complete') return state
  const s = clone(state)
  const p = s.players[s.actorIndex]
  const toCall = Math.min(s.currentBet - p.committed, p.stack)

  switch (action.type) {
    case 'fold': {
      p.folded = true
      p.lastAction = 'Fold'
      s.log.push({ type: 'action', seat: p.seat, name: p.name, text: 'folds' })
      break
    }

    case 'check': {
      if (toCall > 0) return state // illegal; ignore rather than corrupt state
      p.lastAction = 'Check'
      s.log.push({ type: 'action', seat: p.seat, name: p.name, text: 'checks' })
      break
    }

    case 'call': {
      p.stack -= toCall
      p.committed += toCall
      p.totalCommitted += toCall
      if (p.stack === 0) p.allIn = true
      p.lastAction = toCall === 0 ? 'Check' : 'Call'
      s.log.push({
        type: 'action',
        seat: p.seat,
        name: p.name,
        text: toCall === 0 ? 'checks' : `calls ${chips(toCall)}${p.allIn ? ' (all in)' : ''}`,
      })
      break
    }

    case 'raise': {
      const target = Math.max(
        Math.min(action.amount, p.committed + p.stack),
        Math.min(s.currentBet + 1, p.committed + p.stack),
      )
      const add = target - p.committed
      const wasBet = s.currentBet === 0
      p.stack -= add
      p.committed = target
      p.totalCommitted += add
      if (p.stack === 0) p.allIn = true

      const raiseSize = target - s.currentBet
      // An all-in that does not complete a full raise does not reopen the
      // betting for players who have already acted.
      const isFullRaise = raiseSize >= s.minRaise
      if (isFullRaise) s.minRaise = raiseSize
      s.currentBet = Math.max(s.currentBet, target)
      if (isFullRaise) {
        for (const other of s.players) {
          if (other.seat !== p.seat && !other.folded && !other.allIn) other.hasActed = false
        }
      }
      p.lastAction = wasBet ? 'Bet' : 'Raise'
      s.log.push({
        type: 'action',
        seat: p.seat,
        name: p.name,
        text: `${wasBet ? 'bets' : 'raises to'} ${chips(target)}${p.allIn ? ' (all in)' : ''}`,
      })
      break
    }

    default:
      return state
  }

  p.hasActed = true
  return advance(s)
}

function chips(amount) {
  const bb = amount / BB
  return `${Number.isInteger(bb) ? bb : bb.toFixed(1)}bb`
}

/** Moves the hand forward until a human/bot decision is required. */
function advance(s) {
  // Everyone folded to one player.
  if (livePlayers(s).length === 1) {
    collectBets(s)
    return finish(s, { uncontested: true })
  }

  if (!bettingRoundComplete(s)) {
    s.actorIndex = nextActor(s, s.actorIndex)
    // Nobody left who can act — run the board out.
    if (s.actorIndex < 0) return runOut(s)
    return s
  }

  collectBets(s)

  // If at most one player can still act, no more betting happens this hand.
  const canStillBet = livePlayers(s).filter((p) => !p.allIn)
  if (canStillBet.length <= 1) return runOut(s)

  return dealNextStreet(s)
}

function collectBets(s) {
  for (const p of s.players) {
    s.pot += p.committed
    p.committed = 0
    p.hasActed = false
  }
  s.currentBet = 0
  s.minRaise = BB
}

const NEXT_STREET = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown' }

function dealNextStreet(s) {
  const next = NEXT_STREET[s.street]
  if (next === 'showdown' || !next) return finish(s, {})

  s.street = next
  s.deck.pop() // burn card, for flavour and honesty
  if (next === 'flop') s.board.push(s.deck.pop(), s.deck.pop(), s.deck.pop())
  else s.board.push(s.deck.pop())

  for (const p of s.players) p.lastAction = null
  s.log.push({
    type: 'street',
    street: next,
    text: `${next[0].toUpperCase()}${next.slice(1)}: ${s.board.join(' ')}`,
  })

  // Postflop action starts with the first live player left of the button.
  s.actorIndex = nextActor(s, s.buttonSeat)
  if (s.actorIndex < 0) return runOut(s)
  return s
}

/** Deals every remaining street with no further betting (all-in situations). */
function runOut(s) {
  while (s.street !== 'river' && livePlayers(s).length > 1) {
    const next = NEXT_STREET[s.street]
    if (!next || next === 'showdown') break
    s.street = next
    s.deck.pop()
    if (next === 'flop') s.board.push(s.deck.pop(), s.deck.pop(), s.deck.pop())
    else s.board.push(s.deck.pop())
    s.log.push({
      type: 'street',
      street: next,
      text: `${next[0].toUpperCase()}${next.slice(1)}: ${s.board.join(' ')}`,
    })
  }
  return finish(s, { runOut: true })
}

/**
 * Builds side pots from each player's total contribution and awards them.
 * Folded players' chips stay in the pot; only live players are eligible.
 */
function buildPots(s) {
  const contributors = s.players.filter((p) => p.totalCommitted > 0)
  const levels = [...new Set(contributors.map((p) => p.totalCommitted))].sort((a, b) => a - b)

  const pots = []
  let previous = 0
  for (const level of levels) {
    let amount = 0
    for (const p of s.players) {
      amount += Math.min(Math.max(p.totalCommitted - previous, 0), level - previous)
    }
    const eligible = s.players.filter((p) => !p.folded && p.totalCommitted >= level)
    if (amount > 0) pots.push({ amount, eligible: eligible.map((p) => p.seat) })
    previous = level
  }

  // Merge pots with identical eligibility so the UI shows "main + side", not five slivers.
  const merged = []
  for (const pot of pots) {
    const key = pot.eligible.join(',')
    const last = merged[merged.length - 1]
    if (last && last.eligible.join(',') === key) last.amount += pot.amount
    else merged.push({ ...pot })
  }
  return merged
}

function finish(s, { uncontested = false } = {}) {
  const live = livePlayers(s)
  const showdown = !uncontested && live.length > 1

  const evaluated = new Map()
  if (showdown) {
    for (const p of live) {
      evaluated.set(p.seat, evaluate([...p.hole, ...s.board]))
    }
  }

  const pots = buildPots(s)
  const payouts = new Map()
  const potResults = []

  for (const pot of pots) {
    const eligible = pot.eligible
      .map((seat) => s.players.find((p) => p.seat === seat))
      .filter((p) => !p.folded)

    let winners
    if (!showdown || eligible.length === 1) {
      winners = eligible.slice(0, 1)
    } else {
      let best = null
      winners = []
      for (const p of eligible) {
        const score = evaluated.get(p.seat).score
        const cmp = best ? compareScores(score, best) : 1
        if (cmp > 0) {
          best = score
          winners = [p]
        } else if (cmp === 0) {
          winners.push(p)
        }
      }
    }

    // Split, with the odd chip going to the first winner left of the button.
    const share = Math.floor(pot.amount / winners.length)
    let remainder = pot.amount - share * winners.length
    const ordered = [...winners].sort(
      (a, b) =>
        ((a.seat - s.buttonSeat + s.players.length) % s.players.length) -
        ((b.seat - s.buttonSeat + s.players.length) % s.players.length),
    )
    for (const w of ordered) {
      let amount = share
      if (remainder > 0) {
        amount += 1
        remainder -= 1
      }
      payouts.set(w.seat, (payouts.get(w.seat) ?? 0) + amount)
    }

    potResults.push({
      amount: pot.amount,
      winners: winners.map((w) => w.seat),
    })
  }

  for (const [seat, amount] of payouts.entries()) {
    const p = s.players.find((x) => x.seat === seat)
    p.stack += amount
  }

  const potTotal = pots.reduce((sum, p) => sum + p.amount, 0)

  s.street = 'complete'
  s.actorIndex = -1
  s.pot = 0
  s.result = {
    showdown,
    potTotal,
    pots: potResults,
    payouts: Object.fromEntries(payouts),
    hands: showdown
      ? Object.fromEntries([...evaluated.entries()].map(([seat, r]) => [seat, r.name]))
      : {},
    deltas: Object.fromEntries(s.players.map((p) => [p.seat, p.stack - p.startingStack])),
  }

  const winnerNames = [...new Set(potResults.flatMap((p) => p.winners))]
    .map((seat) => s.players.find((p) => p.seat === seat).name)
    .join(', ')
  const totalWon = [...payouts.values()].reduce((a, b) => a + b, 0)
  s.log.push({
    type: 'result',
    text: showdown
      ? `Showdown: ${winnerNames} wins ${chips(totalWon)}`
      : `${winnerNames} wins ${chips(totalWon)} uncontested`,
  })

  return s
}

export { chips as formatChips }
