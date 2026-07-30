import { useCallback, useMemo, useReducer } from 'react'

import { CATEGORIES, CATEGORY_IDS, LEAKS } from '@/data/categories'
import { SCENARIOS, SCENARIOS_BY_CATEGORY } from '@/data/scenarios'
import { RATING_SCORE } from '@/lib/ratings'

const ALL = 'ALL'

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function poolFor(filter) {
  return filter === ALL ? SCENARIOS : (SCENARIOS_BY_CATEGORY[filter] ?? [])
}

/**
 * A shuffled queue of scenario ids. queue[0] is the live scenario; when it runs
 * dry we reshuffle so the user never sees the same hand twice in a cycle, and
 * never sees the same hand twice in a row across cycles.
 */
function buildQueue(filter, avoidId) {
  const queue = shuffle(poolFor(filter).map((s) => s.id))
  if (queue.length > 1 && queue[0] === avoidId) {
    ;[queue[0], queue[1]] = [queue[1], queue[0]]
  }
  return queue
}

function init(filter = ALL) {
  return {
    filter,
    queue: buildQueue(filter),
    chosenId: null,
    history: [],
    streak: 0,
    bestStreak: 0,
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
        queue: rest.length > 0 ? rest : buildQueue(state.filter, state.queue[0]),
      }
    }

    case 'SET_FILTER': {
      if (action.filter === state.filter) return state
      return {
        ...state,
        filter: action.filter,
        chosenId: null,
        queue: buildQueue(action.filter, state.queue[0]),
      }
    }

    case 'RESET':
      return init(state.filter)

    default:
      return state
  }
}

/** Turns the raw answer log into the numbers the header and drawer render. */
function computeStats(history) {
  const total = history.length
  const score = history.reduce((sum, h) => sum + RATING_SCORE[h.rating], 0)
  const counts = history.reduce(
    (acc, h) => ({ ...acc, [h.rating]: acc[h.rating] + 1 }),
    { optimal: 0, acceptable: 0, blunder: 0 },
  )

  const byCategory = CATEGORY_IDS.map((id) => {
    const rows = history.filter((h) => h.category === id)
    const catScore = rows.reduce((sum, h) => sum + RATING_SCORE[h.rating], 0)
    return {
      id,
      ...CATEGORIES[id],
      attempts: rows.length,
      blunders: rows.filter((h) => h.rating === 'blunder').length,
      accuracy: rows.length ? Math.round((catScore / rows.length) * 100) : null,
    }
  })

  // Leaks need at least two occurrences before we call them a pattern.
  const leakCounts = history.reduce((acc, h) => {
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
    accuracy: total ? Math.round((score / total) * 100) : 0,
    counts,
    byCategory,
    leaks,
    topLeaks: (patternLeaks.length ? patternLeaks : earlyLeaks).slice(0, 3),
    weakest: weakest && weakest.accuracy < 80 ? weakest : null,
  }
}

export function useTrainer() {
  const [state, dispatch] = useReducer(reducer, ALL, init)

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === state.queue[0]) ?? SCENARIOS[0],
    [state.queue],
  )

  const chosenAction = useMemo(
    () => (state.chosenId ? scenario.actions.find((a) => a.id === state.chosenId) : null),
    [scenario, state.chosenId],
  )

  const stats = useMemo(() => computeStats(state.history), [state.history])

  const answer = useCallback((choice) => dispatch({ type: 'ANSWER', scenario, choice }), [scenario])
  const next = useCallback(() => dispatch({ type: 'NEXT' }), [])
  const setFilter = useCallback((filter) => dispatch({ type: 'SET_FILTER', filter }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    scenario,
    chosenAction,
    filter: state.filter,
    streak: state.streak,
    bestStreak: state.bestStreak,
    history: state.history,
    poolSize: poolFor(state.filter).length,
    remaining: state.queue.length,
    stats,
    answer,
    next,
    setFilter,
    reset,
  }
}

export { ALL as ALL_CATEGORIES }
