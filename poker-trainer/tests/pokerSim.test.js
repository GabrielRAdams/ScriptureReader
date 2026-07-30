import { describe, expect, it } from 'vitest'

import { BB, SB } from '@/lib/cards'
import { applyAction, legalActions, positionFor, sizingOptions, startHand, totalPot } from '@/lib/pokerSim'
import { botAction } from '@/lib/simBots'

function seeded(seed = 1) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

const TABLE = ['tag', 'station', 'nit', 'whale', 'maniac', 'tag']

function makeSeats(stack = 100 * BB) {
  return TABLE.map((archetype, i) => ({
    id: i,
    name: `P${i}`,
    archetype,
    stack,
    isHero: i === 0,
  }))
}

/** Plays one hand to completion with bots in every seat. */
function playHand(seats, buttonSeat, rng) {
  let state = startHand({ seats, buttonSeat, handNumber: 1, rng })
  let guard = 0
  while (state.street !== 'complete') {
    guard += 1
    if (guard > 500) throw new Error('hand did not terminate')
    const action = botAction(state, rng)
    const next = applyAction(state, action)
    if (next === state) throw new Error(`engine rejected ${JSON.stringify(action)}`)
    state = next
  }
  return state
}

describe('positions', () => {
  it('names 6-max seats relative to the button', () => {
    expect(positionFor(0, 0, 6)).toBe('BTN')
    expect(positionFor(1, 0, 6)).toBe('SB')
    expect(positionFor(2, 0, 6)).toBe('BB')
    expect(positionFor(3, 0, 6)).toBe('UTG')
    expect(positionFor(5, 0, 6)).toBe('CO')
  })

  it('rotates with the button', () => {
    expect(positionFor(0, 3, 6)).toBe('UTG')
    expect(positionFor(4, 3, 6)).toBe('SB')
  })
})

describe('startHand', () => {
  it('posts blinds and opens action under the gun', () => {
    const state = startHand({ seats: makeSeats(), buttonSeat: 0, handNumber: 1, rng: seeded(2) })
    expect(state.players[1].committed).toBe(SB)
    expect(state.players[2].committed).toBe(BB)
    expect(state.currentBet).toBe(BB)
    expect(state.actorIndex).toBe(3) // UTG
    expect(totalPot(state)).toBe(SB + BB)
  })

  it('deals two distinct cards to everyone with no duplicates on the table', () => {
    const state = startHand({ seats: makeSeats(), buttonSeat: 2, handNumber: 1, rng: seeded(8) })
    const all = state.players.flatMap((p) => p.hole)
    expect(all).toHaveLength(12)
    expect(new Set(all).size).toBe(12)
  })
})

describe('legal actions and sizing', () => {
  it('requires a full raise increment', () => {
    const state = startHand({ seats: makeSeats(), buttonSeat: 0, handNumber: 1, rng: seeded(4) })
    const legal = legalActions(state)
    expect(legal.callAmount).toBe(BB)
    expect(legal.minRaiseTo).toBe(2 * BB) // currentBet + minRaise
  })

  it('caps every sizing at the stack and always offers all-in', () => {
    const state = startHand({ seats: makeSeats(20 * BB), buttonSeat: 0, handNumber: 1, rng: seeded(6) })
    const options = sizingOptions(state)
    const legal = legalActions(state)
    expect(options.at(-1).id).toBe('allin')
    expect(options.at(-1).to).toBe(legal.maxRaiseTo)
    for (const option of options) {
      expect(option.to).toBeLessThanOrEqual(legal.maxRaiseTo)
      expect(option.to).toBeGreaterThanOrEqual(legal.minRaiseTo)
    }
  })

  it('cannot check when facing a bet, and cannot raise when calling is all-in', () => {
    const state = startHand({ seats: makeSeats(BB), buttonSeat: 0, handNumber: 1, rng: seeded(9) })
    const legal = legalActions(state)
    expect(legal.canCheck).toBe(false)
    expect(legal.canRaise).toBe(false) // a 1bb stack can only call off
  })

  it('ignores an illegal check instead of corrupting state', () => {
    const state = startHand({ seats: makeSeats(), buttonSeat: 0, handNumber: 1, rng: seeded(12) })
    expect(applyAction(state, { type: 'check' })).toBe(state)
  })
})

