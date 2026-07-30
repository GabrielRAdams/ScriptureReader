import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import { BB, handCode } from '@/lib/cards'
import { CHARTS } from '@/data/ranges'
import { buildChart } from '@/lib/range'
import { equityVsRanges } from '@/lib/equity'
import { applyAction, legalActions, startHand } from '@/lib/pokerSim'
import { ARCHETYPES, BOT_NAMES, DIFFICULTIES, botAction, rangesAtStreet } from '@/lib/simBots'
import { SPEEDS, delayForAction } from '@/lib/tempo'
import { EMPTY_TOTALS, addTotals, deriveStats, detectLeaks, pendingChecks, summariseHand } from '@/lib/simStats'
import { loadSlice, saveSlice } from '@/lib/storage'

const STORAGE_KEY = 'sim'
const BUY_IN = 100 * BB

function buildSeats(difficulty = 'soft', rng = Math.random) {
  const used = new Set()
  const bots = (DIFFICULTIES[difficulty] ?? DIFFICULTIES.soft).table.map((archetype, i) => {
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
  CHARTS.filter((c) => c.id.startsWith('rfi-')).map((c) => [c.label, buildChart(c.actions)]),
)

function init(persisted) {
  const difficulty = persisted?.difficulty ?? 'soft'
  return {
    difficulty,
    speed: persisted?.speed ?? 'realistic',
    seats: buildSeats(difficulty),
    buttonSeat: 1,
    handNumber: 1,
    hand: null,
    totals: persisted?.totals ?? EMPTY_TOTALS,
    coachOn: persisted?.coachOn ?? true,
    lastCoachNote: null,
    lastEquity: null,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'DEAL': {
      // Every hand starts 100bb effective. Winners at a real micro table cash
      // out and get replaced by someone with a fresh buy-in, and letting stacks
      // drift into 400bb territory would turn this into deep-stack practice —
      // a different game from the one being trained. Profit is tracked
      // separately in `totals`, so nothing is lost by resetting.
      const seats = state.seats.map((s) => ({ ...s, stack: BUY_IN }))
      return {
        ...state,
        seats,
        hand: startHand({ seats, buttonSeat: state.buttonSeat, handNumber: state.handNumber }),
        lastCoachNote: null,
        lastEquity: null,
      }
    }

    case 'ACT': {
      if (!state.hand || state.hand.street === 'complete') return state
      const next = applyAction(state.hand, action.action)
      if (next === state.hand) return state

      let totals = state.totals
      let seats = state.seats
      let lastEquity = state.lastEquity

      if (next.street === 'complete') {
        totals = addTotals(totals, summariseHand(next, 0))
        seats = next.players.map((p) => ({
          id: p.id,
          name: p.name,
          archetype: p.archetype,
          stack: p.stack,
          isHero: p.isHero,
        }))

        // Only worth computing when hero actually contested the pot. Ranges
        // are modelled from what opponents did preflop rather than assumed
        // random — random hands would flatter every hand the hero played.
        const hero = next.players.find((p) => p.isHero)
        const opponents = next.players.filter((p) => !p.folded && !p.isHero).length
        if (!hero.folded && opponents > 0 && next.board.length === 5) {
          const ranges = rangesAtStreet(next, hero.seat, 'preflop')
          lastEquity = equityVsRanges(hero.hole, next.board.slice(0, 3), ranges, 1500).equity
        }
      }

      return { ...state, hand: next, totals, seats, lastEquity }
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

    case 'SET_SPEED':
      return { ...state, speed: action.speed }

    case 'NEW_TABLE':
      return init({
        totals: state.totals,
        coachOn: state.coachOn,
        difficulty: state.difficulty,
        speed: state.speed,
      })

    case 'SET_DIFFICULTY': {
      if (action.difficulty === state.difficulty) return state
      // A different table means different opponents, so the hand in progress
      // ends here. Lifetime stats carry over.
      return init({
        totals: state.totals,
        coachOn: state.coachOn,
        difficulty: action.difficulty,
        speed: state.speed,
      })
    }

    case 'RESET':
      return init({ coachOn: state.coachOn, difficulty: state.difficulty, speed: state.speed })

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
  const limpers = hand.players.filter(
    (p) => !p.isHero && !p.folded && p.committed === BB && p.position !== 'BB',
  )
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
    saveSlice(STORAGE_KEY, {
      totals: state.totals,
      coachOn: state.coachOn,
      difficulty: state.difficulty,
      speed: state.speed,
    })
  }, [state.totals, state.coachOn, state.difficulty, state.speed])

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

  const stats = useMemo(() => deriveStats(state.totals), [state.totals])
  const leaks = useMemo(() => detectLeaks(stats), [stats])
  const pending = useMemo(() => pendingChecks(stats), [stats])

  // What the adapting regulars know about you.
  const reads = useMemo(
    () => ({
      hands: stats.hands,
      vpip: stats.vpip,
      foldToCbet: stats.foldToCbet,
      aggressionFactor: stats.aggressionFactor,
    }),
    [stats],
  )

  // Bots decide immediately but act on a human-looking delay: the decision has
  // to exist first, because how long somebody takes depends on what they are
  // doing. A snap fold and a river raise should not take the same time.
  useEffect(() => {
    if (!hand || hand.street === 'complete' || isHeroTurn || !legal) return undefined
    const settings = DIFFICULTIES[state.difficulty] ?? DIFFICULTIES.soft
    const action = botAction(hand, Math.random, reads, {
      trials: settings.trials,
      adaptAfter: settings.adaptAfter,
    })
    if (!action) return undefined

    timer.current = setTimeout(
      () => dispatch({ type: 'ACT', action }),
      delayForAction(hand, legal, action, state.speed),
    )
    return () => clearTimeout(timer.current)
  }, [hand, isHeroTurn, legal, reads, state.difficulty, state.speed])

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

  const setSpeed = useCallback((speed) => dispatch({ type: 'SET_SPEED', speed }), [])
  const setDifficulty = useCallback(
    (difficulty) => dispatch({ type: 'SET_DIFFICULTY', difficulty }),
    [],
  )
  const nextHand = useCallback(() => dispatch({ type: 'NEXT_HAND' }), [])
  const newTable = useCallback(() => dispatch({ type: 'NEW_TABLE' }), [])
  const resetStats = useCallback(() => dispatch({ type: 'RESET' }), [])
  const toggleCoach = useCallback(() => dispatch({ type: 'TOGGLE_COACH' }), [])

  // Do any regulars have enough of a sample to be adjusting to you yet?
  const settings = DIFFICULTIES[state.difficulty] ?? DIFFICULTIES.soft
  const botsAdapting = stats.hands >= settings.adaptAfter

  return {
    hand,
    legal,
    isHeroTurn,
    seats: state.seats,
    buttonSeat: state.buttonSeat,
    handNumber: state.handNumber,
    stats,
    leaks,
    pending,
    botsAdapting,
    lastEquity: state.lastEquity,
    coachOn: state.coachOn,
    coachNote: state.lastCoachNote,
    archetypes: ARCHETYPES,
    difficulty: state.difficulty,
    difficultySettings: settings,
    setDifficulty,
    speed: state.speed,
    speedSettings: SPEEDS[state.speed] ?? SPEEDS.realistic,
    setSpeed,
    act,
    nextHand,
    newTable,
    resetStats,
    toggleCoach,
  }
}
