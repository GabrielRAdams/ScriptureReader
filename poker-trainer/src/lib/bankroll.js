/**
 * Bankroll maths.
 *
 * More micro players quit from playing too high on too small a roll than from
 * any strategic leak, and the numbers are unintuitive: a genuinely winning
 * player with 20 buy-ins still goes broke a meaningful share of the time.
 *
 * Risk of ruin uses the standard exponential approximation for a random walk
 * with positive drift:
 *
 *     RoR = exp(-2 · winrate · bankroll / stdev²)
 *
 * with winrate and stdev both expressed per 100 hands and bankroll in big
 * blinds. It assumes you never move down in stakes — which makes it a
 * pessimistic bound, and the right one to plan against.
 */

/** Typical 6-max NL standard deviation, in bb/100. */
export const DEFAULT_STDEV = 90

export function riskOfRuin(winrateBB100, bankrollBB, stdevBB100 = DEFAULT_STDEV) {
  if (winrateBB100 <= 0) return 1
  if (bankrollBB <= 0) return 1
  const exponent = (-2 * winrateBB100 * bankrollBB) / (stdevBB100 * stdevBB100)
  return Math.min(1, Math.exp(exponent))
}

/** Bankroll (in bb) needed to hold risk of ruin at or below `target`. */
export function bankrollForRisk(winrateBB100, target = 0.05, stdevBB100 = DEFAULT_STDEV) {
  if (winrateBB100 <= 0) return Infinity
  return (-Math.log(target) * stdevBB100 * stdevBB100) / (2 * winrateBB100)
}

/**
 * Standard deviation of results over `hands`, in big blinds — the number behind
 * "how big a downswing is normal".
 */
export function swingStdev(hands, stdevBB100 = DEFAULT_STDEV) {
  return stdevBB100 * Math.sqrt(hands / 100)
}

/**
 * Probability of being down after `hands`, for a given winrate. Uses a normal
 * approximation of the cumulative distribution.
 */
export function probabilityLosing(winrateBB100, hands, stdevBB100 = DEFAULT_STDEV) {
  const mean = (winrateBB100 * hands) / 100
  const sd = swingStdev(hands, stdevBB100)
  if (sd === 0) return mean > 0 ? 0 : 1
  return normalCdf(-mean / sd)
}

/** Abramowitz & Stegun 7.1.26 error-function approximation. */
function erf(x) {
  const sign = x >= 0 ? 1 : -1
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429]
  const p = 0.3275911
  const z = Math.abs(x)
  const t = 1 / (1 + p * z)
  const y = 1 - ((((a[4] * t + a[3]) * t + a[2]) * t + a[1]) * t + a[0]) * t * Math.exp(-z * z)
  return sign * y
}

export function normalCdf(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

/** A downswing this deep or deeper is expected at some point in a long career. */
export function typicalDownswing(stdevBB100 = DEFAULT_STDEV, winrateBB100 = 5) {
  // Rough rule of thumb used by tracking software: the worst expected downswing
  // scales with variance and shrinks as the winrate grows.
  if (winrateBB100 <= 0) return Infinity
  return Math.round((stdevBB100 * stdevBB100) / winrateBB100 / 10) * 10
}

export const STAKES = [
  { id: 'nl2', label: 'NL2', bb: 0.02, buyIn: 2 },
  { id: 'nl5', label: 'NL5', bb: 0.05, buyIn: 5 },
  { id: 'nl10', label: 'NL10', bb: 0.1, buyIn: 10 },
  { id: 'nl25', label: 'NL25', bb: 0.25, buyIn: 25 },
  { id: 'nl50', label: 'NL50', bb: 0.5, buyIn: 50 },
]
