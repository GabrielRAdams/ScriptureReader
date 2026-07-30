import { useEffect, useState } from 'react'
import { Calculator, Grid3x3, Spade, TriangleAlert, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FORMATS } from '@/data/categories'
import { loadSlice } from '@/lib/storage'
import { cn } from '@/lib/utils'

function Tile({ icon: Icon, label, value, sub, tone = 'text-foreground' }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/25 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </div>
      <div className={cn('tabular mt-1 text-2xl font-extrabold leading-none', tone)}>{value}</div>
      {sub ? <div className="mt-1 text-[10px] text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

function pct(correct, total) {
  return total ? `${Math.round((correct / total) * 100)}%` : '—'
}

/**
 * Everything the session has learned about you: scenario accuracy per format,
 * the leaks that keep repeating, and the range/math quiz numbers pulled
 * straight from their own storage slices.
 */
export function ProgressView({ trainer, onNavigate }) {
  const { stats, history, format, bestStreak, missedCount, reset } = trainer
  const [otherStats, setOtherStats] = useState(() => ({
    ranges: loadSlice('ranges', { total: 0, correct: 0 }),
    math: loadSlice('math', { total: 0, correct: 0, bestStreak: 0 }),
  }))

  // Refresh from storage whenever this view mounts — the quiz components own
  // those slices and may have updated them since the last render.
  useEffect(() => {
    setOtherStats({
      ranges: loadSlice('ranges', { total: 0, correct: 0 }),
      math: loadSlice('math', { total: 0, correct: 0, bestStreak: 0 }),
    })
  }, [])

  const other = FORMATS[format === 'online' ? 'live' : 'online']
  const otherFormatHands = history.filter((h) => h.format === other.id).length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Tile
          icon={Spade}
          label="Scenarios"
          value={stats.total}
          sub={`${FORMATS[format].name} · ${history.length} lifetime`}
        />
        <Tile
          icon={Spade}
          label="Accuracy"
          value={stats.total ? `${stats.accuracy}%` : '—'}
          tone={
            !stats.total
              ? 'text-muted-foreground'
              : stats.accuracy >= 80
                ? 'text-emerald-300'
                : stats.accuracy >= 60
                  ? 'text-amber-300'
                  : 'text-rose-300'
          }
          sub={`best streak ${bestStreak}`}
        />
        <Tile
          icon={Grid3x3}
          label="Range quiz"
          value={pct(otherStats.ranges.correct, otherStats.ranges.total)}
          sub={`${otherStats.ranges.total} hands`}
        />
        <Tile
          icon={Calculator}
          label="Math drill"
          value={pct(otherStats.math.correct, otherStats.math.total)}
          sub={`${otherStats.math.total} questions · best streak ${otherStats.math.bestStreak ?? 0}`}
        />
      </div>

      {stats.total === 0 ? (
        <Card>
          <CardContent className="p-5 text-center text-sm text-muted-foreground">
            Play some hands in the Drill tab and your accuracy, category breakdown, and leaks will
            show up here.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {FORMATS[format].name} by category
            </h3>
            {stats.byCategory.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', cat.dot)} aria-hidden="true" />
                  <span className="flex-1 truncate font-semibold text-foreground/90">{cat.title}</span>
                  <span className="tabular shrink-0 font-bold">
                    {cat.attempts ? `${cat.accuracy}%` : '—'}
                  </span>
                  <span className="tabular w-14 shrink-0 whitespace-nowrap text-right text-muted-foreground">
                    {cat.attempts} hand{cat.attempts === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', cat.bar)}
                    style={{ width: `${cat.accuracy ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
            {stats.weakest ? (
              <Badge variant="rose">
                Focus here: {stats.weakest.name} ({stats.weakest.accuracy}%)
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      )}

      {stats.leaks.length > 0 ? (
        <Card>
          <CardContent className="space-y-2.5 p-4 sm:p-5">
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <TriangleAlert className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />
              Leaks to plug
            </h3>
            {stats.leaks.map((leak) => (
              <div key={leak.id} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-200">{leak.label}</span>
                  <Badge variant="rose">×{leak.count}</Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-foreground/80">{leak.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {missedCount > 0 ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onNavigate('drill', { review: true })}
        >
          <TriangleAlert className="h-4 w-4 text-rose-300" aria-hidden="true" />
          Replay {missedCount} missed hand{missedCount === 1 ? '' : 's'}
        </Button>
      ) : null}

      {otherFormatHands > 0 ? (
        <p className="text-center text-[11px] text-muted-foreground">
          You also have {otherFormatHands} hand{otherFormatHands === 1 ? '' : 's'} logged in{' '}
          {other.name}. Switch format in the Drill tab to see those numbers.
        </p>
      ) : null}

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground"
        onClick={() => {
          if (window.confirm('Reset all scenario progress? Range and math stats are kept.')) reset()
        }}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        Reset scenario progress
      </Button>
    </div>
  )
}
