/**
 * Generators for the quick-math drills.
 *
 * Every question is built from random numbers rather than a fixed list, so the
 * drill never runs out and you end up learning the formula instead of the
 * answers. Each generator returns { type, prompt, detail, options, answer,
 * working } where `working` explains the arithmetic after you commit.
 */

import { equityVsRange } from './equity.js'


const DRAW_TYPES = [
  { name: 'flush draw', outs: 9 },
  { name: 'open-ended straight draw', outs: 8 },
  { name: 'gutshot straight draw', outs: 4 },
  { name: 'flush draw + gutshot', outs: 12 },
  { name: 'flush draw + open-ender', outs: 15 },
  { name: 'two overcards', outs: 6 },
  { name: 'set looking to improve', outs: 7 },
  { name: 'pair looking to trip up', outs: 2 },
]

const POT_SIZES = [12, 15, 18, 20, 24, 25, 30, 36, 40, 48, 50, 60, 75, 80, 100]
const BET_FRACTIONS = [
  { label: 'a third of the pot', mult: 1 / 3 },
  { label: 'half pot', mult: 0.5 },
  { label: 'two thirds pot', mult: 2 / 3 },
  { label: 'three quarters pot', mult: 0.75 },
  { label: 'pot', mult: 1 },
  { label: '1.5x pot', mult: 1.5 },
]

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function round(n, dp = 0) {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

/**
 * Builds four plausible options around the true answer, shuffled.
 *
 * `max` matters: percentage answers cap at 100, but an implied-odds answer is
 * measured in big blinds and can legitimately run past a full stack. Clamping
 * those to 100 used to reject every distractor and leave a single option.
 */
function optionsAround(correct, spread, formatter, max = 100) {
  const set = new Set([correct])
  let guard = 0
  while (set.size < 4 && guard < 200) {
    guard += 1
    const delta = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * spread))
    const candidate = correct + delta
    if (candidate > 0 && candidate < max) set.add(candidate)
  }
  return [...set]
    .sort(() => Math.random() - 0.5)
    .map((value) => ({ value, label: formatter(value) }))
}

/** Pot odds: what share of the final pot does the call cost? */
function potOddsQuestion() {
  const pot = pick(POT_SIZES)
  const sizing = pick(BET_FRACTIONS)
  const bet = round(pot * sizing.mult)
  const equity = Math.round((bet / (pot + bet + bet)) * 100)

  return {
    type: 'Pot odds',
    prompt: `Villain bets ${bet}bb into a ${pot}bb pot.`,
    detail: 'What equity do you need for a break-even call?',
    options: optionsAround(equity, 9, (v) => `${v}%`),
    answer: equity,
    working: `You call ${bet} to win ${pot} + ${bet} + your own ${bet} = ${pot + bet * 2}bb. ${bet} / ${
      pot + bet * 2
    } = ${equity}%. A bet of ${sizing.label} always needs about ${equity}% — memorise the common sizes and you never have to do this at the table.`,
  }
}

/** Rule of 2 and 4: outs to equity. */
function outsQuestion() {
  const draw = pick(DRAW_TYPES)
  const street = Math.random() < 0.5 ? 'flop' : 'turn'
  const multiplier = street === 'flop' ? 4 : 2
  const equity = draw.outs * multiplier

  return {
    type: 'Rule of 2 and 4',
    prompt: `You have a ${draw.name} (${draw.outs} outs) on the ${street}.`,
    detail:
      street === 'flop'
        ? 'Roughly what is your equity with two cards to come?'
        : 'Roughly what is your equity with one card to come?',
    options: optionsAround(equity, 8, (v) => `${v}%`),
    answer: equity,
    working: `Rule of 2 and 4: multiply outs by 4 on the flop (two cards to come) and by 2 on the turn. ${
      draw.outs
    } × ${multiplier} = ${equity}%. It slightly overstates big draws on the flop — trim a few points when you have 13+ outs.`,
  }
}

/** Break-even bluff frequency: how often does a bluff need to work? */
function bluffQuestion() {
  const pot = pick(POT_SIZES)
  const sizing = pick(BET_FRACTIONS)
  const bet = round(pot * sizing.mult)
  const breakEven = Math.round((bet / (pot + bet)) * 100)

  return {
    type: 'Bluff break-even',
    prompt: `You bluff ${bet}bb into a ${pot}bb pot.`,
    detail: 'How often does the bluff need to work to break even?',
    options: optionsAround(breakEven, 9, (v) => `${v}%`),
    answer: breakEven,
    working: `Risk ${bet} to win ${pot}: ${bet} / (${pot} + ${bet}) = ${breakEven}%. Against a micro-stakes player who folds far more than that, bluff — against one who folds less, do not. This is the whole calculation behind "never bluff a station".`,
  }
}

