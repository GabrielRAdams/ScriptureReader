import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import { BB, handCode } from '@/lib/cards'
import { CHARTS } from '@/data/ranges'
import { buildChart } from '@/lib/range'
import { applyAction, legalActions, startHand } from '@/lib/pokerSim'
import { ARCHETYPES, BOT_NAMES, DEFAULT_TABLE, botAction } from '@/lib/simBots'
import { loadSlice, saveSlice } from '@/lib/storage'

const STORAGE_KEY = 'sim'
const BUY_IN = 100 * BB
/** Cash-game convention: top back up to a full stack between hands. */
const REBUY_BELOW = 100 * BB

const EMPTY_STATS = {
  hands: 0,
  netChips: 0,
  vpip: 0,
  pfr: 0,
  flops: 0,
  showdowns: 0,
  showdownsWon: 0,
  handsWon: 0,
  best: 0,
  worst: 0,
}

function buildSeats(rng = Math.random) {
  const used = new Set()
  const bots = DEFAULT_TABLE.map((archetype, i) => {
    const pool = BOT_NAMES[archetype]
    let name = pool[Math.floor(rng() * pool.length)]
    while (used.has(name)) name = pool[(pool.indexOf(name) + 1) % pool.length]
    used.add(name)
    return { id: `bot-${i}`, name, archetype, stack: BUY_IN, isHero: false }
  })
  // Hero sits in seat 0; the button rotates, so position varies every hand.
  return [{ id: 'hero', name: 'You', archetype: 'hero', stack: BUY_IN, isHero: true }, ...bots]
}

/** RFI charts keyed by position, for the preflop coach. */
const RFI_BY_POSITION = Object.fromEntries(
  CHARTS.filter((c) => c.id.startsWith('rfi-')).map((c) => [
    c.label,
    buildChart(c.actions),
  ]),
)

function init(persisted) {
  const seats = buildSeats()
  return {
    seats,
    buttonSeat: 1,
    handNumber: 1,
    hand: null,
    stats: persisted?.stats ?? EMPTY_STATS,
    coachOn: persisted?.coachOn ?? true,
    lastCoachNote: null,
    autoNext: false,
  }
}

/** Everything the hero did this hand that we want to count in the HUD. */
function summarise(hand, heroSeat) {
  const hero = hand.players.find((p) => p.seat === heroSeat)
  const heroActions = hand.log.filter((l) => l.type === 'action' && l.seat === heroSeat)
  const preflopEnd = hand.log.findIndex((l) => l.type === 'street' && l.street === 'flop')
  const preflopActions = hand.log.filter(
    (l, i) => l.type === 'action' && l.seat === heroSeat && (preflopEnd === -1 || i < preflopEnd),
  )

  const vpip = preflopActions.some(
    (l) => l.text.startsWith('calls') || l.text.startsWith('raises') || l.text.startsWith('bets'),
  )
  const pfr = preflopActions.some((l) => l.text.startsWith('raises'))
  const sawFlop = hand.board.length >= 3 && !heroFoldedBeforeFlop(hand, heroSeat)
  const showdown = Boolean(hand.result?.showdown) && !hero.folded
  const won = (hand.result?.payouts?.[heroSeat] ?? 0) > 0

  return {
    vpip,
    pfr,
    sawFlop,
    showdown,
    won,
    delta: hand.result?.deltas?.[heroSeat] ?? 0,
    heroActions,
  }
}

function heroFoldedBeforeFlop(hand, heroSeat) {
  const flopIndex = hand.log.findIndex((l) => l.type === 'street' && l.street === 'flop')
  if (flopIndex === -1) return true
  return hand.log
    .slice(0, flopIndex)
    .some((l) => l.type === 'action' && l.seat === heroSeat && l.text === 'folds')
}

function reducer(state, action) {
  switch (action.type) {
    case 'DEAL': {
      // Cash-game top-up, and bust-out replacement for anyone who lost it all.
      const seats = state.seats.map((s) => ({
        ...s,
        stack: s.stack < REBUY_BELOW ? BUY_IN : s.stack,
      }))
      return {
        ...state,
        seats,
        hand: startHand({
          seats,
          buttonSeat: state.buttonSeat,
          handNumber: state.handNumber,
        }),
        lastCoachNote: null,
      }
    }

    case 'ACT': {
      if (!state.hand || state.hand.street === 'complete') return state
      const next = applyAction(state.hand, action.action)
      if (next === state.hand) return state

      let stats = state.stats
      let seats = state.seats
      if (next.street === 'complete') {
        const summary = summarise(next, 0)
        stats = {
          hands: stats.hands + 1,
          netChips: stats.netChips + summary.delta,
          vpip: stats.vpip + (summary.vpip ? 1 : 0),
          pfr: stats.pfr + (summary.pfr ? 1 : 0),
          flops: stats.flops + (summary.sawFlop ? 1 : 0),
          showdowns: stats.showdowns + (summary.showdown ? 1 : 0),
          showdownsWon: stats.showdownsWon + (summary.showdown && summary.won ? 1 : 0),
          handsWon: stats.handsWon + (summary.won ? 1 : 0),
          best: Math.max(stats.best, summary.delta),
          worst: Math.min(stats.worst, summary.delta),
        }
        seats = next.players.map((p) => ({
          id: p.id,
          name: p.name,
          archetype: p.archetype,
          stack: p.stack,
          isHero: p.isHero,
        }))
      }

      return { ...state, hand: next, stats, seats }
    }

    case 'COACH':
      return { ...state, lastCoachNote: action.note }

    case 'NEXT_HAND':
      return {
        ...state,
        buttonSeat: (state.buttonSeat + 1) % state.seats.length,
        handNumber: state.handNumber + 1,
        hand: null,
      }

    case 'TOGGLE_COACH':
      return { ...state, coachOn: !state.coachOn }

    case 'NEW_TABLE':
      return { ...init({ stats: state.stats, coachOn: state.coachOn }), stats: state.stats }

    case 'RESET':
      return init({ coachOn: state.coachOn })

    default:
      return state
  }
}

