import { Dices, Flame, Layers, Shield, Shuffle, Swords, TriangleAlert, Users } from 'lucide-react'

import { CATEGORIES, FORMATS, FORMAT_IDS, categoryIdsFor } from '@/data/categories'
import { scenariosForFormat } from '@/data/scenarios'
import { ALL_CATEGORIES, REVIEW_FILTER } from '@/hooks/useTrainer'
import { cn } from '@/lib/utils'

const ICONS = { Users, Layers, Flame, Swords, Dices, Shield }

/** Online micros vs live cash — the two games grade differently, so pick one. */
export function FormatSwitch({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1">
      {FORMAT_IDS.map((id) => {
        const format = FORMATS[id]
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-center rounded-lg px-3 py-1.5 transition-all active:scale-[0.98]',
              active
                ? 'bg-felt-600 text-white shadow-md shadow-felt-900/50'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="text-xs font-bold">{format.name}</span>
            <span className={cn('text-[9px]', active ? 'text-felt-100/80' : 'opacity-70')}>
              {format.blurb}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Horizontal, swipeable filter rail — one tap to drill a single leak category,
 * shuffle everything, or replay only the hands you have blundered.
 */
export function CategoryPicker({ format, value, onChange, missedCount }) {
  const options = [
    {
      id: ALL_CATEGORIES,
      name: 'Shuffle All',
      icon: Shuffle,
      count: scenariosForFormat(format).length,
      chip: 'border-felt-500/40 bg-felt-500/15 text-felt-200',
    },
    ...(missedCount > 0
      ? [
          {
            id: REVIEW_FILTER,
            name: 'Review misses',
            icon: TriangleAlert,
            count: missedCount,
            chip: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
          },
        ]
      : []),
    ...categoryIdsFor(format).map((id) => ({
      id,
      name: CATEGORIES[id].name,
      icon: ICONS[CATEGORIES[id].icon] ?? Layers,
      count: scenariosForFormat(format).filter((s) => s.category === id).length,
      chip: CATEGORIES[id].chip,
    })),
  ]

  return (
    <div
      className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0"
      role="tablist"
      aria-label="Scenario category"
    >
      {options.map((option) => {
        const Icon = option.icon
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? cn(option.chip, 'ring-1 ring-white/20')
                : 'border-white/10 bg-card/60 text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {option.name}
            <span className="tabular rounded-full bg-black/30 px-1.5 py-px text-[10px] font-bold">
              {option.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
