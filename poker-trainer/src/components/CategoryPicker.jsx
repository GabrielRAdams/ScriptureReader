import { Flame, Layers, Shuffle, Swords, Users } from 'lucide-react'

import { CATEGORIES, CATEGORY_IDS } from '@/data/categories'
import { SCENARIOS, SCENARIOS_BY_CATEGORY } from '@/data/scenarios'
import { ALL_CATEGORIES } from '@/hooks/useTrainer'
import { cn } from '@/lib/utils'

const ICONS = { Users, Layers, Flame, Swords }

/**
 * Horizontal, swipeable filter rail — one tap to drill a single leak category
 * or shuffle the whole library.
 */
export function CategoryPicker({ value, onChange }) {
  const options = [
    {
      id: ALL_CATEGORIES,
      name: 'Shuffle All',
      icon: Shuffle,
      count: SCENARIOS.length,
      chip: 'border-felt-500/40 bg-felt-500/15 text-felt-200',
    },
    ...CATEGORY_IDS.map((id) => ({
      id,
      name: CATEGORIES[id].name,
      icon: ICONS[CATEGORIES[id].icon] ?? Layers,
      count: SCENARIOS_BY_CATEGORY[id]?.length ?? 0,
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