/**
 * Compares a hero preflop decision against the RFI chart for that seat. Only
 * fires for unopened pots, where the chart actually applies.
 */
function coachPreflop(hand, action) {
  const hero = hand.players.find((p) => p.isHero)
  if (!hero || hand.street !== 'preflop') return null

  const raisedBefore = hand.players.some((p) => !p.isHero && p.committed > BB)
  const limpers = hand.players.filter((p) => !p.isHero && !p.folded && p.committed === BB && p.position !== 'BB')
  if (raisedBefore || limpers.length > 0) return null
  if (hero.position === 'BB') return null

  const chart = RFI_BY_POSITION[hero.position === 'BTN/SB' ? 'SB' : hero.position]
  if (!chart) return null

  const code = handCode(hero.hole)
  const shouldOpen = chart.get(code) === 'raise'
  const didOpen = action.type === 'raise'
  const didFold = action.type === 'fold'

  if (shouldOpen && didFold) {
    return {
      tone: 'warn',
      text: `${code} is an open from ${hero.position} — folding it gives up a spot the chart says is profitable.`,
    }
  }
  if (!shouldOpen && didOpen) {
    return {
      tone: 'warn',
      text: `${code} is outside the ${hero.position} opening range. Opening too wide from early seats is where micro winrates go to die.`,
    }
  }
  if (shouldOpen && didOpen) {
    return { tone: 'good', text: `${code} from ${hero.position} — chart open. Nice.` }
  }
  return null
}

export function useSim() {
  const [state, dispatch] = useReducer(reducer, null, () => init(loadSlice(STORAGE_KEY, null)))
  const timer = useRef(null)

  useEffect(() => {
    saveSlice(STORAGE_KEY, { stats: state.stats, coachOn: state.coachOn })
  }, [state.stats, state.coachOn])

  // Deal the first hand automatically.
  useEffect(() => {
    if (!state.hand) {
      const id = setTimeout(() => dispatch({ type: 'DEAL' }), 260)
      return () => clearTimeout(id)
    }
    return undefined
  }, [state.hand])

  const hand = state.hand
  const legal = useMemo(() => (hand ? legalActions(hand) : null), [hand])
  const isHeroTurn = Boolean(legal?.player?.isHero)

  // Bots act on a timer so the table reads like a real one instead of
  // resolving instantly.
  useEffect(() => {
    if (!hand || hand.street === 'complete' || isHeroTurn || !legal) return undefined
    timer.current = setTimeout(
      () => {
        const action = botAction(hand)
        if (action) dispatch({ type: 'ACT', action })
      },
      550 + Math.random() * 450,
    )
    return () => clearTimeout(timer.current)
  }, [hand, isHeroTurn, legal])

  const act = useCallback(
    (action) => {
      if (!hand || !isHeroTurn) return
      if (state.coachOn) {
        const note = coachPreflop(hand, action)
        if (note) dispatch({ type: 'COACH', note })
      }
      dispatch({ type: 'ACT', action })
    },
    [hand, isHeroTurn, state.coachOn],
  )

  const nextHand = useCallback(() => dispatch({ type: 'NEXT_HAND' }), [])
  const newTable = useCallback(() => dispatch({ type: 'NEW_TABLE' }), [])
  const resetStats = useCallback(() => dispatch({ type: 'RESET' }), [])
  const toggleCoach = useCallback(() => dispatch({ type: 'TOGGLE_COACH' }), [])

  const derived = useMemo(() => {
    const { stats } = state
    const per = (n) => (stats.hands ? Math.round((n / stats.hands) * 100) : 0)
    return {
      ...stats,
      bb: stats.netChips / BB,
      bbPer100: stats.hands ? (stats.netChips / BB / stats.hands) * 100 : 0,
      vpipPct: per(stats.vpip),
      pfrPct: per(stats.pfr),
      wtsdPct: stats.flops ? Math.round((stats.showdowns / stats.flops) * 100) : 0,
      wsdPct: stats.showdowns ? Math.round((stats.showdownsWon / stats.showdowns) * 100) : 0,
    }
  }, [state])

  return {
    hand,
    legal,
    isHeroTurn,
    seats: state.seats,
    buttonSeat: state.buttonSeat,
    handNumber: state.handNumber,
    stats: derived,
    coachOn: state.coachOn,
    coachNote: state.lastCoachNote,
    archetypes: ARCHETYPES,
    act,
    nextHand,
    newTable,
    resetStats,
    toggleCoach,
  }
}
