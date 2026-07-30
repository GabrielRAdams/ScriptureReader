import { Coins, Layers3, Users } from 'lucide-react'

import { CardSlot, PlayingCard } from '@/components/PlayingCard'
import { cn } from '@/lib/utils'

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/25 px-2.5 py-1.5 ring-1 ring-white/5">
      <Icon className="h-3.5 w-3.5 text-felt-300" aria-hidden="true" />
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="tabular text-xs font-semibold text-foreground">{value}</div>
      </div>
    </div>
  )
}

/**
 * The centrepiece: board on the felt, hero's hole cards below it, pot and
 * player-count read-outs around the edge.
 */
export function TableFelt({ scenario }) {
  const { board, heroHand, street, potUSD, players, stackBB } = scenario
  const emptySlots = Math.max(0, (board.length === 0 ? 3 : Math.max(3, board.length)) - board.length)

  return (
    <section
      aria-label="Table"
      className="felt-surface relative overflow-hidden rounded-2xl border border-felt-700/50 p-4 shadow-xl shadow-black/40 sm:p-6"
    >
      {/* Felt rail glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 -top-24 h-40 rounded-full bg-felt-400/20 blur-3xl"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <Stat icon={Coins} label="Pot" value={potUSD} />
        <Stat icon={Users} label="In hand" value={`${players} players`} />
        <Stat icon={Layers3} label="Effective" value={`${stackBB} BB`} />
      </div>

      <div className="relative mt-5 flex flex-col items-center gap-5">
        <div className="w-full text-center">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-felt-200/70">
            {board.length === 0 ? 'Preflop — no board' : `${street} board`}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {board.map((card, i) => (
              <PlayingCard
                key={`${card}-${i}`}
                card={card}
                size="md"
                className="animate-card-in"
                style={{ animationDelay: `${i * 55}ms` }}
              />
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <CardSlot key={`slot-${i}`} size="md" className="rounded-[8px]" />
            ))}
          </div>
        </div>

        <div
          aria-hidden="true"
          className="h-px w-2/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />

        <div className="w-full text-center">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-felt-200/70">
            Your hand
          </div>
          <div className={cn('flex items-center justify-center gap-2')}>
            {heroHand.map((card, i) => (
              <PlayingCard
                key={`${card}-${i}`}
                card={card}
                size="lg"
                className="animate-card-in"
                style={{ animationDelay: `${140 + i * 70}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