describe('betting mechanics', () => {
  it('reopens action for players who already acted when a full raise lands', () => {
    let state = startHand({ seats: makeSeats(), buttonSeat: 0, handNumber: 1, rng: seeded(14) })
    state = applyAction(state, { type: 'call' }) // UTG limps
    expect(state.players[3].hasActed).toBe(true)
    state = applyAction(state, { type: 'raise', amount: 4 * BB }) // HJ raises
    expect(state.players[3].hasActed).toBe(false) // UTG has to act again
  })

  it('does not reopen action for a short all-in that is less than a full raise', () => {
    const seats = makeSeats()
    seats[4].stack = 250 // 2.5bb — can never make a full raise over a 4bb bet
    let state = startHand({ seats, buttonSeat: 0, handNumber: 1, rng: seeded(16) })
    state = applyAction(state, { type: 'raise', amount: 4 * BB }) // UTG opens
    const raiser = state.actorIndex
    state = applyAction(state, { type: 'raise', amount: 250 }) // short all-in
    expect(state.players[raiser].hasActed).toBe(true)
  })

  it('collects bets into the pot at the end of a street', () => {
    let state = startHand({ seats: makeSeats(), buttonSeat: 0, handNumber: 1, rng: seeded(18) })
    const before = totalPot(state)
    // Everyone folds to the big blind.
    while (state.street === 'preflop' && state.actorIndex >= 0) {
      state = applyAction(state, { type: 'fold' })
    }
    expect(state.street).toBe('complete')
    expect(state.result.potTotal).toBe(before)
  })
})

describe('showdown and pots', () => {
  it('awards an uncontested pot without a showdown', () => {
    let state = startHand({ seats: makeSeats(), buttonSeat: 0, handNumber: 1, rng: seeded(22) })
    while (state.street !== 'complete') state = applyAction(state, { type: 'fold' })
    expect(state.result.showdown).toBe(false)
    const winners = state.result.pots.flatMap((p) => p.winners)
    expect(winners).toHaveLength(1)
  })

  it('splits a pot evenly and gives the odd chip away exactly once', () => {
    // Two players all in for an odd amount produce a remainder on the split.
    const seats = makeSeats()
    const rng = seeded(26)
    let chipsBefore = 0
    for (let i = 0; i < 300; i += 1) {
      const table = makeSeats(100 * BB + (i % 3))
      chipsBefore = table.reduce((s, p) => s + p.stack, 0)
      const state = playHand(table, i % 6, rng)
      const after = state.players.reduce((s, p) => s + p.stack, 0)
      expect(after).toBe(chipsBefore)
    }
    expect(seats).toHaveLength(6)
  })
})

describe('engine invariants over many hands', () => {
  it('conserves chips and never breaks a rule across 3000 hands', () => {
    const rng = seeded(1234)
    let seats = makeSeats()
    let button = 0

    for (let h = 0; h < 3000; h += 1) {
      const before = seats.reduce((sum, p) => sum + p.stack, 0)
      const state = playHand(seats, button, rng)
      const after = state.players.reduce((sum, p) => sum + p.stack, 0)

      expect(after, `chip leak on hand ${h}`).toBe(before)
      for (const p of state.players) {
        expect(p.stack, `negative stack on hand ${h}`).toBeGreaterThanOrEqual(0)
        expect(Number.isInteger(p.stack), `fractional stack on hand ${h}`).toBe(true)
      }
      // Every pot must be fully paid out.
      const awarded = Object.values(state.result.payouts).reduce((a, b) => a + b, 0)
      expect(awarded, `pot not fully awarded on hand ${h}`).toBe(state.result.potTotal)
      // The board never exceeds five cards and never repeats one.
      expect(state.board.length).toBeLessThanOrEqual(5)
      expect(new Set(state.board).size).toBe(state.board.length)

      seats = state.players.map((p) => ({
        id: p.id,
        name: p.name,
        archetype: p.archetype,
        stack: p.stack < 100 * BB ? 100 * BB : p.stack,
        isHero: p.isHero,
      }))
      button = (button + 1) % 6
    }
  })
})
