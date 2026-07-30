import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleCheck, CircleX, Grid3x3, Info, RotateCcw, Target } from 'lucide-react'

import { PlayingCard } from '@/components/PlayingCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CHARTS, RANGE_ACTIONS } from '@/data/ranges'
import { ALL_HANDS, HAND_GRID, RANKS, buildChart, rangePercent } from '@/lib/range'
import { loadSlice, saveSlice } from '@/lib/storage'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'ranges'
const EMPTY_STATS = { total: 0, correct: 0, byChart: {} }

/** 'AKs' -> ['As','Ks'] so the quiz can show real cards instead of shorthand. */
function handToCards(hand) {
  const [a, b] = [hand[0], hand[1]]
  if (hand.length === 2) return [`${a}h`, `${b}s`]
  return hand.endsWith('s') ? [`${a}s`, `${b}s`] : [`${a}h`, `${b}c`]
}

function randomHand() {
  return ALL_HANDS[Math.floor(Math.random() * ALL_HANDS.length)]
}

function RangeGrid({ chart, highlight, onCellClick }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="grid min-w-[280px] grid-cols-13 gap-[2px]">
        {HAND_GRID.map((row, r) =>
          row.map((hand, c) => {
            const action = chart.get(hand) ?? 'fold'
            const meta = RANGE_ACTIONS[action]
            const isHighlight = highlight === hand
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                tabIndex={-1}
                onClick={onCellClick ? () => onCellClick(hand) : undefined}
                title={`${hand} — ${meta.label}`}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-[3px] text-[7px] font-bold leading-none transition-all sm:text-[10px]',
                  meta.swatch,
                  action === 'fold' ? meta.text : meta.text,
                  isHighlight && 'z-10 scale-125 shadow-lg ring-2 ring-white',
                )}
              >
                {hand}
              </button>
            )
          }),
        )}
      </div>
      <div className="mt-1 flex min-w-[280px] justify-between px-0.5 text-[8px] text-muted-foreground sm:text-[10px]">
        {RANKS.map((r) => (
          <span key={r} className="flex-1 text-center">
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}

function Legend({ chart, actionIds }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[...actionIds, 'fold'].map((id) => {
        const meta = RANGE_ACTIONS[id]
        return (
          <span key={id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn('h-2.5 w-2.5 rounded-sm', meta.swatch)} aria-hidden="true" />
            {meta.label}
            <span className="tabular font-semibold text-foreground/80">
              {id === 'fold'
                ? `${Math.round((100 - rangePercent(chart)) * 10) / 10}%`
                : `${rangePercent(chart, [id])}%`}
            </span>
          </span>
        )
      })}
    </div>
  )
}

