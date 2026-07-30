import { CircleCheck, Hourglass, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Rows show the stat, a healthy band, and whether you are inside it. The bands
 * are what a winning 6-max micro reg looks like, not solver output.
 */
const ROWS = [
  { key: 'vpip', label: 'VPIP', sample: 'hands', min: 60, good: [18, 30], suffix: '%' },
  { key: 'pfr', label: 'PFR', sample: 'hands', min: 60, good: [14, 25], suffix: '%' },
  { key: 'threeBet', label: '3-bet', sample: 'threeBetChances', min: 40, good: [5, 12], suffix: '%' },
  { key: 'cbet', label: 'Flop c-bet', sample: 'cbetChances', min: 15, good: [45, 80], suffix: '%' },
  { key: 'foldToCbet', label: 'Fold to c-bet', sample: 'facedCbet', min: 15, good: [35, 60], suffix: '%' },
  { key: 'bbFold', label: 'BB fold', sample: 'bbFacedRaise', min: 20, good: [40, 70], suffix: '%' },
  { key: 'wtsd', label: 'WTSD', sample: 'flops', min: 30, good: [22, 32], suffix: '%' },
  { key: 'wsd', label: 'Won at showdown', sample: 'showdowns', min: 25, good: [48, 100], suffix: '%' },
]

function StatRow({ row, stats }) {
  const value = stats[row.key]
  const sample = stats.samples[row.sample] ?? 0
  const enough = sample >= row.min
  const inBand = value != null && value >= row.good[0] && value <= row.good[1]

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 truncate text-muted-foreground sm:w-36">{row.label}</span>
      <span
        className={cn(
          'tabular w-12 shrink-0 text-right font-bold',
          !enough ? 'text-muted-foreground' : inBand ? 'text-emerald-300' : 'text-amber-300',
        )}
      >
        {value == null ? '—' : `${Math.round(value)}${row.suffix}`}
      </span>
      <span className="tabular hidden w-20 shrink-0 text-right text-[10px] text-muted-foreground sm:inline">
        {row.good[1] >= 100 ? `${row.good[0]}+` : `${row.good[0]}-${row.good[1]}${row.suffix}`}
      </span>
      <span className="tabular ml-auto shrink-0 text-[10px] text-muted-foreground">
        {enough ? `n=${sample}` : `${sample}/${row.min}`}
      </span>
    </div>
  )
}

export function SessionReport({ stats, leaks, pending }) {
  if (stats.hands === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-sm text-muted-foreground">
          Play some hands and your stat line and leaks will appear here.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-2 p-4 sm:p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Your stat line
            </h3>
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              value · healthy band · sample
            </span>
          </div>
          {ROWS.map((row) => (
            <StatRow key={row.key} row={row} stats={stats} />
          ))}
        </CardContent>
      </Card>

      {leaks.length > 0 ? (
        <Card className="border-rose-500/30">
          <CardContent className="space-y-2.5 p-4 sm:p-5">
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <TriangleAlert className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />
              Leaks in your play
            </h3>
            {leaks.map((leak) => (
              <div key={leak.id} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                <span className="text-xs font-bold text-rose-200">{leak.label}</span>
                <p className="mt-1 text-xs leading-relaxed text-foreground/85">{leak.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-foreground/85">
            No leaks firing yet. Every check either looks healthy or does not have enough hands
            behind it — keep playing and they will sharpen.
          </p>
        </div>
      )}

      {pending.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/25 p-3">
          <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground/70">Not enough hands to judge yet: </span>
            {pending.join(' · ')}
          </p>
        </div>
      ) : null}

      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        Bands describe a winning 6-max micro-stakes regular. Being outside one is a prompt to look,
        not proof of a mistake.
      </p>
    </div>
  )
}

export function AdaptingBadge({ active, after = 25 }) {
  return (
    <Badge variant={active ? 'amber' : 'slate'}>
      {active ? 'Regs are adapting to you' : `Regs adapt after ${after} hands`}
    </Badge>
  )
}
