import { useState } from 'react'
import {
  ChevronDown,
  Flame,
  RotateCcw,
  Spade,
  Target,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

function accuracyTone(accuracy, total) {
  if (!total) return { text: 'text-muted-foreground', bar: 'bg-slate-500' }
  if (accuracy >= 80) return { text: 'text-emerald-300', bar: 'bg-emerald-400' }
  if (accuracy >= 60) return { text: 'text-amber-300', bar: 'bg-amber-400' }
  return { text: 'text-rose-300', bar: 'bg-rose-400' }
}

function Metric({ icon: Icon, label, value, tone, sub }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-lg bg-black/25 px-2 py-2 ring-1 ring-white/5">
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('tabular text-lg font-extrabold leading-tight', tone)}>{value}</div>
      {sub ? <div className="text-[9px] text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

/**
 * Sticky session tracker. Collapsed by default on mobile: four metrics plus a
 * one-line leak warning; expanding reveals the per-category breakdown.
 */
export function SessionHeader({ stats, streak, bestStreak, onReset }) {
  const [open, setOpen] = useState(false)
  const tone = accuracyTone(stats.accuracy, stats.total)

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto w-full max-w-3xl px-3 pb-2.5 pt-3 sm:px-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-felt-600 shadow-md shadow-felt-900/60">
            <Spade className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-extrabold leading-tight tracking-tight">
              Live Poker Scenario Trainer
            </h1>
            <p className="truncate text-[10px] text-muted-foreground">
              $1/$2 &amp; $2/$5 exploitative decisions
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onReset}
            aria-label="Reset session stats"
            title="Reset session"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex gap-1.5">
          <Metric icon={Target} label="Hands" value={stats.total} tone="text-foreground" />
          <Metric
            icon={TrendingUp}
            label="Accuracy"
            value={stats.total ? `${stats.accuracy}%` : '—'}
            tone={tone.text}
          />
          <Metric
            icon={Flame}
            label="Streak"
            value={streak}
            tone={streak >= 3 ? 'text-orange-300' : 'text-foreground'}
            sub={`best ${bestStreak}`}
          />
          <Metric
            icon={TriangleAlert}
            label="Blunders"
            value={stats.counts.blunder}
            tone={stats.counts.blunder > 0 ? 'text-rose-300' : 'text-foreground'}
          />
        </div>

        {stats.total > 0 ? (
          <Progress
            value={stats.accuracy}
            className="mt-2 h-1.5"
            indicatorClassName={tone.bar}
            aria-label={`Session accuracy ${stats.accuracy} percent`}
          />
        ) : null}

        {stats.topLeaks.length > 0 ? (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" aria-hidden="true" />
            <p className="text-[11px] leading-snug text-rose-100/90">
              <span className="font-bold">{stats.topLeaks[0].label}: </span>
              {stats.topLeaks[0].message}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          {open ? 'Hide breakdown' : 'Category breakdown'}
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>

        {open ? (
          <div className="animate-fade-up space-y-1.5 pb-1">
            {stats.byCategory.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', cat.dot)} aria-hidden="true" />
                <span className="w-24 shrink-0 truncate text-[11px] text-muted-foreground sm:w-32">
                  {cat.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', cat.bar)}
                    style={{ width: `${cat.accuracy ?? 0}%` }}
                  />
                </div>
                <span className="tabular w-14 shrink-0 text-right text-[11px] font-semibold text-foreground/80">
                  {cat.attempts ? `${cat.accuracy}%` : '—'}
                </span>
                <span className="tabular w-8 shrink-0 text-right text-[10px] text-muted-foreground">
                  {cat.attempts ? `${cat.attempts}h` : ''}
                </span>
              </div>
            ))}

            {stats.weakest ? (
              <Badge variant="rose" className="mt-1">
                Weakest: {stats.weakest.name} ({stats.weakest.accuracy}%)
              </Badge>
            ) : null}

            {stats.topLeaks.slice(1).map((leak) => (
              <p key={leak.id} className="text-[11px] leading-snug text-rose-100/80">
                <span className="font-bold">{leak.label}: </span>
                {leak.message}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  )
}
