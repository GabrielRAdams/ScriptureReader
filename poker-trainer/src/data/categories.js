/**
 * Scenario categories. `accent` values are literal Tailwind classes so the
 * JIT compiler can see them (no dynamic class-name construction).
 */
export const CATEGORIES = {
  A: {
    id: 'A',
    name: 'Limped Pots',
    title: 'Facing 3+ Limpers Preflop',
    tagline: 'Isolating vs over-calling',
    icon: 'Users',
    dot: 'bg-sky-400',
    chip: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
    bar: 'bg-sky-400',
  },
  B: {
    id: 'B',
    name: 'Multiway Flops',
    title: 'Multiway Flop Sizing',
    tagline: 'Size down bluffs, size up value',
    icon: 'Layers',
    dot: 'bg-emerald-400',
    chip: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    bar: 'bg-emerald-400',
  },
  C: {
    id: 'C',
    name: 'River Heat',
    title: 'Facing Heavy River Aggression',
    tagline: 'Exploitative folding vs hero calling',
    icon: 'Flame',
    dot: 'bg-orange-400',
    chip: 'border-orange-500/40 bg-orange-500/15 text-orange-200',
    bar: 'bg-orange-400',
  },
  D: {
    id: 'D',
    name: '3-Bet Pots OOP',
    title: 'Playing 3-Bet Pots Out of Position',
    tagline: 'Range advantage without position',
    icon: 'Swords',
    dot: 'bg-violet-400',
    chip: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
    bar: 'bg-violet-400',
  },
}

export const CATEGORY_IDS = Object.keys(CATEGORIES)

/**
 * Named leaks. A wrong answer tags itself with one of these ids, and the
 * session tracker turns repeat offences into plain-language warnings.
 */
export const LEAKS = {
  passivePreflop: {
    id: 'passivePreflop',
    label: 'Limping along',
    message: 'You are over-calling limpers instead of isolating. Raise bigger to play heads-up with the initiative.',
  },
  overIsolating: {
    id: 'overIsolating',
    label: 'Iso-raising too wide',
    message: 'You are blasting raises into limpers with hands that want cheap multiway flops. Some hands print more by over-limping.',
  },
  underSizing: {
    id: 'underSizing',
    label: 'Raising too small',
    message: 'Your raise sizes are too small for live games. 4-6x plus one blind per limper is the baseline.',
  },
  thinValueMissed: {
    id: 'thinValueMissed',
    label: 'Leaving value behind',
    message: 'You keep checking or under-betting hands that beat the calling range. Live players pay off — charge them.',
  },
  overBluffMultiway: {
    id: 'overBluffMultiway',
    label: 'Bluffing multiway',
    message: 'You are firing into three or four opponents with no equity. Someone always has a piece in live multiway pots.',
  },
  underProtection: {
    id: 'underProtection',
    label: 'Not charging draws',
    message: 'You are checking or min-betting big made hands on wet boards. Multiway draws need to pay a toll.',
  },
  bloatingOOP: {
    id: 'bloatingOOP',
    label: 'Bloating pots OOP',
    message: 'You are raising marginal made hands out of position and turning them into bluff-catchers for stacks.',
  },
  riverCallTooWide: {
    id: 'riverCallTooWide',
    label: 'Calling too wide on rivers',
    message: 'You are paying off big live river bets with bluff-catchers. Passive players do not overbet or check-raise as bluffs.',
  },
  riverOverFold: {
    id: 'riverOverFold',
    label: 'Over-folding rivers',
    message: 'You are folding hands with the odds or the read to call. Not every live river bet is the nuts.',
  },
  spewRaise: {
    id: 'spewRaise',
    label: 'Spew-raising rivers',
    message: 'Raising a bluff-catcher only folds out worse and gets called by better. Turn it into a call or a fold.',
  },
  loose3BetDefense: {
    id: 'loose3BetDefense',
    label: 'Defending 3-bets too wide',
    message: 'Live 3-bets and 4-bets are strong and you are out of position. Fold the dominated part of your range.',
  },
  autoCbet: {
    id: 'autoCbet',
    label: 'Auto c-betting',
    message: 'You are continuation betting boards that hammer the caller. Live players do not fold aces or top pair to one bet.',
  },
}