export function RangeTrainer() {
  const [chartId, setChartId] = useState(CHARTS[0].id)
  const [mode, setMode] = useState('chart')
  const [hand, setHand] = useState(randomHand)
  const [answer, setAnswer] = useState(null)
  const [stats, setStats] = useState(() => loadSlice(STORAGE_KEY, EMPTY_STATS))

  useEffect(() => {
    saveSlice(STORAGE_KEY, stats)
  }, [stats])

  const chartDef = CHARTS.find((c) => c.id === chartId) ?? CHARTS[0]
  const chart = useMemo(() => buildChart(chartDef.actions), [chartDef])
  const actionIds = Object.keys(chartDef.actions)
  const correctAction = chart.get(hand) ?? 'fold'

  const chartStats = stats.byChart[chartId] ?? { total: 0, correct: 0 }

  const submit = useCallback(
    (choice) => {
      if (answer) return
      const isRight = choice === correctAction
      setAnswer({ choice, isRight })
      setStats((prev) => {
        const prevChart = prev.byChart[chartId] ?? { total: 0, correct: 0 }
        return {
          total: prev.total + 1,
          correct: prev.correct + (isRight ? 1 : 0),
          byChart: {
            ...prev.byChart,
            [chartId]: {
              total: prevChart.total + 1,
              correct: prevChart.correct + (isRight ? 1 : 0),
            },
          },
        }
      })
    },
    [answer, chartId, correctAction],
  )

  const nextHand = useCallback(() => {
    setAnswer(null)
    setHand((prev) => {
      let next = randomHand()
      while (next === prev) next = randomHand()
      return next
    })
  }, [])

  // Quiz keyboard: 1-3 answer, Enter for the next hand.
  useEffect(() => {
    if (mode !== 'quiz') return undefined
    const options = [...actionIds, 'fold']
    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey) return
      if (!answer) {
        const index = Number(event.key) - 1
        if (Number.isInteger(index) && index >= 0 && index < options.length) {
          event.preventDefault()
          submit(options[index])
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        nextHand()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actionIds, answer, mode, nextHand, submit])

  return (
    <div className="space-y-3">
      {/* Chart picker */}
      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {CHARTS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setChartId(c.id)
              setAnswer(null)
            }}
            className={cn(
              'flex shrink-0 flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-all active:scale-95',
              c.id === chartId
                ? 'border-felt-500/50 bg-felt-500/15 text-felt-100'
                : 'border-white/10 bg-card/60 text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="text-xs font-bold">{c.label}</span>
            <span className="text-[9px] uppercase tracking-wide opacity-70">{c.group}</span>
          </button>
        ))}
      </div>

      {/* Mode switch */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg bg-muted/70 p-1">
          <button
            type="button"
            onClick={() => setMode('chart')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
              mode === 'chart' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            <Grid3x3 className="h-3.5 w-3.5" aria-hidden="true" />
            Chart
          </button>
          <button
            type="button"
            onClick={() => setMode('quiz')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
              mode === 'quiz' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            Quiz
          </button>
        </div>
        {stats.total > 0 ? (
          <Badge variant="slate" className="ml-auto">
            Quiz {Math.round((stats.correct / stats.total) * 100)}% · {stats.total}
          </Badge>
        ) : null}
      </div>

      {mode === 'quiz' ? (
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {chartDef.group === 'Defending'
                  ? `You are in the BB — ${chartDef.context}`
                  : `You are ${chartDef.label}, folded to you`}
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                {handToCards(hand).map((card, i) => (
                  <PlayingCard key={card + i} card={card} size="lg" className="animate-card-in" />
                ))}
              </div>
              <p className="tabular mt-2 text-sm font-bold text-foreground">
                {hand}
                {hand.length === 3 ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({hand.endsWith('s') ? 'suited' : 'offsuit'})
                  </span>
                ) : null}
              </p>
            </div>

            <div className={cn('grid gap-2', actionIds.length > 1 ? 'grid-cols-3' : 'grid-cols-2')}>
              {[...actionIds, 'fold'].map((id) => {
                const meta = RANGE_ACTIONS[id]
                const isChoice = answer?.choice === id
                const isCorrect = answer && id === correctAction
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={Boolean(answer)}
                    onClick={() => submit(id)}
                    className={cn(
                      'rounded-lg border px-3 py-3 text-sm font-bold transition-all active:scale-95',
                      !answer && 'border-white/10 bg-card/80 hover:border-felt-400/60',
                      answer && isCorrect && 'border-emerald-500/70 bg-emerald-500/20 text-emerald-200',
                      answer && isChoice && !isCorrect && 'border-rose-500/70 bg-rose-500/20 text-rose-200',
                      answer && !isChoice && !isCorrect && 'border-white/5 bg-card/40 opacity-50',
                    )}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>

            {answer ? (
              <div className="animate-fade-up space-y-3">
                <div
                  className={cn(
                    'flex items-start gap-2 rounded-lg border p-3',
                    answer.isRight
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-rose-500/40 bg-rose-500/10',
                  )}
                >
                  {answer.isRight ? (
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
                  )}
                  <p className="text-sm">
                    <span className={cn('font-bold', answer.isRight ? 'text-emerald-200' : 'text-rose-200')}>
                      {answer.isRight ? 'Correct — ' : 'Not quite — '}
                    </span>
                    <span className="text-foreground/85">
                      {hand} is a <b>{RANGE_ACTIONS[correctAction].label.toLowerCase()}</b> from{' '}
                      {chartDef.label}.
                    </span>
                  </p>
                </div>

                <RangeGrid chart={chart} highlight={hand} />
                <Legend chart={chart} actionIds={actionIds} />

                <Button size="lg" className="w-full font-bold" onClick={nextHand}>
                  Next Hand
                </Button>
              </div>
            ) : (
              <p className="text-center text-[11px] text-muted-foreground">
                {chartDef.group === 'Defending'
                  ? 'What is your default action facing the open?'
                  : 'Open or fold?'}
              </p>
            )}

            {chartStats.total > 0 ? (
              <p className="text-center text-[10px] text-muted-foreground">
                {chartDef.label}: {Math.round((chartStats.correct / chartStats.total) * 100)}% over{' '}
                {chartStats.total} hand{chartStats.total === 1 ? '' : 's'}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-bold">{chartDef.label}</h3>
              <span className="text-[11px] text-muted-foreground">{chartDef.context}</span>
            </div>

            <RangeGrid chart={chart} />
            <Legend chart={chart} actionIds={actionIds} />

            <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/25 p-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-felt-300" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-foreground/85">{chartDef.note}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.total > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setStats(EMPTY_STATS)}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset range quiz stats
        </Button>
      ) : null}
    </div>
  )
}
