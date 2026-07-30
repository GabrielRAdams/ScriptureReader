/**
 * Canonical display order for action buttons.
 *
 * Scenarios list their actions best-first for readability, so rendering them in
 * source order would put the correct answer in the same slot every time. Sorting
 * by the natural poker escalation (fold → passive → small → large → shove)
 * removes that tell while keeping the layout predictable to tap.
 */
const ACTION_ORDER = {
  fold: 0,
  check: 1,
  call: 2,
  'bet-small': 3,
  'raise-small': 3,
  'bet-large': 4,
  'raise-large': 4,
  shove: 5,
}

export function sortActionsForDisplay(actions) {
  return [...actions].sort(
    (a, b) => (ACTION_ORDER[a.id] ?? 99) - (ACTION_ORDER[b.id] ?? 99),
  )
}
