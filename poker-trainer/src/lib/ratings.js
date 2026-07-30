/**
 * The three verdicts the trainer hands out, plus the literal Tailwind classes
 * each one paints with. Kept in one place so the buttons, the feedback panel,
 * and the frequency bar can never drift apart.
 */
export const RATINGS = {
  optimal: {
    id: 'optimal',
    label: 'Optimal Exploitative Play',
    short: 'Optimal',
    icon: 'CircleCheck',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500',
    bgSoft: 'bg-emerald-500/15',
    border: 'border-emerald-500/60',
    ring: 'ring-emerald-500/50',
    bar: 'bg-emerald-400',
  },
  acceptable: {
    id: 'acceptable',
    label: 'Acceptable / High Variance',
    short: 'Acceptable',
    icon: 'CircleAlert',
    text: 'text-amber-300',
    bg: 'bg-amber-500',
    bgSoft: 'bg-amber-500/15',
    border: 'border-amber-500/60',
    ring: 'ring-amber-500/50',
    bar: 'bg-amber-400',
  },
  blunder: {
    id: 'blunder',
    label: 'Live Blunder',
    short: 'Blunder',
    icon: 'CircleX',
    text: 'text-rose-300',
    bg: 'bg-rose-500',
    bgSoft: 'bg-rose-500/15',
    border: 'border-rose-500/60',
    ring: 'ring-rose-500/50',
    bar: 'bg-rose-400',
  },
}

/** Score awarded to the session accuracy metric for each verdict. */
export const RATING_SCORE = {
  optimal: 1,
  acceptable: 0.5,
  blunder: 0,
}