/** Implied odds: how much more do you need to win to justify a call? */
function impliedOddsQuestion() {
  const pot = pick([20, 24, 30, 36, 40, 50, 60])
  const bet = round(pot * pick([0.4, 0.5, 0.66, 0.75]))
  const outs = pick([4, 8, 9])
  const equity = outs * 2
  const totalNeeded = (bet * (100 - equity)) / equity
  const needed = Math.max(1, Math.round(totalNeeded - (pot + bet)))

  // Above a stack the answer is really "you cannot get there — fold".
  const unrealistic = needed > 100

  return {
    type: 'Implied odds',
    prompt: `Facing ${bet}bb into ${pot}bb on the turn with ${outs} outs (~${equity}% equity).`,
    detail: 'Roughly how much extra do you need to win on the river to justify the call?',
    options: optionsAround(needed, Math.max(4, Math.round(needed / 3)), (v) => `${v}bb`, 400),
    answer: needed,
    working:
      `At ${equity}% you need ${Math.round(totalNeeded)}bb of total return to break even on a ` +
      `${bet}bb call; the pot already offers ${pot + bet}bb, so you need roughly ${needed}bb more ` +
      `from the river. ` +
      (unrealistic
        ? 'That is more than a 100bb stack, which is the real answer here: the call cannot be made profitable, so fold.'
        : 'Implied odds only count against opponents who actually pay you off — never assume them against a nit.'),
  }
}

/**
 * Equity estimation against a real hand, computed by Monte Carlo rather than a
 * lookup table — so the answer is the true equity of the exact spot shown.
 */
function equityQuestion() {
  const spots = [
    { hero: ['As', 'Ks'], villain: ['Qd', 'Qc'], label: 'AKs vs QQ', board: [] },
    { hero: ['As', 'Ad'], villain: ['Kd', 'Kc'], label: 'AA vs KK', board: [] },
    { hero: ['Js', 'Ts'], villain: ['Ad', 'Kc'], label: 'JTs vs AKo', board: [] },
    { hero: ['7c', '7d'], villain: ['Ah', 'Kd'], label: '77 vs AKo', board: [] },
    { hero: ['Ah', '5h'], villain: ['Kd', 'Kc'], label: 'A5s vs KK', board: [] },
    {
      hero: ['As', '4s'],
      villain: ['Kh', 'Qd'],
      label: 'nut flush draw vs top pair',
      board: ['Ks', '9s', '2d'],
    },
    {
      hero: ['9h', '8h'],
      villain: ['Ac', 'Kd'],
      label: 'open-ender vs two overcards',
      board: ['7c', '6d', '2s'],
    },
    {
      hero: ['Qd', 'Qs'],
      villain: ['Ah', 'Kh'],
      label: 'overpair vs two overs and a flush draw',
      board: ['Jh', '7h', '3c'],
    },
  ]
  const spot = pick(spots)
  const { equity } = equityVsRange(spot.hero, spot.board, [spot.villain], 2500)
  const answer = Math.round(equity * 100)
  const street = spot.board.length === 0 ? 'preflop, all in' : 'on the flop, all in'

  return {
    type: 'Equity',
    prompt: `${spot.hero.join(' ')} against ${spot.villain.join(' ')}${
      spot.board.length ? ` on ${spot.board.join(' ')}` : ''
    }.`,
    detail: `Roughly what is your equity ${street}?`,
    options: optionsAround(answer, 9, (v) => `${v}%`),
    answer,
    working: `${spot.label} runs at about ${answer}%. Knowing the common all-in matchups by heart means you never have to guess whether a stack-off is close — coin flips, dominated aces, and draws against made hands all cluster around numbers worth memorising.`,
  }
}

const GENERATORS = [potOddsQuestion, outsQuestion, bluffQuestion, impliedOddsQuestion, equityQuestion]

export const DRILL_TYPES = [
  { id: 'all', label: 'Mixed' },
  { id: 'potOdds', label: 'Pot odds', generator: potOddsQuestion },
  { id: 'outs', label: 'Outs → equity', generator: outsQuestion },
  { id: 'bluff', label: 'Bluff math', generator: bluffQuestion },
  { id: 'implied', label: 'Implied odds', generator: impliedOddsQuestion },
  { id: 'equity', label: 'Equity', generator: equityQuestion },
]

export function generateQuestion(typeId = 'all') {
  const type = DRILL_TYPES.find((t) => t.id === typeId)
  const generator = type?.generator ?? pick(GENERATORS)
  return generator()
}
