import { ArrowRight, CircleAlert, CircleCheck, CircleX, Lightbulb } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RATINGS } from '@/lib/ratings'
import { cn } from '@/lib/utils'

const VERDICT_ICONS = {
  optimal: CircleCheck,
  acceptable: CircleAlert,
  blunder: CircleX,
}

/**
 * Recommended-action mix. Bars are stacked descending so the "right" answer is
 * always visually dominant, and each bar is coloured by its own rating.
 */
function FrequencyBar({ actions, chosenId }) {
  const sorted = [...actions].sort((a, b) => b.freq - a.freq)

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Recommended frequency
        </h4>
        <span className="text-[10px] text-muted-foreground">Exploitative mix vs live pools</span>
      </div>

      {/* One combined bar first, for an at-a-glance read of the mix. */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {sorted
          .filter((a) => a.freq > 0)
          .map((action) => (
            <div
              key={action.id}
              className={cn('h-full transition-all duration-500', RATINGS[action.rating].bar)}
              style={{ width: `${action.freq}%` }}
              title={`${action.label} — ${action.freq}%`}
            />
          ))}
      </div>

      <ul className="space-y-1.5">
        {sorted.map((action) => {
          const rating = RATINGS[action.rating]
          const isChosen = action.id === chosenId
          return (
            <li key={action.id} className="flex items-center gap-2.5">
              <span
                className={cn(
                  'w-[46%] shrink-0 truncate text-xs sm:w-[38%]',
                  isChosen ? 'font-bold text-foreground' : 'text-muted-foreground',
                )}
              >
                {action.label}
                {isChosen ? <span className="ml-1 text-felt-300">←</span> : null}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', rating.bar)}
                  style={{ width: `${action.freq}%` }}
                />
              </div>
              <span className="tabular w-9 shrink-0 text-right text-xs font-semibold text-foreground/80">
                {action.freq}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function FeedbackPanel({ scenario, chosenAction, onNext }) {
  const rating = RATINGS[chosenAction.rating]
  const VerdictIcon = VERDICT_ICONS[chosenAction.rating]
  const best = scenario.actions.find((a) => a.id === scenario.bestAction)

  return (
    <Card
      className={cn('animate-fade-up border-2', rating.border, rating.bgSoft)}
      role="status"
      aria-live="polite"
    >
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <VerdictIcon className={cn('mt-0.5 h-6 w-6 shrink-0', rating.text)} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 className={cn('text-base font-extrabold leading-tight', rating.text)}>
              {rating.label}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90">
              {chosenAction.feedback}
            </p>
          </div>
        </div>

        {chosenAction.rating !== 'optimal' && best ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <CircleCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <p className="text-xs text-emerald-100/90">
              Best play: <span className="font-bold">{best.label}</span>
              <span className="text-emerald-200/70"> — {best.detail}</span>
            </p>
          </div>
        ) : null}

        <div className="space-y-2 rounded-lg border border-white/5 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
              Why — live dynamics
            </h4>
            <Badge variant="slate" className="ml-auto hidden sm:inline-flex">
              {scenario.keyConcept}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-foreground/85">{scenario.explanation}</p>
        </div>

        <FrequencyBar actions={scenario.actions} chosenId={chosenAction.id} />

        <Button size="lg" className="w-full text-base font-bold" onClick={onNext}>
          Next Scenario
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  )
}
