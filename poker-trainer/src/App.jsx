import { useEffect, useMemo } from 'react'
import { SkipForward } from 'lucide-react'

import { ActionPanel } from '@/components/ActionPanel'
import { CategoryPicker } from '@/components/CategoryPicker'
import { FeedbackPanel } from '@/components/FeedbackPanel'
import { ScenarioHeader } from '@/components/ScenarioHeader'
import { SessionHeader } from '@/components/SessionHeader'
import { TableFelt } from '@/components/TableFelt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CATEGORIES } from '@/data/categories'
import { useTrainer } from '@/hooks/useTrainer'
import { sortActionsForDisplay } from '@/lib/actions'

export default function App() {
  const {
    scenario,
    chosenAction,
    filter,
    streak,
    bestStreak,
    stats,
    poolSize,
    remaining,
    answer,
    next,
    setFilter,
    reset,
  } = useTrainer()

  // Same order the buttons are rendered in, so the number keys line up.
  const displayActions = useMemo(
    () => sortActionsForDisplay(scenario.actions),
    [scenario],
  )

  // Keyboard shortcuts: 1-4 pick an action, Enter/Space advances.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (!chosenAction) {
        const index = Number(event.key) - 1
        if (Number.isInteger(index) && index >= 0 && index < displayActions.length) {
          event.preventDefault()
          answer(displayActions[index])
        }
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        next()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answer, chosenAction, displayActions, next])

  const category = CATEGORIES[scenario.category]

  return (
    <div className="min-h-dvh">
      <SessionHeader
        stats={stats}
        streak={streak}
        bestStreak={bestStreak}
        onReset={reset}
      />

      <main className="safe-bottom mx-auto w-full max-w-3xl space-y-3 px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex flex-col gap-2">
          <CategoryPicker value={filter} onChange={setFilter} />
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground/80">{category.title}</span>
              <span className="hidden sm:inline"> — {category.tagline}</span>
            </p>
            <span className="tabular shrink-0 text-[11px] text-muted-foreground">
              {poolSize - remaining + 1} / {poolSize} in set
            </span>
          </div>
        </div>

        <ScenarioHeader scenario={scenario} />
        <TableFelt scenario={scenario} />

        <section className="animate-fade-up space-y-2.5" aria-label="Your action">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {chosenAction ? 'Action review' : 'Your action'}
            </h2>
            <Badge variant="felt">
              {scenario.toCallUSD === '$0' ? 'Checked to you' : `Facing ${scenario.toCallUSD}`}
            </Badge>
          </div>

          <ActionPanel
            scenario={scenario}
            chosenId={chosenAction?.id ?? null}
            onSelect={answer}
          />

          {chosenAction ? null : (
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <p className="hidden text-[10px] text-muted-foreground sm:block">
                Tip: press 1-{displayActions.length} to act, Enter for the next hand.
              </p>
              <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={next}>
                <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                Skip hand
              </Button>
            </div>
          )}
        </section>

        {chosenAction ? (
          <FeedbackPanel scenario={scenario} chosenAction={chosenAction} onNext={next} />
        ) : null}

        <footer className="pt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
          Ratings are exploitative recommendations for low/mid-stakes live pools, not solver output.
          Adjust to your table.
        </footer>
      </main>
    </div>
  )
}
