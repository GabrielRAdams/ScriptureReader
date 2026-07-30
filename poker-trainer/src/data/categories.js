/**
 * Two formats, each with its own category set. Live and online micro pools make
 * opposite mistakes often enough that mixing their scenarios would teach the
 * wrong reflex, so the drill filters by format first.
 *
 * `accent` values are literal Tailwind classes so the JIT compiler can see them
 * (no dynamic class-name construction).
 */
export const FORMATS = {
  online: {
    id: 'online',
    name: 'Online Micros',
    short: 'Micros',
    blurb: 'NL2 – NL25, 6-max',
    detail: '2.2-3x opens, 6-handed, rake-aware, regs and stations',
  },
  live: {
    id: 'live',
    name: 'Live Cash',
    short: 'Live',
    blurb: '$1/$2 & $2/$5',
    detail: '4-6x opens, 9-handed, limpers, family pots',
  },
}

export const FORMAT_IDS = Object.keys(FORMATS)

export const CATEGORIES = {
  // ── Online micro stakes ──────────────────────────────────────────────
  E: {
    id: 'E',
    format: 'online',
    name: 'Preflop',
    title: 'Opens, Defense & Facing 3-Bets',
    tagline: 'Sizing, squeezing, and rake-aware folds',
    icon: 'Dices',
    dot: 'bg-cyan-400',
    chip: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200',
    bar: 'bg-cyan-400',
  },
  F: {
    id: 'F',
    format: 'online',
    name: 'C-Betting',
    title: 'C-Betting & Board Texture',
    tagline: 'Range bets, sizing tells, and checking back',
    icon: 'Layers',
    dot: 'bg-emerald-400',
    chip: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    bar: 'bg-emerald-400',
  },
  G: {
    id: 'G',
    format: 'online',
    name: 'Barreling',
    title: 'Barreling & Bluffing Micro Pools',
    tagline: 'Who folds, who never folds',
    icon: 'Flame',
    dot: 'bg-orange-400',
    chip: 'border-orange-500/40 bg-orange-500/15 text-orange-200',
    bar: 'bg-orange-400',
  },
  I: {
    id: 'I',
    format: 'online',
    name: 'Turn Play',
    title: 'Turn Decisions',
    tagline: 'The street where micro winrates leak',
    icon: 'GitFork',
    dot: 'bg-teal-400',
    chip: 'border-teal-500/40 bg-teal-500/15 text-teal-200',
    bar: 'bg-teal-400',
  },
  H: {
    id: 'H',
    format: 'online',
    name: 'Bluff-Catching',
    title: 'Bluff-Catching & Fold Discipline',
    tagline: 'Paying off regs vs paying off fish',
    icon: 'Shield',
    dot: 'bg-violet-400',
    chip: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
    bar: 'bg-violet-400',
  },

  // ── Live cash ────────────────────────────────────────────────────────
  A: {
    id: 'A',
    format: 'live',
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
    format: 'live',
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
    format: 'live',
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
    format: 'live',
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

export function categoryIdsFor(format) {
  return CATEGORY_IDS.filter((id) => CATEGORIES[id].format === format)
}

/**
 * Named leaks. A wrong answer tags itself with one of these ids, and the
 * session tracker turns repeat offences into plain-language warnings.
 */
export const LEAKS = {
  // Preflop
  passivePreflop: {
    id: 'passivePreflop',
    label: 'Limping along',
    message:
      'You are over-calling limpers instead of isolating. Raise bigger to play heads-up with the initiative.',
  },
  overIsolating: {
    id: 'overIsolating',
    label: 'Iso-raising too wide',
    message:
      'You are blasting raises into limpers with hands that want cheap multiway flops. Some hands print more by over-limping.',
  },
  underSizing: {
    id: 'underSizing',
    label: 'Raising too small',
    message:
      'Your raise sizes are too small for the pool. Size up until calling with junk stops being profitable for them.',
  },
  overFoldBlinds: {
    id: 'overFoldBlinds',
    label: 'Over-folding the blinds',
    message:
      'You are folding the big blind against small opens. You only need ~30% equity to defend — the price does the work.',
  },
  coldCalling: {
    id: 'coldCalling',
    label: 'Cold-calling too much',
    message:
      'Flatting opens out of position builds raked multiway pots with a capped range. 3-bet or fold instead.',
  },
  missedSqueeze: {
    id: 'missedSqueeze',
    label: 'Passing up squeezes',
    message:
      'Open-plus-caller spots are the softest money in micros — the caller is capped and folds far too often. Squeeze.',
  },
  loose3BetDefense: {
    id: 'loose3BetDefense',
    label: 'Defending 3-bets too wide',
    message:
      'Micro 3-bets and 4-bets are value-heavy and you are often dominated. Fold the bottom of your continuing range.',
  },

  // Postflop betting
  thinValueMissed: {
    id: 'thinValueMissed',
    label: 'Leaving value behind',
    message:
      'You keep checking or under-betting hands that beat the calling range. Micro players pay off — charge them.',
  },
  overCbet: {
    id: 'overCbet',
    label: 'Auto c-betting',
    message:
      'You are continuation betting boards that smash the caller. Check the textures that hit their range, not yours.',
  },
  cbetSizing: {
    id: 'cbetSizing',
    label: 'One-size-fits-all betting',
    message:
      'Dry boards want small bets, wet boards and stations want big ones. Let the texture and the opponent pick the size.',
  },
  underProtection: {
    id: 'underProtection',
    label: 'Not charging draws',
    message:
      'You are checking or min-betting big made hands on wet boards. Draws need to pay a toll.',
  },
  overBluffMultiway: {
    id: 'overBluffMultiway',
    label: 'Bluffing multiway',
    message:
      'You are firing into two or three opponents with no equity. Someone always has a piece in multiway pots.',
  },
  bluffingStations: {
    id: 'bluffingStations',
    label: 'Bluffing calling stations',
    message:
      'You are running bluffs at players who never fold. Against stations, value bet relentlessly and bluff almost never.',
  },
  missedBarrel: {
    id: 'missedBarrel',
    label: 'Giving up too early',
    message:
      'You are checking back turns and rivers against opponents who fold constantly. One more barrel prints at micros.',
  },
  turnGiveUp: {
    id: 'turnGiveUp',
    label: 'Shutting down on turns',
    message:
      'You check back turns with hands that still want value or protection. The turn is the biggest bet you get to make before the river.',
  },
  turnOverBarrel: {
    id: 'turnOverBarrel',
    label: 'Barreling turns without equity',
    message:
      'You are firing second barrels with no draw against players who called the flop. Pick turns that improve your hand or your story.',
  },
  bloatingOOP: {
    id: 'bloatingOOP',
    label: 'Bloating pots OOP',
    message:
      'You are raising marginal made hands out of position and turning them into bluff-catchers for stacks.',
  },

  // Facing aggression
  riverCallTooWide: {
    id: 'riverCallTooWide',
    label: 'Calling too wide on rivers',
    message:
      'You are paying off big river bets with bluff-catchers. Passive players do not overbet or check-raise as bluffs.',
  },
  riverOverFold: {
    id: 'riverOverFold',
    label: 'Over-folding rivers',
    message:
      'You are folding hands with the odds or the read to call. Small bets and aggressive opponents both demand calls.',
  },
  spewRaise: {
    id: 'spewRaise',
    label: 'Spew-raising rivers',
    message:
      'Raising a bluff-catcher only folds out worse and gets called by better. Turn it into a call or a fold.',
  },
}
