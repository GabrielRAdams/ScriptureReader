import { CircleDot } from 'lucide-react'

import { PlayingCard } from '@/components/PlayingCard'
import { toBB } from '@/lib/cards'
import { ARCHETYPES } from '@/lib/simBots'
import { cn } from '@/lib/utils'

const ACTION_TONE = {
  Fold: 'bg-slate-700/80 text-slate-300',
  Check: 'bg-slate-600/80 text-slate-100',
  Call: 'bg-sky-600/80 text-sky-50',
  Bet: 'bg-emerald-600/85 text-emerald-50',
  Raise: 'bg-rose-600/85 text-rose-50',
}

/** One seat: name, archetype, stack, hole cards, and the chips they have out. */
export function SeatView({ player, isButton, isActor, revealed, won, className }) {
  const archetype = ARCHETYPES[player.archetype]
  const folded = player.folded

  return (
    <div className={cn('flex w-[86px] flex-col items-center gap-1 sm:w-[104px]', className)}>
      {/* Hole cards */}
      <div className={cn('flex gap-0.5 transition-opacity', folded && 'opacity-25')}>
        {player.isHero || revealed ? (
          player.hole.map((card, i) => (
            <PlayingCard key={card + i} card={card} size="sm" dimmed={folded} />
          ))
        ) : (
          <>
            <CardBack />
            <CardBack />
          </>
        )}
      </div>

      <div
        className={cn(
          'w-full rounded-lg border px-1.5 py-1 text-center transition-all',
          isActor
            ? 'border-felt-300 bg-felt-600/40 shadow-lg shadow-felt-500/20'
            : 'border-white/10 bg-black/50',
          won && 'border-amber-300 bg-amber-500/25',
          folded && 'opacity-45',
        )}
      >
        <div className="flex items-center justify-center gap-1">
          <span className="truncate text-[10px] font-bold leading-tight">{player.name}</span>
          {isButton ? (
            <span
              title="Dealer button"
              className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-white text-[7px] font-black text-slate-900"
            >
              D
            </span>
          ) : null}
        </div>
        <div className="tabular text-[11px] font-extrabold leading-tight text-felt-100">
          {toBB(player.stack)}
        </div>
        {!player.isHero && archetype ? (
          <div className="truncate text-[8px] uppercase tracking-wide text-muted-foreground">
            {archetype.name} · {archetype.hud}
          </div>
        ) : (
          <div className="text-[8px] uppercase tracking-wide text-felt-300">{player.position}</div>
        )}
      </div>

      {/* Chips committed this street, or the last action taken. */}
      <div className="flex h-4 items-center">
        {player.committed > 0 ? (
          <span className="tabular flex items-center gap-1 rounded-full bg-amber-500/25 px-1.5 py-0.5 text-[9px] font-bold text-amber-100">
            <CircleDot className="h-2.5 w-2.5" aria-hidden="true" />
            {toBB(player.committed)}
          </span>
        ) : player.lastAction ? (
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
              ACTION_TONE[player.lastAction] ?? 'bg-slate-700/80 text-slate-200',
            )}
          >
            {player.allIn ? 'All in' : player.lastAction}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div
      aria-hidden="true"
      className="h-[52px] w-[38px] rounded-[6px] border border-felt-300/20 bg-gradient-to-br from-felt-700 to-felt-900 shadow-md shadow-black/40"
    >
      <div className="m-1 h-[calc(100%-8px)] rounded-[3px] border border-felt-300/15" />
    </div>
  )
}
