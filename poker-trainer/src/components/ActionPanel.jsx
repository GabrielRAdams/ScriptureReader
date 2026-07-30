import { Check, ChevronsUp, Flame, TrendingUp, X } from 'lucide-react'

import { sortActionsForDisplay } from '@/lib/actions'
import { RATINGS } from '@/lib/ratings'
import { cn } from '@/lib/utils'

const ICONS = {
  fold: X,
  check: Check,
  call: Check,
  'bet-small': TrendingUp,
  'raise-small': TrendingUp,
  'bet-large': ChevronsUp,
  'raise-large': ChevronsUp,
  shove: Flame,
}

/**
 * Touch-first action grid. Before an answer it is neutral; afterwards every
 * button is colour-coded by rating so the whole decision tree is visible.
 */
export function ActionPanel({ scenario, chosenId, onSelect, disabled }) {
  const answered = Boolean(chosenId)

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {sortActionsForDisplay(scenario.actions).map((action) => {
        const Icon = ICONS[action.id] ?? TrendingUp
        const rating = RATINGS[action.rating]
        const isChosen = chosenId === action.id
        const isBest = action.id === scenario.bestAction

        return (
          <button
            key={action.id}
            type="button"
            disabled={disabled || answered}
            onClick={() => onSelect(action)}
            aria-pressed={isChosen}
            className={cn(
              'group relative flex min-h-[68px] flex-col items-start justify-center gap-0.5 rounded-xl border px-3 py-3 text-left transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              !answered &&
                'border-white/10 bg-card/80 hover:border-felt-400/60 hover:bg-felt-500/10 active:scale-[0.98]',
              answered && !isChosen && !isBest && 'border-white/5 bg-card/40 opacity-55',
              answered && isBest && !isChosen && cn(rating.border, 'bg-felt-500/10'),
              answered && isChosen && cn(rating.border, rating.bgSoft, 'ring-2', rating.ring),
              'disabled:cursor-default',
            )}
          >
            <div className="flex w-full items-center gap-2">
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  answered && isChosen ? rating.text : 'text-felt-300 group-hover:text-felt-200',
                )}
                aria-hidden="true"
              />
              <span className="text-sm font-bold leading-tight text-foreground">{action.label}</span>
            </div>
            <span className="pl-6 text-[11px] leading-tight text-muted-foreground">
              {action.detail}
            </span>

            {answered && isBest ? (
              <span className="absolute right-2 top-2 rounded-full bg-felt-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-felt-200">
                Best
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
