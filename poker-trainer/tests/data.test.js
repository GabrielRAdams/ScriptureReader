import { describe, expect, it } from 'vitest'

import { CATEGORIES, FORMATS, LEAKS, categoryIdsFor } from '@/data/categories'
import { CHARTS } from '@/data/ranges'
import { SCENARIOS } from '@/data/scenarios'
import { ALL_HANDS, buildChart, parseRange, rangePercent } from '@/lib/range'
import { DRILL_TYPES, generateQuestion } from '@/lib/mathDrills'
import { sortActionsForDisplay } from '@/lib/actions'

const ACTION_VOCABULARY = [
  'fold',
  'check',
  'call',
  'bet-small',
  'raise-small',
  'bet-large',
  'raise-large',
  'shove',
]

describe('scenario library', () => {
  it('has scenarios in every category of both formats', () => {
    for (const format of Object.keys(FORMATS)) {
      for (const id of categoryIdsFor(format)) {
        const count = SCENARIOS.filter((s) => s.category === id).length
        expect(count, `category ${id} is empty`).toBeGreaterThan(0)
      }
    }
  })

  it('has unique ids', () => {
    const ids = SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(SCENARIOS.map((s) => [s.id, s]))('%s is well formed', (_id, scenario) => {
    for (const field of [
      'id', 'category', 'heroHand', 'board', 'heroPos', 'stackBB', 'history',
      'actions', 'bestAction', 'explanation', 'pot', 'stakes', 'street',
      'players', 'villainProfile', 'keyConcept', 'format',
    ]) {
      expect(scenario[field], `missing ${field}`).toBeDefined()
    }
    expect(scenario, 'missing toCall').toHaveProperty('toCall')

    // The scenario's format must match its category's format.
    expect(CATEGORIES[scenario.category].format).toBe(scenario.format)

    // Cards: valid notation, no duplicates between hand and board.
    const cards = [...scenario.heroHand, ...scenario.board]
    expect(new Set(cards).size, `duplicate cards: ${cards}`).toBe(cards.length)
    for (const card of cards) expect(card).toMatch(/^[AKQJT98765432][shdc]$/)
    expect(scenario.heroHand).toHaveLength(2)

    // Board length must match the street being played.
    const expectedBoard = { Preflop: 0, Flop: 3, Turn: 4, River: 5 }[scenario.street]
    expect(scenario.board.length, `${scenario.street} board`).toBe(expectedBoard)

    // Actions.
    expect(scenario.actions.length).toBeGreaterThanOrEqual(3)
    const ids = scenario.actions.map((a) => a.id)
    expect(new Set(ids).size, 'duplicate action ids').toBe(ids.length)
    for (const action of scenario.actions) {
      expect(ACTION_VOCABULARY, `unknown action id ${action.id}`).toContain(action.id)
      expect(['optimal', 'acceptable', 'blunder']).toContain(action.rating)
      expect(action.label).toBeTruthy()
      expect(action.detail).toBeTruthy()
      expect(action.feedback).toBeTruthy()
      if (action.leak) expect(LEAKS[action.leak], `unknown leak ${action.leak}`).toBeDefined()
      // An optimal play is never also a leak.
      if (action.rating === 'optimal') expect(action.leak).toBeUndefined()
    }

    // Exactly one optimal action, and it is bestAction, and it is the most frequent.
    const optimal = scenario.actions.filter((a) => a.rating === 'optimal')
    expect(optimal, 'expected exactly one optimal action').toHaveLength(1)
    expect(optimal[0].id).toBe(scenario.bestAction)
    expect(optimal[0].freq).toBe(Math.max(...scenario.actions.map((a) => a.freq)))

    // Frequencies are a mix that sums to 100.
    expect(scenario.actions.reduce((sum, a) => sum + a.freq, 0)).toBe(100)
  })

  it('does not always put the best action in the same button slot', () => {
    const slots = SCENARIOS.map((s) =>
      sortActionsForDisplay(s.actions).findIndex((a) => a.id === s.bestAction),
    )
    expect(new Set(slots).size, 'best action always lands in one slot').toBeGreaterThan(1)
  })
})

describe('range notation', () => {
  it('expands pairs, plus-notation and spans', () => {
    expect(parseRange('AA')).toEqual(new Set(['AA']))
    expect(parseRange('QQ+')).toEqual(new Set(['QQ', 'KK', 'AA']))
    expect(parseRange('77-99')).toEqual(new Set(['77', '88', '99']))
    expect(parseRange('AJs+')).toEqual(new Set(['AJs', 'AQs', 'AKs']))
    expect(parseRange('KJo+')).toEqual(new Set(['KJo', 'KQo']))
    expect(parseRange('K9s-K7s')).toEqual(new Set(['K7s', 'K8s', 'K9s']))
  })

  it('normalises card order in an explicit combo', () => {
    expect(parseRange('KAs')).toEqual(new Set(['AKs']))
  })

  it('rejects nonsense rather than silently ignoring it', () => {
    expect(() => parseRange('XYZ')).toThrow()
  })

  it('produces only hands that exist on the grid', () => {
    for (const chart of CHARTS) {
      for (const hand of buildChart(chart.actions).keys()) {
        expect(ALL_HANDS, `${chart.id} produced ${hand}`).toContain(hand)
      }
    }
  })

  it('keeps every chart inside a believable width', () => {
    for (const chart of CHARTS) {
      const percent = rangePercent(buildChart(chart.actions))
      expect(percent, `${chart.id} is ${percent}%`).toBeGreaterThan(5)
      expect(percent, `${chart.id} is ${percent}%`).toBeLessThan(75)
    }
  })

  it('opens wider from later position', () => {
    const width = (id) => rangePercent(buildChart(CHARTS.find((c) => c.id === id).actions))
    expect(width('rfi-utg')).toBeLessThan(width('rfi-hj'))
    expect(width('rfi-hj')).toBeLessThan(width('rfi-co'))
    expect(width('rfi-co')).toBeLessThan(width('rfi-btn'))
  })
})

describe('math drills', () => {
  it('generates every drill type with a correct answer among the options', () => {
    for (const type of DRILL_TYPES) {
      // The equity generator runs a Monte Carlo per question, so sample it less.
      const iterations = type.id === 'equity' || type.id === 'all' ? 25 : 200
      for (let i = 0; i < iterations; i += 1) {
        const q = generateQuestion(type.id)
        expect(q.options.map((o) => o.value)).toContain(q.answer)
        expect(q.options.length).toBeGreaterThanOrEqual(2)
        expect(new Set(q.options.map((o) => o.value)).size).toBe(q.options.length)
        expect(q.working).toBeTruthy()
        expect(q.prompt).toBeTruthy()
      }
    }
  })

  it('computes pot odds correctly', () => {
    for (let i = 0; i < 300; i += 1) {
      const q = generateQuestion('potOdds')
      const [, bet, pot] = q.prompt.match(/bets (\d+(?:\.\d+)?)bb into a (\d+(?:\.\d+)?)bb pot/).map(Number)
      expect(q.answer).toBe(Math.round((bet / (pot + bet * 2)) * 100))
    }
  })

  it('computes break-even bluff frequency correctly', () => {
    for (let i = 0; i < 300; i += 1) {
      const q = generateQuestion('bluff')
      const [, bet, pot] = q.prompt.match(/bluff (\d+(?:\.\d+)?)bb into a (\d+(?:\.\d+)?)bb pot/).map(Number)
      expect(q.answer).toBe(Math.round((bet / (pot + bet)) * 100))
    }
  })
})
