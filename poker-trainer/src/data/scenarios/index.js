import { LIVE_SCENARIOS } from './live.js'
import { ONLINE_SCENARIOS } from './online.js'

/**
 * The two libraries merged, with `format` stamped on so the drill can filter by
 * game type. Keeping the source files separate means a live scenario can never
 * quietly leak into an online drill (and vice versa) — the sizings and pool
 * tendencies are not interchangeable.
 */
export const SCENARIOS = [
  ...ONLINE_SCENARIOS.map((s) => ({ ...s, format: 'online' })),
  ...LIVE_SCENARIOS.map((s) => ({ ...s, format: 'live' })),
]

export const SCENARIOS_BY_CATEGORY = SCENARIOS.reduce((acc, scenario) => {
  acc[scenario.category] = acc[scenario.category] || []
  acc[scenario.category].push(scenario)
  return acc
}, {})

export function scenariosForFormat(format) {
  return SCENARIOS.filter((s) => s.format === format)
}

export { LIVE_SCENARIOS, ONLINE_SCENARIOS }
