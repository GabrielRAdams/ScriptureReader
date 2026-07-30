/**
 * Preflop charts for 6-max online micro stakes.
 *
 * These are deliberately a shade tighter than a solver's, especially in early
 * position: rake at NL2-NL25 is charged on every pot you win and it turns the
 * marginal bottom of an opening range into a loser. They are starting points to
 * memorise, not laws — widen on the button when the blinds over-fold, tighten
 * when there is a maniac behind you.
 */

export const RANGE_ACTIONS = {
  raise: {
    id: 'raise',
    label: 'Raise',
    swatch: 'bg-emerald-500',
    text: 'text-emerald-950',
    chip: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200',
  },
  '3bet': {
    id: '3bet',
    label: '3-Bet',
    swatch: 'bg-violet-500',
    text: 'text-violet-950',
    chip: 'border-violet-500/50 bg-violet-500/20 text-violet-200',
  },
  call: {
    id: 'call',
    label: 'Call',
    swatch: 'bg-sky-500',
    text: 'text-sky-950',
    chip: 'border-sky-500/50 bg-sky-500/20 text-sky-200',
  },
  fold: {
    id: 'fold',
    label: 'Fold',
    swatch: 'bg-slate-700',
    text: 'text-slate-400',
    chip: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
  },
}

export const CHARTS = [
  {
    id: 'rfi-utg',
    group: 'Opening (RFI)',
    label: 'UTG',
    context: '6-max · first in · open to 2.5bb',
    actions: {
      raise: '66+, A9s+, A5s-A2s, KTs+, QTs+, JTs, T9s, AJo+, KQo',
    },
    note: 'Five players behind you, so this is the tightest range you will open. The small suited aces are here for their blocker and flush value, not their pair value.',
  },
  {
    id: 'rfi-hj',
    group: 'Opening (RFI)',
    label: 'HJ',
    context: '6-max · first in · open to 2.5bb',
    actions: {
      raise: '55+, A7s+, A5s-A2s, K9s+, Q9s+, J9s+, T9s, 98s, ATo+, KJo+',
    },
    note: 'One fewer player to get through. Suited broadways and the better suited aces come in first — offsuit hands widen much more slowly.',
  },
  {
    id: 'rfi-co',
    group: 'Opening (RFI)',
    label: 'CO',
    context: '6-max · first in · open to 2.5bb',
    actions: {
      raise: '33+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, A9o+, KTo+, QTo+, JTo',
    },
    note: 'The cutoff is where stealing starts to pay. Suited connectors and gappers become opens because you can win the pot preflop or play in position.',
  },
  {
    id: 'rfi-btn',
    group: 'Opening (RFI)',
    label: 'BTN',
    context: '6-max · first in · open to 2.5bb',
    actions: {
      raise:
        '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 86s+, 75s+, 65s, 54s, A2o+, K7o+, Q9o+, J9o+, T9o, 98o',
    },
    note: 'Roughly 45% of hands. Most of your winrate comes from this seat — if you are opening much less than this on the button, you are leaving money on the table every orbit.',
  },
  {
    id: 'rfi-sb',
    group: 'Opening (RFI)',
    label: 'SB',
    context: '6-max · first in · open to 3bb',
    actions: {
      raise: '22+, A2s+, K5s+, Q7s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, A2o+, K9o+, Q9o+, JTo, T9o',
    },
    note: 'Raise or fold — never limp. You will be out of position for the rest of the hand, so open a size big enough (3bb) that the big blind cannot profitably defend with junk.',
  },
  {
    id: 'bb-vs-btn',
    group: 'Defending',
    label: 'BB vs BTN',
    context: 'Facing a 2.5bb button open · 3-bet to 10bb',
    actions: {
      '3bet': '99+, ATs+, KJs+, A5s-A4s, AQo+',
      call:
        '22-88, A2s-A9s, K2s+, Q4s+, J6s+, T6s+, 95s+, 84s+, 74s+, 63s+, 53s+, 43s, A2o-AJo, K7o+, Q8o+, J8o+, T8o+, 97o+, 87o, 76o',
    },
    note: 'You are getting 3.7:1, so you only need about 21% equity to continue — defend far wider than feels comfortable. Micro players fold the big blind far too often, which is exactly why button steals print.',
  },
  {
    id: '3bet-btn-vs-co',
    group: 'Attacking',
    label: 'BTN 3-bet',
    context: 'BTN facing a 2.5bb CO open · 3-bet to 8bb',
    actions: {
      '3bet': 'TT+, AJs+, KQs, A5s-A4s, AQo+',
      call: '22-99, A2s-ATs, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, AJo, KQo',
    },
    note: 'Value 3-bets plus a handful of suited-wheel-ace bluffs that block his premium aces and still flop well. Against a nit who folds to 3-bets constantly, widen the bluff half; against a station who never folds, drop the bluffs entirely and 3-bet value only.',
  },
  {
    id: 'vs-3bet-co',
    group: 'Defending',
    label: 'CO vs 3-bet',
    context: 'You opened the CO to 2.5bb and face a 3-bet to 8.5bb · 100bb',
    actions: {
      '3bet': 'QQ+, AKs, AKo',
      call: '22-JJ, ATs+, KTs+, QTs+, JTs, T9s, 98s, AQo',
    },
    note: 'The "3-bet" colour here means 4-bet. Micro 3-betting ranges are value-heavy, so 4-bet only what wants stacks in and fold the dominated offsuit broadways — AJo and KQo are the classic money-losers in this spot.',
  },
  {
    id: 'sb-vs-bb',
    group: 'Blind battles',
    label: 'BB vs SB',
    context: 'SB opens to 3bb, you are in the BB · 3-bet to 11bb',
    actions: {
      '3bet': '77+, A8s+, KTs+, QTs+, JTs, A5s-A2s, ATo+, KQo',
      call: '22-66, A2s-A7s, K4s+, Q6s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 54s, A2o-A9o, K8o+, Q9o+, J9o+, T9o, 98o',
    },
    note: 'Heads up against a single opponent with position on you for the rest of the hand. Defend very wide on price, but 3-bet aggressively — the small blind is opening far too many hands and folds to 3-bets more than anyone at the table.',
  },
]

export const CHART_GROUPS = [...new Set(CHARTS.map((c) => c.group))]
