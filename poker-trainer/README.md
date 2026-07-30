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
npm test         # vitest — evaluator, engine, data and bankroll maths
npm run lint
```

Add it to your phone's home screen — it ships a web manifest and is built
mobile-first for one-handed use.

## The five tools

### 1. Drill — 50 hand scenarios

Four-colour cards on a felt table, a context header (stakes, position,
effective stack, pot, full action history, and a read on the opponent), and
touch-sized action buttons. Every action is graded **Optimal Exploitative
Play** / **Acceptable–High Variance** / **Live Blunder**, with a specific
explanation and a recommended-frequency bar.

**Online micros (26 hands)**

| Category | Focus |
| --- | --- |
| E — Preflop | Open sizing, big-blind defense, facing 3-bets, squeezing, and why cold-calling loses to rake |
| F — C-Betting | Small range bets on dry boards, checking back the textures that hit them, sizing up vs stations |
| G — Barreling | Delayed c-bets, turn probes, barreling with equity — and never bluffing a station |
| I — Turn Play | Second barrels for value, barrel cards that fit your story, knowing when to shut down |
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

**The session report** is where practice turns into feedback. It shows your
full stat line against the bands a winning micro reg lives in — 3-bet %, flop
c-bet %, fold-to-c-bet %, BB fold %, WTSD, W$SD — with the sample size behind
each one, and names the leaks it can actually prove ("You fold to 71% of flop
c-bets"). Every rule carries a minimum sample, so a bad hour never gets
diagnosed as a habit.

**The regulars adapt.** After 25 hands the TAG and the nit start using your own
tracked numbers against you: fold to too many c-bets and they bet more, stop
bluffing and they fold more, bluff constantly and they call you down. The fish
never adjust — which is the lesson.

Each hand also reports the flop equity your hand actually held, so losing with
the best of it stops feeling like a mistake.

Postflop, the bots decide on **equity against a modelled range**, not on
hand-strength buckets. Each opponent's range starts from what they did preflop
(raised ≈ top 18%, called ≈ 42%, checked the blind ≈ 60%) and is then **filtered
by the board**: a player who called a bet on K-9-4 is modelled as holding a
king, a nine, a pair or a draw — not "the top 42% of preflop hands", most of
which missed completely. Betting twice narrows it further than calling twice.
A Monte Carlo then answers "how often does my hand beat that?".

Archetype differences become thresholds on that number — how far past correct
pot odds a player will still call, and how much equity they need before betting
for value.

They are still rule-based, not solvers: the range model is coarse and nobody is
computing a strategy. Beating them is practice at exploiting a soft pool, not
proof of a winning strategy.

Keyboard: `F` fold, `C` check/call, `Enter` next hand.

### 3. Ranges — preflop charts and quiz

Nine 13×13 charts: RFI for UTG / HJ / CO / BTN / SB, BB defense vs a button
open, a BTN 3-betting range, a CO facing-a-3-bet range, and blind-vs-blind.
Quiz mode deals a random hand and asks for the action, tracking accuracy per
chart.

The charts are a shade tighter than a solver's, especially in early position —
rake at NL2-NL25 turns the marginal bottom of an opening range into a loser.

### 4. Math — calculations and bankroll

**Drills**, randomly generated so they never run out: pot odds, the rule of 2
and 4, bluff break-even frequency, implied odds, and all-in equity (computed by
Monte Carlo against the exact hands shown, not looked up). Each answer shows
the arithmetic and ties it back to a real decision.

**Bankroll**, because more micro players quit from playing too high than from
any strategic leak. Risk of ruin, the roll needed for 5% and 1% risk, expected
swing over 10k hands, and the odds of being down over a sample despite winning.
At 5bb/100 with 30 buy-ins you go broke 2.5% of the time — and you are down
after 10,000 hands roughly 29% of the time.

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
- `src/lib/simBots.js` — archetype definitions, the equity-based postflop
  decision logic, opponent range modelling, and the read-based adjustments that
  adapting regulars apply.
- `src/lib/rangeFilter.js` — board-aware range narrowing. Classifies a combo
  against a board (set, top pair, pair, flush draw, open-ender, gutshot,
  overcards, air) using rank and suit arithmetic rather than hand evaluation,
  because it runs over several hundred combos inside every decision.
- `src/lib/simStats.js` — hand-log summarisation, derived stats, and the leak
  rules with their minimum samples.
- `src/lib/equity.js` — Monte Carlo equity against random hands, one range, or
  several ranges at once (dealing every villain in the same trial, so card
  removal stays honest instead of raising equity to a power).
- `src/lib/handEval.js` also exports `scoreOf`, a fast path that packs a hand
  into one 32-bit integer. It is 16x quicker than the readable evaluator
  (0.35µs vs 5.6µs), which is what makes an equity call inside every bot
  decision affordable — a 4,000-hand headless run takes under two seconds.
- `src/lib/bankroll.js` — risk of ruin, required bankroll, and variance.
- `src/lib/handStrength.js` — Chen-formula preflop ranking, combo-weighted, so
  bots can reason in "top X% of hands".

Measured over 4,000 headless hands: median pot 12.4bb (a real NL10 table runs
~10-12bb), 58% of hands reach the river, 2.2% reach an all-in, and each
archetype's VPIP/PFR tracks its advertised line.

Every hand is dealt 100bb effective. Real winners cash out and get replaced by
a fresh buy-in, and letting stacks drift to 400bb would quietly turn this into
deep-stack practice — a different game. Profit is tracked separately.

## Tests

`npm test` runs 162 tests covering the parts where a silent bug would teach
something false:

- the evaluator against brute-force best-of-21-subsets, plus the known 7-card
  category distribution and the classic edge cases (wheel straights, two sets,
  three pairs, six flush cards);
- the equity engine against published matchups (AA vs KK ≈ 82%, AKs vs QQ ≈
  46%), symmetry, and card removal;
- `scoreOf` against the readable evaluator on 20,000 random pairs, so the fast
  path can never silently disagree with the one that is easy to read;
- bot behaviour: a nit folds air to a big bet, a station calls a bluff-catcher
  more often than the nit does, nobody folds a set, strong hands get bet, and no
  archetype ever returns an action the engine would reject;
- range modelling: a preflop raiser is given a tighter range than a caller,
  ranges narrow once a villain acts on the board, a bettor is modelled as
  stronger than a caller, and a filtered range is measurably harder to beat than
  the unfiltered one (the whole point of filtering);
- the betting engine over 3,000 hands — chips conserved, pots fully awarded, no
  negative or fractional stacks — plus min-raise rules, short all-ins that do
  not reopen action, blind posting and position naming;
- every scenario's data integrity and every range chart's notation;
- the maths behind the drills and the bankroll formulas.

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
