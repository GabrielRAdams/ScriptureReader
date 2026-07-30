import { useCallback, useState } from 'react'
import { Calculator, Grid3x3, LineChart, Spade } from 'lucide-react'

import { DrillView } from '@/components/DrillView'
import { MathDrill } from '@/components/MathDrill'
import { ProgressView } from '@/components/ProgressView'
import { RangeTrainer } from '@/components/RangeTrainer'
import { SessionHeader } from '@/components/SessionHeader'
import { useTrainer, REVIEW_FILTER } from '@/hooks/useTrainer'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'drill', label: 'Drill', icon: Spade },
  { id: 'ranges', label: 'Ranges', icon: Grid3x3 },
  { id: 'math', label: 'Math', icon: Calculator },
  { id: 'progress', label: 'Progress', icon: LineChart },
]

export default function App() {
  const trainer = useTrainer()
  const [tab, setTab] = useState('drill')

  const navigate = useCallback(
    (target, options = {}) => {
      if (options.review) trainer.setFilter(REVIEW_FILTER)
      setTab(target)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [trainer],
  )

  return (
    <div className="min-h-dvh pb-20">
      <SessionHeader
        stats={trainer.stats}
        streak={trainer.streak}
        bestStreak={trainer.bestStreak}
        format={trainer.format}
        compact={tab !== 'drill'}
        onReset={trainer.reset}
      />

      <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-4 sm:py-4">
        {tab === 'drill' ? <DrillView trainer={trainer} /> : null}
        {tab === 'ranges' ? <RangeTrainer /> : null}
        {tab === 'math' ? <MathDrill /> : null}
        {tab === 'progress' ? <ProgressView trainer={trainer} onNavigate={navigate} /> : null}
      </main>

      {/* Thumb-reachable bottom nav — the whole app is meant to be used one-handed. */}
      <nav
        aria-label="Sections"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/90 pt-1 backdrop-blur-lg"
      >
        <div className="mx-auto flex w-full max-w-3xl">
          {TABS.map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate(item.id)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold transition-colors',
                  active ? 'text-felt-200' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon
                  className={cn('h-5 w-5', active && 'drop-shadow-[0_0_6px_rgba(45,212,150,0.5)]')}
                  aria-hidden="true"
                />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
