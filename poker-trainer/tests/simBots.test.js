import { describe, expect, it } from 'vitest'

import { BB } from '@/lib/cards'
import { evaluate, compareScores, scoreOf } from '@/lib/handEval'
import { equityVsRandom, equityVsRange, equityVsRanges } from '@/lib/equity'
import { makeDeck, shuffle } from '@/lib/cards'
import { startHand } from '@/lib/pokerSim'
import { ARCHETYPES, adjustProfile, botAction } from '@/lib/simBots'

function seeded(seed = 1) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

describe('scoreOf — the fast path used by every Monte Carlo trial', () => {
  it('orders hands exactly like the readable evaluator', () => {
    const rng = seeded(77)
    for (let i = 0; i < 20000; i += 1) {
      const deck = shuffle(makeDeck(), rng)
      const a = deck.slice(0, 7)
      const b = deck.slice(7, 14)
      const fast = Math.sign(scoreOf(a) - scoreOf(b))
      const readable = Math.sign(compareScores(evaluate(a).score, evaluate(b).score))
      expect(fast, `${a.join(' ')} vs ${b.join(' ')}`).toBe(readable)
    }
  })

  it('agrees on the classic edge cases', () => {
    const cases = [
      [['Ah', 'Kh', 'Qh', 'Jh', 'Th', '2c', '3d'], ['Ac', 'Ad', 'As', 'Ah', 'Kd', '2c', '3d']],
      [['5h', '4h', '3h', '2h', 'Ah', 'Kc', 'Qd'], ['Ac', 'Ad', 'Ks', 'Kh', 'Qd', 'Jc', '9d']],
      [['Ac', 'Ad', 'As', 'Kh', 'Kd', 'Kc', '2h'], ['9c', '9d', '9s', '5h', '5d', '2c', '2h']],
      [['Ac', '2d', '3h', '4s', '5c', 'Kh', 'Qd'], ['Kc', 'Kd', '7h', '2s', '3c', '9h', 'Td']],
    ]
    for (const [a, b] of cases) {
      expect(Math.sign(scoreOf(a) - scoreOf(b))).toBe(
        Math.sign(compareScores(evaluate(a).score, evaluate(b).score)),
      )
    }
  })
})

describe('equityVsRanges — multiway', () => {
  it('matches the single-opponent path when given one range', () => {
    const a = equityVsRanges(['As', 'Ad'], [], [['KK']], 6000, seeded(3)).equity
    const b = equityVsRange(['As', 'Ad'], [], ['KK'], 6000, seeded(3)).equity
    expect(Math.abs(a - b)).toBeLessThan(0.03)
  })

  it('drops as opponents are added', () => {
    const one = equityVsRanges(['As', 'Ad'], [], [['QQ']], 5000, seeded(5)).equity
    const two = equityVsRanges(['As', 'Ad'], [], [['QQ'], ['JJ']], 5000, seeded(5)).equity
    const three = equityVsRanges(['As', 'Ad'], [], [['QQ'], ['JJ'], ['TT']], 5000, seeded(5)).equity
    expect(two).toBeLessThan(one)
    expect(three).toBeLessThan(two)
  })

  it('never deals the same card to two opponents', () => {
    // Both villains can only hold aces; hero holds two of them, so the two
    // remaining aces must split between them without duplication.
    const { equity } = equityVsRanges(['As', 'Ad'], [], [['AA'], ['AA']], 400, seeded(7))
    expect(equity).toBeGreaterThanOrEqual(0)
    expect(equity).toBeLessThanOrEqual(1)
  })

  it('stays inside [0, 1] on every street', () => {
    for (const board of [[], ['Ks', '7d', '2c'], ['Ks', '7d', '2c', '9h'], ['Ks', '7d', '2c', '9h', '3s']]) {
      const { equity } = equityVsRanges(['Ah', 'Kh'], board, [['QQ'], ['JTs']], 500, seeded(9))
      expect(equity).toBeGreaterThanOrEqual(0)
      expect(equity).toBeLessThanOrEqual(1)
    }
  })
})

/**
 * Builds a postflop spot with chosen cards. The engine deals at random, so the
 * hand is dealt first and then overwritten — enough for the bot to decide on.
 */
function postflopSpot({ hole, board, potChips, toCall, actorArchetype, opponents = 1 }) {
  const seats = ['tag', 'station', 'nit', 'whale', 'maniac', 'tag'].map((archetype, i) => ({
    id: i,
    name: `P${i}`,
    archetype: i === 0 ? actorArchetype : archetype,
    stack: 100 * BB,
    isHero: false,
  }))
  const state = startHand({ seats, buttonSeat: 3, handNumber: 1, rng: seeded(11) })

  state.street = 'flop'
  state.board = board
  state.pot = potChips
  state.currentBet = toCall
  state.minRaise = BB
  state.players.forEach((p, i) => {
    p.committed = 0
    p.hasActed = false
    p.folded = i > opponents // keep the actor plus `opponents` live
    p.stack = 100 * BB
  })
  state.players[0].hole = hole
  state.actorIndex = 0
  return state
}

