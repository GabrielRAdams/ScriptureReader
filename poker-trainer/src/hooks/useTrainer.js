import { useCallback, useEffect, useMemo, useReducer } from 'react'

import { CATEGORIES, LEAKS, categoryIdsFor } from '@/data/categories'
import { SCENARIOS, scenariosForFormat } from '@/data/scenarios'
import { RATING_SCORE } from '@/lib/ratings'
import { loadSlice, saveSlice } from '@/lib/storage'

const ALL = 'ALL'
const REVIEW = 'REVIEW'
const STORAGE_KEY = 'drill'

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Scenario ids the user has ever blundered and not since answered optimally. */
function missedIds(history) {
  const outcome = new Map()
  for (const row of history) outcome.set(row.scenarioId, row.rating)
  return new Set(
    [...outcome.entries()].filter(([, rating]) => rating === 'blunder').map(([id]) => id),
  )
}

function poolFor(format, filter, history) {
  const inFormat = scenariosForFormat(format)
  if (filter === REVIEW) {
    const missed = missedIds(history)
    return inFormat.filter((s) => missed.has(s.id))
  }
  if (filter === ALL) return inFormat
  return inFormat.filter((s) => s.category === filter)
}

/**
 * A shuffled queue of scenario ids. queue[0] is the live scenario.
 *
 * Hands the user has previously blundered are floated to the front of each
 * fresh cycle — a cheap spaced-repetition pass that puts the leaks back in
 * front of you sooner without ever repeating a hand inside one cycle.
 */
function buildQueue(format, filter, history, avoidId) {
  const pool = poolFor(format, filter, history)
  if (pool.length === 0) return []

  const missed = missedIds(history)
  const ids = shuffle(pool.map((s) => s.id))
  const queue =
    filter === REVIEW ? ids : [...ids.filter((id) => missed.has(id)), ...ids.filter((id) => !missed.has(id))]

  if (queue.length > 1 && queue[0] === avoidId) {
    ;[queue[0], queue[1]] = [queue[1], queue[0]]
  }
  return queue
}

function init(persisted) {
  const format = persisted?.format ?? 'online'
  const history = persisted?.history ?? []
  return {
    format,
    filter: ALL,
    queue: buildQueue(format, ALL, history),
    chosenId: null,
    history,
    streak: 0,
    bestStreak: persisted?.bestStreak ?? 0,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ANSWER': {
      if (state.chosenId) return state
      const { scenario, choice } = action
      const streak =
        choice.rating === 'optimal'
          ? state.streak + 1
          : choice.rating === 'acceptable'
            ? state.streak
            : 0

      return {
        ...state,
        chosenId: choice.id,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        history: [
          ...state.history,
          {
            scenarioId: scenario.id,
            format: scenario.format,
            category: scenario.category,
            actionId: choice.id,
            actionLabel: choice.label,
            rating: choice.rating,
            leak: choice.leak ?? null,
          },
        ],
      }
    }

    case 'NEXT': {
      const rest = state.queue.slice(1)
      return {
        ...state,
        chosenId: null,
        queue:
          rest.length > 0
            ? rest
            : buildQueue(state.format, state.filter, state.history, state.queue[0]),
      }
    }

    case 'SET_FILTER': {
      if (action.filter === state.filter) return state
      return {
        ...state,
        filter: action.filter,
        chosenId: null,
        queue: buildQueue(state.format, action.filter, state.history, state.queue[0]),
      }
    }

    case 'SET_FORMAT': {
      if (action.format === state.format) return state
      return {
        ...state,
        format: action.format,
        filter: ALL,
        chosenId: null,
        queue: buildQueue(action.format, ALL, state.history, state.queue[0]),
      }
    }

    case 'RESET':
      return init({ format: state.format })

    default:
      return state
  }
}

/** Turns the raw answer log into the numbers the header and progress view render. */
function computeStats(history, format) {
  const rows = history.filter((h) => h.format === format)
  const total = rows.length
  const score = rows.reduce((sum, h) => sum + RATING_SCORE[h.rating], 0)
  const counts = rows.reduce((acc, h) => ({ ...acc, [h.rating]: acc[h.rating] + 1 }), {
    optimal: 0,
    acceptable: 0,
    blunder: 0,
  })

  const byCategory = categoryIdsFor(format).map((id) => {
    const catRows = rows.filter((h) => h.category === id)
    const catScore = catRows.reduce((sum, h) => sum + RATING_SCORE[h.rating], 0)
    return {
      id,
      ...CATEGORIES[id],
      attempts: catRows.length,
      blunders: catRows.filter((h) => h.rating === 'blunder').length,
      accuracy: catRows.length ? Math.round((catScore / catRows.length) * 100) : null,
    }
  })

  const leakCounts = rows.reduce((acc, h) => {
    if (!h.leak) return acc
    acc[h.leak] = (acc[h.leak] ?? 0) + 1
    return acc
  }, {})

  const leaks = Object.entries(leakCounts)
    .filter(([id]) => LEAKS[id])
    .map(([id, count]) => ({ ...LEAKS[id], count }))
    .sort((a, b) => b.count - a.count)

  // Repeat offences are always a pattern; a single one only counts as a
  // warning once there is enough of a sample to be worth mentioning.
  const patternLeaks = leaks.filter((l) => l.count >= 2)
  const earlyLeaks = total >= 3 ? leaks.slice(0, 1) : []

  const rated = byCategory.filter((c) => c.attempts >= 2)
  const weakest = rated.length
    ? rated.reduce((worst, c) => (c.accuracy < worst.accuracy ? c : worst))
    : null

  return {
    total,
    lifetime: history.length,
    accuracy: total ? Math.round((score / total) * 100) : 0,
    counts,
    byCategory,
    leaks,
    topLeaks: (patternLeaks.length ? patternLeaks : earlyLeaks).slice(0, 3),
    weakest: weakest && weakest.accuracy < 80 ? weakest : null,
  }
}

export function useTrainer() {
  const [state, dispatch] = useReducer(reducer, null, () => init(loadSlice(STORAGE_KEY, null)))

  useEffect(() => {
    saveSlice(STORAGE_KEY, {
      format: state.format,
      history: state.history,
      bestStreak: state.bestStreak,
    })
  }, [state.format, state.history, state.bestStreak])

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === state.queue[0]) ?? null,
    [state.queue],
  )

  const chosenAction = useMemo(
    () => (state.chosenId && scenario ? scenario.actions.find((a) => a.id === state.chosenId) : null),
    [scenario, state.chosenId],
  )

  const stats = useMemo(() => computeStats(state.history, state.format), [state.history, state.format])

  const missedCount = useMemo(() => {
    const missed = missedIds(state.history)
    return scenariosForFormat(state.format).filter((s) => missed.has(s.id)).length
  }, [state.history, state.format])

  const answer = useCallback(
    (choice) => dispatch({ type: 'ANSWER', scenario, choice }),
    [scenario],
  )
  const next = useCallback(() => dispatch({ type: 'NEXT' }), [])
  const setFilter = useCallback((filter) => dispatch({ type: 'SET_FILTER', filter }), [])
  const setFormat = useCallback((format) => dispatch({ type: 'SET_FORMAT', format }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    scenario,
    chosenAction,
    format: state.format,
    filter: state.filter,
    streak: state.streak,
    bestStreak: state.bestStreak,
    history: state.history,
    poolSize: poolFor(state.format, state.filter, state.history).length,
    remaining: state.queue.length,
    missedCount,
    stats,
    answer,
    next,
    setFilter,
    setFormat,
    reset,
  }
}

export { ALL as ALL_CATEGORIES, REVIEW as REVIEW_FILTER }
