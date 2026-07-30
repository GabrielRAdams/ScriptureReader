# Poker Scenario Trainer

A single-page React study tool built around one goal: **becoming a profitable
online micro-stakes player**. It grades decisions the way the pool actually
plays, not the way a solver does — and it tracks which mistakes you keep
repeating.

Two formats, because they are genuinely different games:

| Format | Covers | Assumptions |
| --- | --- | --- |
| **Online Micros** (default) | NL2 – NL25, 6-max | 2.2-3x opens, regs and stations, squeezes, rake-aware preflop |
| **Live Cash** | $1/$2 and $2/$5 | 4-6x opens, limpers, family pots, live river aggression |

Fully client-side. Progress persists in `localStorage`; there is no backend and
no account.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run lint
```

Add it to your phone's home screen — it ships a web manifest and is built
mobile-first for one-handed use.

## The five tools

### 1. Drill — 45 hand scenarios

Four-colour cards on a felt table, a context header (stakes, position,
effective stack, pot, full action history, and a read on the opponent), and
touch-sized action buttons. Every action is graded **Optimal Exploitative
Play** / **Acceptable–High Variance** / **Live Blunder**, with a specific
explanation and a recommended-frequency bar.

**Online micros (21 hands)**

| Category | Focus |
| --- | --- |
| E — Preflop | Open sizing, big-blind defense, facing 3-bets, squeezing, and why cold-calling loses to rake |
| F — C-Betting | Small range bets on dry boards, checking back the textures that hit them, sizing up vs stations |
| G — Barreling | Delayed c-bets, turn probes, barreling with equity — and never bluffing a station |
| H — Bluff-Catching | River raises are value, small bets demand calls, floating donk bets, calling down maniacs |

**Live cash (24 hands)**

| Category | Focus |
| --- | --- |
| A — Limped Pots | Facing 3+ limpers: isolating vs over-calling |
| B — Multiway Flops | Sizing down with bluffs, sizing up with value |
| C — River Heat | Exploitative folding vs hero calling |
| D — 3-Bet Pots OOP | Playing 3-bet pots out of position |

Categories deliberately mix folds and calls so the drill can't be beaten by
pattern-matching, and buttons render in natural poker order rather than
source order so the correct answer never lands in the same slot twice.

### 2. Play — 6-max cash game sim

A full No-Limit Hold'em table you can actually sit at: 100bb stacks, rotating
button, side pots, and five bot opponents drawn from the same archetypes the
drills describe — a TAG reg, a nit, a station, a whale, and a maniac, each
labelled with the VPIP/PFR they actually play.

Your own stats run across the top like a tracker: hands, net bb, bb/100,
VPIP/PFR, and WTSD. A preflop coach (toggleable) flags any open that disagrees
with the RFI chart for your seat, so the Ranges tab and the table stay in sync.

The bots are rule-based caricatures, not solvers. Beating them is practice at
exploiting a soft pool, not proof of a winning strategy.

Keyboard: `F` fold, `C` check/call, `Enter` next hand.

### 3. Ranges — preflop charts and quiz

Six 13×13 charts: RFI for UTG / HJ / CO / BTN / SB, plus BB defense vs a button
open (3-bet / call / fold). Quiz mode deals a random hand and asks for the
action, tracking accuracy per chart.

The charts are a shade tighter than a solver's, especially in early position —
rake at NL2-NL25 turns the marginal bottom of an opening range into a loser.

### 4. Math — the four calculations that matter

Randomly generated so it never runs out: pot odds, the rule of 2 and 4, bluff
break-even frequency, and implied odds. Each answer shows the arithmetic and
ties it back to a real decision ("this is the whole calculation behind *never
bluff a station*").

### 5. Progress — what to work on

Accuracy per format and category, best streak, range/math/sim numbers, and
a **leak list**: named, repeated mistakes ("Calling too wide on rivers",
"Bluffing calling stations") with the fix. Hands you blunder are floated to the
front of the next cycle, and there is a one-tap **Replay missed hands** drill.

## Adding scenarios

`src/data/scenarios/online.js` and `src/data/scenarios/live.js`. Each entry:

```js
{
  id: 'E1',
  category: 'E',                    // key into src/data/categories.js
  heroHand: ['Ad', '9c'],           // rank + suit char (s/h/d/c)
  board: [],                        // [] preflop, else 3-5 cards
  heroPos: 'BTN',
  stackBB: 100,
  pot: '1.5 BB',
  toCall: '1 BB',                   // null when it is checked to Hero
  stakes: 'NL10 6-max',
  street: 'Preflop',
  players: 3,
  villainProfile: 'SB is a 22/18 reg…',
  keyConcept: 'Button opening size and range',
  history: 'Folded to Hero on the BTN…',
  actions: [{ id, label, detail, rating, freq, feedback, leak? }],
  bestAction: 'raise-small',        // id of the 'optimal' action
  explanation: '…',
}
```

Invariants the UI relies on: exactly one action rated `optimal`, `bestAction`
matching its id, that action carrying the highest `freq`, `freq` summing to 100,
`board.length` matching `street`, no duplicate cards, and any `leak` naming a
key in `src/data/categories.js`. Action ids come from a fixed vocabulary
(`fold`, `check`, `call`, `bet-small`/`raise-small`, `bet-large`/`raise-large`,
`shove`) so `src/lib/actions.js` can order the buttons.

`format` is stamped on in `src/data/scenarios/index.js` — a live scenario can
never leak into an online drill.

## Sim internals

- `src/lib/handEval.js` — direct 5-to-7 card evaluation returning a comparable
  score array. Verified against brute-force best-of-21-subsets over 200k random
  hands, with category frequencies matching the known 7-card distribution.
- `src/lib/pokerSim.js` — the betting state machine: blinds, min-raise rules
  (including all-ins that do not reopen action), street progression, side pots
  built from each player's total contribution, and odd-chip distribution to the
  first winner left of the button. Pure and rng-injectable, so it runs headlessly.
- `src/lib/simBots.js` — archetype definitions and decision logic.
- `src/lib/handStrength.js` — Chen-formula preflop ranking, combo-weighted, so
  bots can reason in "top X% of hands".

The engine has been run for 20,000 hands checking that chips are conserved
exactly, no stack goes negative or fractional, every pot is fully awarded, and
no action is ever rejected mid-hand.

## Adding ranges

`src/data/ranges.js`, using standard notation (`22+`, `A2s+`, `KTo+`,
`K9s-K5s`) parsed by `src/lib/range.js`. List the strongest action first —
earlier keys win when ranges overlap.

## Stack

React 19 + Vite, Tailwind CSS, Shadcn UI primitives (Radix + CVA), Lucide icons.
Scenario state is one `useReducer` in `src/hooks/useTrainer.js`; the range and
math quizzes own their own `localStorage` slices via `src/lib/storage.js`.

## Caveat

These are exploitative recommendations for soft pools, not solver output. They
are right against the player types described in each scenario and wrong against
a good regular who is paying attention. Adjust.