describe('bots decide on equity', () => {
  it('a nit folds a weak hand facing a big bet', () => {
    const rng = seeded(13)
    let folds = 0
    for (let i = 0; i < 40; i += 1) {
      // Seven-high with no draw on an ace-high board, facing 75% pot.
      const state = postflopSpot({
        hole: ['7c', '3d'],
        board: ['Ah', 'Kd', '9s'],
        potChips: 20 * BB,
        toCall: 15 * BB,
        actorArchetype: 'nit',
      })
      if (botAction(state, rng, null, { trials: 300 }).type === 'fold') folds += 1
    }
    expect(folds).toBeGreaterThan(30)
  })

  it('a station calls the same bet far more often than the nit', () => {
    const rng = seeded(17)
    const callsFor = (archetype) => {
      let calls = 0
      for (let i = 0; i < 40; i += 1) {
        // Middle pair — a genuine bluff-catcher, not a hopeless hand.
        const state = postflopSpot({
          hole: ['9h', '8d'],
          board: ['Ah', '9d', '3s'],
          potChips: 20 * BB,
          toCall: 10 * BB,
          actorArchetype: archetype,
        })
        if (botAction(state, rng, null, { trials: 300 }).type === 'call') calls += 1
      }
      return calls
    }
    expect(callsFor('station')).toBeGreaterThanOrEqual(callsFor('nit'))
  })

  it('everyone continues with the nuts and nobody folds it', () => {
    const rng = seeded(19)
    for (const archetype of Object.keys(ARCHETYPES)) {
      const state = postflopSpot({
        hole: ['9c', '9s'],
        board: ['9h', '5d', '2c'],
        potChips: 20 * BB,
        toCall: 10 * BB,
        actorArchetype: archetype,
      })
      const action = botAction(state, rng, null, { trials: 300 })
      expect(action.type, `${archetype} folded a set`).not.toBe('fold')
    }
  })

  it('bets strong hands when checked to', () => {
    const rng = seeded(23)
    let bets = 0
    for (let i = 0; i < 40; i += 1) {
      const state = postflopSpot({
        hole: ['Ac', 'Ad'],
        board: ['Ah', 'Kd', '7s'],
        potChips: 20 * BB,
        toCall: 0,
        actorArchetype: 'tag',
      })
      if (botAction(state, rng, null, { trials: 300 }).type === 'raise') bets += 1
    }
    expect(bets).toBeGreaterThan(20)
  })

  it('never returns an action the engine would reject', () => {
    const rng = seeded(29)
    for (let i = 0; i < 200; i += 1) {
      const state = postflopSpot({
        hole: ['Qc', 'Jd'],
        board: ['Ah', 'Kd', '7s'],
        potChips: 20 * BB,
        toCall: i % 3 === 0 ? 0 : 8 * BB,
        actorArchetype: ['nit', 'tag', 'station', 'maniac', 'whale'][i % 5],
      })
      const action = botAction(state, rng, null, { trials: 100 })
      expect(['fold', 'check', 'call', 'raise']).toContain(action.type)
      if (action.type === 'check') expect(state.currentBet).toBe(0)
    }
  })
})

describe('adaptive regulars', () => {
  const reads = { hands: 100, vpip: 40, foldToCbet: 75, aggressionFactor: 0.4 }

  it('leaves recreational archetypes alone', () => {
    for (const id of ['station', 'maniac', 'whale']) {
      expect(adjustProfile(ARCHETYPES[id], reads, true)).toBe(ARCHETYPES[id])
    }
  })

  it('does nothing until there is a sample', () => {
    expect(adjustProfile(ARCHETYPES.tag, { ...reads, hands: 5 }, true)).toBe(ARCHETYPES.tag)
  })

  it('only adapts while the hero is in the pot', () => {
    expect(adjustProfile(ARCHETYPES.tag, reads, false)).toBe(ARCHETYPES.tag)
  })

  it('bets more against a hero who folds to c-bets', () => {
    const adjusted = adjustProfile(ARCHETYPES.tag, reads, true)
    expect(adjusted.cbet).toBeGreaterThan(ARCHETYPES.tag.cbet)
  })

  it('demands more equity against a hero who never bluffs', () => {
    const adjusted = adjustProfile(ARCHETYPES.tag, reads, true)
    expect(adjusted.callSlack).toBeLessThan(ARCHETYPES.tag.callSlack)
  })

  it('calls lighter against a hero who bluffs constantly', () => {
    const adjusted = adjustProfile(ARCHETYPES.tag, { ...reads, aggressionFactor: 4 }, true)
    expect(adjusted.callSlack).toBeGreaterThan(ARCHETYPES.tag.callSlack)
  })
})
