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

## The four tools

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

### 2. Ranges — preflop charts and quiz

Six 13×13 charts: RFI for UTG / HJ / CO / BTN / SB, plus BB defense vs a button
open (3-bet / call / fold). Quiz mode deals a random hand and asks for the
action, tracking accuracy per chart.

The charts are a shade tighter than a solver's, especially in early position —
rake at NL2-NL25 turns the marginal bottom of an opening range into a loser.

### 3. Math — the four calculations that matter

Randomly generated so it never runs out: pot odds, the rule of 2 and 4, bluff
break-even frequency, and implied odds. Each answer shows the arithmetic and
ties it back to a real decision ("this is the whole calculation behind *never
bluff a station*").

### 4. Progress — what to work on

Accuracy per format and category, best streak, range and math quiz numbers, and
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
