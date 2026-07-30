import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { BB, toBB } from '@/lib/cards'
import { sizingOptions } from '@/lib/pokerSim'
import { cn } from '@/lib/utils'

/** Literal class names so Tailwind's JIT can see every variant. */
const GRID_COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
}

/**
 * Hero's betting interface. Fold / check / call always sit in the same place so
 * the muscle memory transfers; raise sizes expand into a second row with a
 * slider for anything in between.
 */
export function ActionControls({ hand, legal, onAct, disabled }) {
  const [raising, setRaising] = useState(false)
  const [amount, setAmount] = useState(legal?.minRaiseTo ?? 0)

  // Reset the raise panel whenever it becomes a new decision.
  useEffect(() => {
    setRaising(false)
    setAmount(legal?.minRaiseTo ?? 0)
  }, [legal?.minRaiseTo, legal?.player?.seat, hand?.street])

  if (!legal) return null
  const options = sizingOptions(hand)

  if (raising) {
    return (
      <div className="space-y-2">
        {/* One compact row: the confirm button has to stay above the fold on a
            phone, so the presets never wrap onto three lines. */}
        <div className={cn('grid gap-1.5', GRID_COLS[Math.min(options.length, 5)] ?? 'grid-cols-5')}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAmount(option.to)}
              className={cn(
                'rounded-lg border px-1 py-1.5 text-[11px] font-bold leading-tight transition-all active:scale-95',
                amount === option.to
                  ? 'border-felt-300 bg-felt-600/40 text-felt-50'
                  : 'border-white/10 bg-card/70 text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
              <span className="tabular block text-[9px] font-semibold opacity-70">
                {toBB(option.to)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <input
            type="range"
            min={legal.minRaiseTo}
            max={legal.maxRaiseTo}
            step={BB / 2}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            aria-label="Raise amount"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-felt-400"
          />
          <span className="tabular w-16 shrink-0 text-right text-sm font-extrabold text-felt-100">
            {toBB(amount)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={() => setRaising(false)}>
            Back
          </Button>
          <Button
            size="lg"
            className="font-bold"
            onClick={() => onAct({ type: 'raise', amount })}
            disabled={disabled}
          >
            {legal.canCheck ? 'Bet' : 'Raise to'} {toBB(amount)}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        variant="outline"
        size="lg"
        className="border-rose-500/40 font-bold hover:bg-rose-500/15"
        onClick={() => onAct({ type: 'fold' })}
        disabled={disabled}
      >
        Fold
      </Button>

      {legal.canCheck ? (
        <Button
          variant="secondary"
          size="lg"
          className="font-bold"
          onClick={() => onAct({ type: 'check' })}
          disabled={disabled}
        >
          Check
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="lg"
          className="flex-col gap-0 font-bold leading-tight"
          onClick={() => onAct({ type: 'call' })}
          disabled={disabled}
        >
          <span>Call {toBB(legal.callAmount)}</span>
          {legal.isAllInCall ? (
            <span className="text-[9px] font-semibold uppercase opacity-80">all in</span>
          ) : null}
        </Button>
      )}

      <Button
        size="lg"
        className="font-bold"
        onClick={() => setRaising(true)}
        disabled={disabled || !legal.canRaise}
      >
        {legal.canCheck ? 'Bet' : 'Raise'}
      </Button>
    </div>
  )
}
