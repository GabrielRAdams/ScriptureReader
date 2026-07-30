# Live Poker Scenario Trainer

An interactive, single-page React trainer for **low/mid-stakes live cash games**
($1/$2 and $2/$5). Unlike online GTO trainers, every scenario and every grade is
built around live realities: family pots, 4-6x opens, limpers, deep multiway
flops, out-of-position 3-bet pots, and river aggression that is almost never a
bluff.

Fully client-side — no backend, no accounts, no persistence.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run lint
```

## What it does

- **Interactive scenario interface** — four-colour hole cards and board on a felt
  table, with a context header carrying the stakes, hero position, effective
  stack in big blinds, pot, and the full preflop/postflop action story plus a
  read on the opponents.
- **Real-time feedback** — every action is graded *Optimal Exploitative Play*,
  *Acceptable / High Variance*, or *Live Blunder*, with a live-specific
  explanation and a frequency bar showing the recommended mix.
- **24 hardcoded scenarios** across four categories (6 each):

  | Category | Focus |
  | --- | --- |
  | A — Limped Pots | Facing 3+ limpers: isolating vs over-calling |
  | B — Multiway Flops | Sizing down with bluffs, sizing up with value |
  | C — River Heat | Exploitative folding vs hero calling |
  | D — 3-Bet Pots OOP | Playing 3-bet pots out of position |

- **Session analytics** — hands played, accuracy, current/best streak, blunder
  count, a per-category breakdown, and named leak warnings ("You are calling too
  wide on rivers") once a mistake pattern repeats.
- **Shuffle or drill** — shuffle the whole library or filter to one category.
  Scenarios cycle without repeating until the set is exhausted.

Keyboard: `1`-`4` to act, `Enter` for the next hand.

## Adding scenarios

Everything lives in `src/data/scenarios.js`. Each entry is a plain object:

```js
{
  id: 'A1',
  category: 'A',                    // key into src/data/categories.js
  heroHand: ['As', 'Kd'],           // rank + suit char (s/h/d/c)
  board: [],                        // [] preflop, else 3-5 cards
  heroPos: 'CO',
  stackBB: 100,
  history: 'UTG limps, MP limps, HJ limps. Folded to Hero in the CO…',
  actions: [{ id, label, detail, rating, freq, feedback, leak? }],
  bestAction: 'raise-large',        // id of the 'optimal' action
  explanation: '…',
}
```

Rules the UI relies on: exactly one action rated `optimal`, `bestAction`
matching its id, `freq` values summing to 100, and any `leak` referencing a key
in `src/data/categories.js`. Action ids come from a fixed vocabulary
(`fold`, `check`, `call`, `bet-small`/`raise-small`, `bet-large`/`raise-large`,
`shove`) so `src/lib/actions.js` can order the buttons naturally — scenarios are
authored best-first, and the display sort keeps the correct answer from always
landing in the same slot.

## Stack

React 19 + Vite, Tailwind CSS, Shadcn UI primitives (Radix + CVA), Lucide icons.
State is a single `useReducer` in `src/hooks/useTrainer.js`.

## Caveat

Ratings are exploitative recommendations for live pools, not solver output.
Against a tough or unusual table, adjust.
