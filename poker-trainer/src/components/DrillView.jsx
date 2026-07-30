import { useEffect, useMemo } from 'react'
import { PartyPopper, SkipForward } from 'lucide-react'

import { ActionPanel } from '@/components/ActionPanel'
import { CategoryPicker, FormatSwitch } from '@/components/CategoryPicker'
import { FeedbackPanel } from '@/components/FeedbackPanel'
import { ScenarioHeader } from '@/components/ScenarioHeader'
import { TableFelt } from '@/components/TableFelt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CATEGORIES, FORMATS } from '@/data/categories'
import { ALL_CATEGORIES } from '@/hooks/useTrainer'
import { sortActionsForDisplay } from '@/lib/actions'

export function DrillView({ trainer }) {
  const {
    scenario,
    chosenAction,
    format,
    filter,
    poolSize,
    remaining,
    missedCount,
    answer,
    next,
    setFilter,
    setFormat,
  } = trainer

  // Same order the buttons are rendered in, so the number keys line up.
  const displayActions = useMemo(
    () => (scenario ? sortActionsForDisplay(scenario.actions) : []),
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

  const filters = (
    <div className="flex flex-col gap-2">
      <FormatSwitch value={format} onChange={setFormat} />
      <CategoryPicker
        format={format}
        value={filter}
        onChange={setFilter}
        missedCount={missedCount}
      />
    </div>
  )

  // The review filter empties out once every missed hand has been re-answered.
  if (!scenario) {
    return (
      <div className="space-y-3">
        {filters}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <PartyPopper className="h-8 w-8 text-felt-300" aria-hidden="true" />
            <div>
              <h2 className="text-base font-bold">No hands left in this set</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You have cleared every hand you previously blundered in {FORMATS[format].name}. Pick
                another category to keep drilling.
              </p>
            </div>
            <Button onClick={() => setFilter(ALL_CATEGORIES)}>Back to all scenarios</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const category = CATEGORIES[scenario.category]

  return (
    <div className="space-y-3">
      {filters}

      <div className="flex items-center justify-between px-0.5">
        <p className="min-w-0 truncate text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/80">{category.title}</span>
          <span className="hidden sm:inline"> — {category.tagline}</span>
        </p>
        <span className="tabular shrink-0 pl-2 text-[11px] text-muted-foreground">
          {poolSize - remaining + 1} / {poolSize} in set
        </span>
      </div>

      <ScenarioHeader scenario={scenario} />
      <TableFelt scenario={scenario} />

      <section className="animate-fade-up space-y-2.5" aria-label="Your action">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {chosenAction ? 'Action review' : 'Your action'}
          </h2>
          <Badge variant="felt">
            {scenario.toCall ? `Facing ${scenario.toCall}` : 'Checked to you'}
          </Badge>
        </div>

        <ActionPanel scenario={scenario} chosenId={chosenAction?.id ?? null} onSelect={answer} />

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

      <p className="pt-1 text-center text-[10px] leading-relaxed text-muted-foreground">
        Exploitative recommendations for {FORMATS[format].detail} — not solver output. Adjust to your
        table.
      </p>
    </div>
  )
}
